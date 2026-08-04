"""외부 API 호출과 파일 캐시.

**캐시는 선택이 아니라 필수다.** 건축HUB는 일 10,000회, VWorld는 일 40,000회 한도라
재실행마다 다시 부르면 파이프라인이 며칠 단위로 막힌다.

키 함정: data.go.kr 인증키는 '인코딩'과 '디코딩' 두 형태로 배포되고, 인코딩 형태(`%` 포함)를
그대로 재인코딩하면 **403**이 난다. 어느 형태를 붙여넣어도 동작하도록 항상 unquote 후 재인코딩한다.
"""

from __future__ import annotations

import http.client
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# 재시도 대상 — 공공 API는 간헐적으로 연결을 그냥 끊는다.
# `RemoteDisconnected`는 URLError가 아니라 HTTPException/ConnectionResetError 계열이라
# URLError만 잡으면 장시간 수집 중 통째로 죽는다(실측).
RETRYABLE = (
    urllib.error.URLError,
    http.client.HTTPException,
    OSError,  # ConnectionResetError·socket.timeout 포함
    TimeoutError,
    json.JSONDecodeError,
)

from .utils import DATA_ROOT, REPO_ROOT, DataTrapError

ENV_CANDIDATES = (REPO_ROOT / "pipeline" / ".env", REPO_ROOT / "backend" / ".env")
KEY_PARAMS = ("serviceKey", "key")


def load_env() -> dict[str, str]:
    """`pipeline/.env` → `backend/.env` 순으로 키를 찾는다."""
    env: dict[str, str] = {}
    for path in reversed(ENV_CANDIDATES):  # 뒤쪽이 먼저 채워지고 앞쪽이 덮어쓴다
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


def require_key(name: str) -> str:
    env = load_env()
    if not env.get(name):
        raise DataTrapError(
            f"{name}가 없다. {ENV_CANDIDATES[0]} 또는 {ENV_CANDIDATES[1]}에 넣어라."
        )
    return env[name]


def build_url(base: str, params: dict[str, str]) -> str:
    """인증키는 항상 unquote 후 재인코딩 — 이중 인코딩 403을 원천 차단한다."""
    normalized = {
        k: (urllib.parse.unquote(str(v)) if k in KEY_PARAMS else str(v))
        for k, v in params.items()
    }
    return f"{base}?{urllib.parse.urlencode(normalized)}"


class JsonlCache:
    """append-only JSONL 캐시. 키 → 레코드.

    중간에 죽어도 이미 받은 것은 남는다 — 한도가 유한한 자원을 다루는 기본 자세다.
    """

    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._data: dict[str, object] = {}
        if self.path.exists():
            with self.path.open(encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rec = json.loads(line)
                        self._data[rec["k"]] = rec["v"]
                    except (json.JSONDecodeError, KeyError):
                        continue  # 손상된 줄은 건너뛴다 — 다시 받으면 된다

    def __contains__(self, key: str) -> bool:
        return key in self._data

    def __len__(self) -> int:
        return len(self._data)

    def get(self, key: str, default=None):
        return self._data.get(key, default)

    def put(self, key: str, value) -> None:
        self._data[key] = value
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps({"k": key, "v": value}, ensure_ascii=False) + "\n")


class ApiClient:
    """호출 간격·재시도·캐시를 한곳에서 관리한다."""

    def __init__(self, cache: JsonlCache, *, min_interval: float = 0.05, retries: int = 5):
        self.cache = cache
        self.min_interval = min_interval
        self.retries = retries
        self._last = 0.0
        self.calls = 0
        self.hits = 0

    def get_json(self, base: str, params: dict[str, str], *, cache_key: str):
        if cache_key in self.cache:
            self.hits += 1
            return self.cache.get(cache_key)

        url = build_url(base, params)
        last_err: Exception | None = None
        for attempt in range(self.retries):
            gap = time.monotonic() - self._last
            if gap < self.min_interval:
                time.sleep(self.min_interval - gap)
            try:
                with urllib.request.urlopen(url, timeout=60) as resp:
                    payload = json.loads(resp.read().decode("utf-8"))
                self._last = time.monotonic()
                self.calls += 1
                self.cache.put(cache_key, payload)
                return payload
            except RETRYABLE as exc:
                last_err = exc
                self._last = time.monotonic()
                time.sleep(min(0.5 * (2**attempt), 20.0))  # 지수 백오프(상한 20초)
        raise DataTrapError(f"API 호출 실패({self.retries}회): {base}\n  {last_err}")


EAIS_CACHE = DATA_ROOT / "eais" / "titles.jsonl"
EXPOS_CACHE = DATA_ROOT / "eais" / "expos.jsonl"
GEOCODE_CACHE = DATA_ROOT / "geocode_cache" / "vworld.jsonl"
