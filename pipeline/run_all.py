#!/usr/bin/env python
"""전 구간 오케스트레이터 — 1~8단계를 순서대로 돌리고 로그를 한 파일에 남긴다.

    ./.venv/bin/python -u run_all.py                     # 전 구간
    ./.venv/bin/python -u run_all.py --skip-diagnostics  # 진단 3·5 생략
    ./.venv/bin/python -u run_all.py --from 6            # 6단계부터 (앞 산출물 재사용)

각 단계는 `run_*.py`의 `main()`을 **그대로 호출**한다(로직 이관 없음) — 단계 단독 재실행도 동일 결과.

종료코드는 단계의 것을 그대로 물려받는다:

* ``0`` 전 단계 통과
* ``1`` 어느 단계가 미달 — 게이트(2 성적표 · 4 DDL 검증 · 7 seed 검증)가 여기로 온다
* ``2`` 함정 감지(:class:`DataTrapError`)나 예상 못 한 예외

`run_ltr.py`(β 재학습)·`run_loro.py`(LORO 교차검증) 제외 — 둘 다 진단이라 산출물 불변,
LORO는 폴드당 `build_scored()` 3회 추가 실행으로 전 구간 시간만 늘어남. 필요 시 개별 실행.
"""

from __future__ import annotations

import argparse
import io
import sys
import time
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime
from importlib import import_module
from pathlib import Path
from typing import Callable, Iterable, Iterator, Sequence

from daullim_data.utils import DataTrapError

LOG_ROOT = Path(__file__).resolve().parent / "logs"

EXIT_OK = 0
EXIT_FAILED = 1
EXIT_TRAP = 2


@dataclass(frozen=True)
class Stage:
    """단계 하나. `module`의 `main()`이 실제 일을 한다."""

    no: int
    module: str
    title: str
    #: 미달이면 뒤 단계의 산출이 신뢰할 수 없어지는 관문
    gate: bool = False
    #: 건너뛰어도 산출물이 나오는 진단 단계
    diagnostic: bool = False

    @property
    def label(self) -> str:
        mark = " [게이트]" if self.gate else " [진단]" if self.diagnostic else ""
        return f"{self.no}. {self.module}.py — {self.title}{mark}"


#: README § 실행 순서와 같다. 앞 단계의 산출을 뒤가 쓴다.
STAGES: tuple[Stage, ...] = (
    Stage(1, "run_ingest", "원본 적재·검증"),
    Stage(2, "run_region_type", "도농 판별 + v0 성적표", gate=True),
    Stage(3, "run_kernel", "λ̂ 진단 (m 추정·동점 소멸·민감도)", diagnostic=True),
    Stage(4, "run_buildings", "건물 마스터 + DDL 검증", gate=True),
    Stage(5, "run_vulnerability", "②③ 진단 (G1 점검·β 민감도)", diagnostic=True),
    Stage(6, "run_scoring", "점수·순위 + 검증"),
    Stage(7, "run_seed", "seed 3종 산출 + 검증", gate=True),
    Stage(8, "load_seed", "DB 적재"),
)


def select(
    stages: Sequence[Stage] = STAGES,
    *,
    skip_diagnostics: bool = False,
    start: int = 1,
) -> tuple[Stage, ...]:
    """돌릴 단계만 고른다. 순서는 건드리지 않는다."""
    return tuple(
        s
        for s in stages
        if s.no >= start and not (skip_diagnostics and s.diagnostic)
    )


@contextmanager
def _own_argv(module: str) -> Iterator[None]:
    """`sys.argv`를 단계 단독 실행처럼 격리.

    여러 `run_*.py`가 `main()` 안에서 argparse를 쓴다 — 격리 없으면 `run_all.py`의
    `--skip-diagnostics`를 하위 스크립트가 자기 인자로 오인해 SystemExit(2).
    """
    saved = sys.argv
    sys.argv = [f"{module}.py"]
    try:
        yield
    finally:
        sys.argv = saved


def call_main(stage: Stage) -> int:
    """단계 `main()` 호출 — 지연 import로 무거운 의존성(geopandas 등) 비용을 실행 단계에만 지불,
    `--from`으로 건너뛴 단계는 import조차 하지 않음.
    """
    module = import_module(stage.module)
    with _own_argv(stage.module):
        return int(module.main())


def run(
    stages: Iterable[Stage],
    *,
    call: Callable[[Stage], int] = call_main,
    now: Callable[[], float] = time.monotonic,
) -> int:
    """단계를 순서대로 돌리고 첫 실패에서 멈춘다."""
    stages = tuple(stages)
    started = now()
    done: list[tuple[Stage, float]] = []

    for stage in stages:
        print()
        print("━" * 72)
        print(f"▶ {stage.label}")
        print("━" * 72, flush=True)

        begin = now()
        try:
            code = call(stage)
        except DataTrapError as exc:
            print(f"\n[함정 감지 — 중단] {stage.module}\n{exc}", file=sys.stderr)
            _summary(done, failed=stage, elapsed=now() - started)
            return EXIT_TRAP
        except Exception as exc:  # noqa: BLE001 — 어느 단계에서 죽었는지 남기고 넘긴다
            print(f"\n[예상 못 한 오류 — 중단] {stage.module}: {exc!r}", file=sys.stderr)
            _summary(done, failed=stage, elapsed=now() - started)
            return EXIT_TRAP

        took = now() - begin
        if code != 0:
            reason = "게이트 미달" if stage.gate else "실패"
            print(f"\n✗ {stage.module} {reason} (종료코드 {code}) — 뒤 단계는 돌리지 않는다.")
            _summary(done, failed=stage, elapsed=now() - started)
            return EXIT_FAILED

        done.append((stage, took))
        print(f"\n✓ {stage.module} ({took:,.1f}초)", flush=True)

    _summary(done, failed=None, elapsed=now() - started)
    return EXIT_OK


def _summary(done: Sequence[tuple[Stage, float]], *, failed: Stage | None, elapsed: float) -> None:
    print()
    print("=" * 72)
    print("run_all 요약")
    print("=" * 72)
    for stage, took in done:
        print(f"  ✓ {stage.no}. {stage.module:<18} {took:>7,.1f}초")
    if failed is not None:
        print(f"  ✗ {failed.no}. {failed.module:<18} 중단")
    print(f"  총 {elapsed:,.1f}초")


class _Tee(io.TextIOBase):
    """콘솔·로그 파일 동시 출력.

    매 write마다 flush — 장시간 실행 중 진행을 실시간으로 보기 위함(README `-u` 요구와 동일 이유).
    """

    def __init__(self, *streams: io.TextIOBase) -> None:
        self._streams = streams

    def write(self, text: str) -> int:
        for stream in self._streams:
            stream.write(text)
            stream.flush()
        return len(text)

    def flush(self) -> None:
        for stream in self._streams:
            stream.flush()


def log_path(started: datetime, root: Path = LOG_ROOT) -> Path:
    return root / f"run-all-{started:%Y%m%d-%H%M%S}.log"


@contextmanager
def tee_to(path: Path) -> Iterator[None]:
    """stdout·stderr를 파일에도 남긴다. 단계들이 `print`만 쓰므로 이걸로 전부 잡힌다."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        saved_out, saved_err = sys.stdout, sys.stderr
        sys.stdout = _Tee(saved_out, fh)  # type: ignore[assignment]
        sys.stderr = _Tee(saved_err, fh)  # type: ignore[assignment]
        try:
            yield
        finally:
            sys.stdout, sys.stderr = saved_out, saved_err


def main() -> int:
    ap = argparse.ArgumentParser(description="파이프라인 1~8단계를 순서대로 실행한다.")
    ap.add_argument(
        "--skip-diagnostics",
        action="store_true",
        help="진단 단계(3 run_kernel · 5 run_vulnerability)를 건너뛴다",
    )
    ap.add_argument(
        "--from",
        dest="start",
        type=int,
        default=1,
        metavar="N",
        help="N단계부터 실행 (앞 단계 산출물을 그대로 쓴다)",
    )
    args = ap.parse_args()

    stages = select(skip_diagnostics=args.skip_diagnostics, start=args.start)
    if not stages:
        print(f"--from {args.start}: 돌릴 단계가 없다 (1~{STAGES[-1].no})", file=sys.stderr)
        return EXIT_FAILED

    started = datetime.now()
    path = log_path(started)
    with tee_to(path):
        print(f"다울림 파이프라인 — {started:%Y-%m-%d %H:%M:%S}")
        print(f"로그: {path}")
        print("단계: " + " → ".join(str(s.no) for s in stages))
        code = run(stages)
    print(f"\n로그를 남겼다: {path}")
    return code


if __name__ == "__main__":
    sys.exit(main())
