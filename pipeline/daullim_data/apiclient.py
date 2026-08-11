"""외부 API 호출과 파일 캐시.

캐시 필수 — 건축HUB 일 10,000회·VWorld 일 40,000회 한도, 재호출 시 파이프라인 장기 정지 위험.
키 함정: data.go.kr 인증키 인코딩/디코딩 두 형태 배포, 인코딩 형태 재인코딩 시 403 → 항상 unquote 후 재인코딩.
"""

from __future__ import annotations

import http.client
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# 재시도 대상 — RemoteDisconnected는 URLError 아닌 HTTPException/ConnectionResetError 계열, URLError만 잡으면 장시간 수집 중 사망(실측)
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
    """`pipeline/.env` → `backend/.env` 순 키 탐색."""
    env: dict[str, str] = {}
    for path in reversed(ENV_CANDIDATES):  # 뒤부터 채우고 앞이 덮어씀(우선순위)
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
    """인증키 unquote 후 재인코딩 — 이중 인코딩 403 방지."""
    normalized = {
        k: (urllib.parse.unquote(str(v)) if k in KEY_PARAMS else str(v))
        for k, v in params.items()
    }
    return f"{base}?{urllib.parse.urlencode(normalized)}"


class JsonlCache:
    """append-only JSONL 캐시(키→레코드) — 중단돼도 기록 보존, 유한 API 한도 대응."""

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
                        continue  # 손상된 줄 스킵 — 재수집으로 복구 가능

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
    """호출 간격·재시도·캐시 통합 관리."""

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
