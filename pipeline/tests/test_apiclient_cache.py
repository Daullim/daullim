"""한도 초과 응답을 영구 캐시하지 않는다 — 무인 다일 수집의 조용한 데이터 손실 방지.

공공 API는 한도를 넘겨도 **HTTP 200**에 오류를 본문으로 실어 보낸다. 그대로 캐시하면
그 주소는 영원히 실패로 굳는다 — 이튿날 재개해도 캐시 히트라 API를 다시 부르지 않고,
`geocode()`는 '주소를 못 찾음'으로 읽어 건물을 버린다.
"""

from __future__ import annotations

import json

import pytest

from daullim_data.apiclient import ApiClient, JsonlCache
from daullim_data.buildings import _geocode_cacheable


class _FakeResponse:
    def __init__(self, payload):
        self._raw = json.dumps(payload).encode("utf-8")

    def read(self):
        return self._raw

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


@pytest.fixture
def client(tmp_path, monkeypatch):
    def make(payloads):
        seq = list(payloads)
        monkeypatch.setattr(
            "daullim_data.apiclient.urllib.request.urlopen",
            lambda url, timeout=None: _FakeResponse(seq.pop(0)),
        )
        return ApiClient(JsonlCache(tmp_path / "c.jsonl"), min_interval=0.0)

    return make


def _resp(status: str) -> dict:
    return {"response": {"status": status, "result": {"point": {"x": "127.0", "y": "37.0"}}}}


# ── 캐시 판정 ───────────────────────────────────────────────────────────
@pytest.mark.parametrize("status", ["OK", "NOT_FOUND"])
def test_확정_응답은_캐시한다(status):
    """NOT_FOUND는 '그 주소가 없다'는 확정 답이라 다시 물어도 같다."""
    assert _geocode_cacheable(_resp(status))


@pytest.mark.parametrize("status", ["ERROR", "UNKNOWN", ""])
def test_일시적_오류는_캐시하지_않는다(status):
    assert not _geocode_cacheable(_resp(status))


@pytest.mark.parametrize("payload", [{}, {"response": {}}, None, "문자열"])
def test_모양이_다른_응답도_캐시하지_않는다(payload):
    assert not _geocode_cacheable(payload)


# ── ApiClient 동작 ──────────────────────────────────────────────────────
def test_캐시_불가_응답은_다음_호출에서_다시_시도한다(client):
    """이 테스트가 이 방어의 존재 이유다 — 한도가 풀린 뒤 재수집이 되어야 한다."""
    c = client([_resp("ERROR"), _resp("OK")])

    first = c.get_json("http://x", {}, cache_key="k", cacheable=_geocode_cacheable)
    assert first["response"]["status"] == "ERROR"
    assert c.uncached == 1

    # 캐시에 없으므로 API를 다시 부른다
    second = c.get_json("http://x", {}, cache_key="k", cacheable=_geocode_cacheable)
    assert second["response"]["status"] == "OK"
    assert c.calls == 2


def test_캐시된_응답은_다시_부르지_않는다(client):
    c = client([_resp("OK")])
    c.get_json("http://x", {}, cache_key="k", cacheable=_geocode_cacheable)
    c.get_json("http://x", {}, cache_key="k", cacheable=_geocode_cacheable)
    assert c.calls == 1 and c.hits == 1


def test_NOT_FOUND도_캐시돼_재호출을_아낀다(client):
    """한도가 유한한 자원이라 '없는 주소'를 매번 다시 묻지 않는다."""
    c = client([_resp("NOT_FOUND")])
    c.get_json("http://x", {}, cache_key="k", cacheable=_geocode_cacheable)
    c.get_json("http://x", {}, cache_key="k", cacheable=_geocode_cacheable)
    assert c.calls == 1 and c.hits == 1 and c.uncached == 0


def test_cacheable을_안_주면_전부_캐시한다(client):
    """기존 호출부(표제부·전유부)는 인자를 주지 않는다 — 동작이 바뀌면 안 된다."""
    c = client([_resp("ERROR")])
    c.get_json("http://x", {}, cache_key="k")
    assert c.uncached == 0
    c.get_json("http://x", {}, cache_key="k")
    assert c.calls == 1 and c.hits == 1
