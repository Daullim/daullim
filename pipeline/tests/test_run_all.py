"""오케스트레이터 — 순서·중단·종료코드·로그를 잠근다.

실제 단계는 돌리지 않는다. `run()`이 단계 호출자를 주입받으므로 가짜 단계로 흐름만 본다 —
진짜 `main()`들은 각자의 테스트가 이미 덮고 있고, 여기서 검증할 것은 **오케스트레이션**이다.
"""

from __future__ import annotations

import sys
import types
from datetime import datetime

import pytest

from daullim_data.utils import DataTrapError
from run_all import (
    EXIT_FAILED,
    EXIT_OK,
    EXIT_TRAP,
    STAGES,
    Stage,
    call_main,
    log_path,
    run,
    select,
    tee_to,
)


def stage(no: int, *, gate: bool = False, diagnostic: bool = False) -> Stage:
    return Stage(no, f"run_{no}", f"단계 {no}", gate=gate, diagnostic=diagnostic)


# ── 단계 목록 ───────────────────────────────────────────────────────────
def test_단계는_1부터_8까지_빠짐없이_이어진다():
    """README § 실행 순서와 어긋나면 손으로 돌리던 것과 결과가 달라진다."""
    assert [s.no for s in STAGES] == [1, 2, 3, 4, 5, 6, 7, 8]


def test_게이트는_성적표_DDL_seed_셋이다():
    """미달이면 뒤 산출을 믿을 수 없는 관문. 여기가 늘어나면 의도한 변경인지 확인하라."""
    assert [s.module for s in STAGES if s.gate] == [
        "run_region_type",
        "run_buildings",
        "run_seed",
    ]


def test_진단은_건너뛸_수_있는_두_단계다():
    assert [s.module for s in STAGES if s.diagnostic] == ["run_kernel", "run_vulnerability"]


def test_ltr은_포함하지_않는다():
    """9단계는 재학습 시도이고 현재 미채택이라 산출물에 영향이 없다."""
    assert "run_ltr" not in {s.module for s in STAGES}


# ── 선택 ────────────────────────────────────────────────────────────────
def test_skip_diagnostics는_진단만_뺀다():
    picked = select(skip_diagnostics=True)

    assert [s.no for s in picked] == [1, 2, 4, 6, 7, 8]


def test_from은_앞_단계를_자른다():
    assert [s.no for s in select(start=6)] == [6, 7, 8]


def test_from과_skip은_함께_걸린다():
    assert [s.no for s in select(skip_diagnostics=True, start=4)] == [4, 6, 7, 8]


# ── 실행 흐름 ───────────────────────────────────────────────────────────
def test_전부_통과하면_0이고_순서대로_돈다():
    called: list[int] = []

    code = run([stage(1), stage(2), stage(3)], call=lambda s: called.append(s.no) or 0)

    assert code == EXIT_OK
    assert called == [1, 2, 3]


def test_게이트가_미달이면_거기서_멈추고_1이다():
    """뒤 단계를 돌리면 미달인 판별 위에 점수를 쌓는 꼴이 된다."""
    called: list[int] = []

    def call(s: Stage) -> int:
        called.append(s.no)
        return 1 if s.no == 2 else 0

    code = run([stage(1), stage(2, gate=True), stage(3)], call=call)

    assert code == EXIT_FAILED
    assert called == [1, 2]  # 3은 호출되지 않았다


def test_게이트가_아닌_단계의_실패도_중단시킨다():
    called: list[int] = []

    def call(s: Stage) -> int:
        called.append(s.no)
        return 1 if s.no == 1 else 0

    assert run([stage(1), stage(2)], call=call) == EXIT_FAILED
    assert called == [1]


def test_함정_감지는_2로_끝난다():
    """DataTrapError는 미달이 아니라 데이터가 규칙을 어긴 것이라 구분한다."""

    def call(s: Stage) -> int:
        raise DataTrapError("인코딩 함정")

    assert run([stage(1)], call=call) == EXIT_TRAP


def test_예상하지_못한_예외도_2로_끝난다():
    def call(s: Stage) -> int:
        raise RuntimeError("어딘가 터짐")

    assert run([stage(1)], call=call) == EXIT_TRAP


def test_요약에_통과한_단계와_중단된_단계가_남는다(capsys):
    def call(s: Stage) -> int:
        return 1 if s.no == 2 else 0

    run([stage(1), stage(2, gate=True)], call=call)

    out = capsys.readouterr().out
    assert "✓ 1. run_1" in out
    assert "✗ 2. run_2" in out
    assert "게이트 미달" in out


# ── 단계 호출 ───────────────────────────────────────────────────────────
def test_단계는_자기_argv만_본다(monkeypatch):
    """run_all에 준 옵션이 단계의 argparse로 새면 SystemExit(2)로 죽는다.

    여러 run_*.py가 main() 안에서 parse_args를 돌리므로 이 격리가 없으면
    `--skip-diagnostics` 하나로 1단계부터 터진다.
    """
    seen: list[list[str]] = []
    fake = types.ModuleType("run_fake")
    fake.main = lambda: seen.append(list(sys.argv)) or 0  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "run_fake", fake)
    monkeypatch.setattr(sys, "argv", ["run_all.py", "--skip-diagnostics"])

    code = call_main(Stage(1, "run_fake", "가짜"))

    assert code == EXIT_OK
    assert seen == [["run_fake.py"]]
    assert sys.argv == ["run_all.py", "--skip-diagnostics"]  # 원래대로 돌려놓는다


def test_단계가_죽어도_argv는_복원된다(monkeypatch):
    fake = types.ModuleType("run_boom")

    def boom() -> int:
        raise DataTrapError("터짐")

    fake.main = boom  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "run_boom", fake)
    monkeypatch.setattr(sys, "argv", ["run_all.py"])

    with pytest.raises(DataTrapError):
        call_main(Stage(1, "run_boom", "가짜"))

    assert sys.argv == ["run_all.py"]


# ── 로그 ────────────────────────────────────────────────────────────────
def test_로그_파일명은_타임스탬프다(tmp_path):
    path = log_path(datetime(2026, 8, 9, 4, 5, 6), root=tmp_path)

    assert path.name == "run-all-20260809-040506.log"


def test_로그는_콘솔과_파일_양쪽에_남는다(tmp_path, capsys):
    path = tmp_path / "nested" / "run.log"

    with tee_to(path):
        print("진행 중")
        print("오류", file=sys.stderr)

    captured = capsys.readouterr()
    assert "진행 중" in captured.out
    assert "오류" in captured.err
    # 표준출력·표준오류가 한 파일에 시간순으로 섞여 남는다 — 그래야 어디서 멈췄는지 보인다
    assert path.read_text(encoding="utf-8") == "진행 중\n오류\n"


def test_tee가_끝나면_원래_스트림으로_돌아온다(tmp_path):
    before_out, before_err = sys.stdout, sys.stderr

    with tee_to(tmp_path / "run.log"):
        pass

    assert (sys.stdout, sys.stderr) == (before_out, before_err)
