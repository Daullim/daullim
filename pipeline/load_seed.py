#!/usr/bin/env python
"""seed → PostgreSQL 적재 (ADR-012 결정 12: COPY).

    ./.venv/bin/python -u load_seed.py [--container backend-postgres-1]

**쓰기 경계는 ADR-015를 따른다.**
  · `buildings` — 전 컬럼, `bld_key` 기준 **월 1회 전량 UPSERT** (TRUNCATE 금지:
    `units`·`visits` FK가 살아 있어야 한다)
  · `units` — **정적 4컬럼만**, `ON CONFLICT (building_id, unit_seq) DO NOTHING`
  · `units.status_cd`·`last_inspected_day`·`rx_baseline_day` — **절대 금지**(BE 전용 업무 상태)
  · `visits`·`replacement_items`·lookup 6종 — 금지

DB 드라이버 미사용 — 컨테이너 `psql` 직접 호출로 의존성 최소화(ADR-014).
"""

from __future__ import annotations

import argparse
import subprocess
import sys

from daullim_data.utils import SEED_ROOT

CONTAINER = "backend-postgres-1"
DB_USER, DB_NAME = "daullim", "daullim"

# `building_id`(bigserial)·`address_norm`(GENERATED)·`created_at`/`updated_at`는 DB가 채운다.
BUILDING_COLS = [
    "bld_key", "sido_cd", "sigungu_cd", "admin_dong_cd", "address", "lat", "lng",
    "house_type_cd", "floor_count", "unit_count", "use_apr_day",
    "install_day", "install_year", "detector_model", "grid_id", "region_type_cd",
    "lambda_i", "rr_i", "score", "risk_level_cd", "order_key",
    "is_explore", "is_estimated", "basis", "rx_code_cd", "score_version", "computed_at",
]
UPDATE_COLS = [c for c in BUILDING_COLS if c != "bld_key"]

SQL = """
\\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE stg_buildings (LIKE buildings INCLUDING DEFAULTS) ON COMMIT DROP;
ALTER TABLE stg_buildings DROP COLUMN building_id, DROP COLUMN address_norm;
\\copy stg_buildings ({bcols}) FROM '{bcsv}' WITH (FORMAT csv, HEADER true)

CREATE TEMP TABLE stg_units (
    bld_key varchar(64), unit_seq smallint, ho_nm varchar(20),
    flr_no smallint, ho_nm_source_cd varchar(20)
) ON COMMIT DROP;
\\copy stg_units FROM '{ucsv}' WITH (FORMAT csv, HEADER true)

-- buildings: 전량 UPSERT. TRUNCATE 금지 — units·visits FK가 살아 있어야 한다.
INSERT INTO buildings ({bcols})
SELECT {bcols} FROM stg_buildings
ON CONFLICT (bld_key) DO UPDATE SET
{updates},
    updated_at = now();

-- units: 정적 4컬럼만. DO NOTHING이라 월 1회 재실행이 업무 상태를 덮지 않는다.
INSERT INTO units (building_id, unit_seq, ho_nm, flr_no, ho_nm_source_cd)
SELECT b.building_id, s.unit_seq, s.ho_nm, s.flr_no, s.ho_nm_source_cd
FROM stg_units s JOIN buildings b USING (bld_key)
ON CONFLICT (building_id, unit_seq) DO NOTHING;

COMMIT;

SELECT 'buildings' AS t, count(*) AS n FROM buildings
UNION ALL SELECT 'units', count(*) FROM units
UNION ALL SELECT 'units(pending)', count(*) FROM units WHERE status_cd = 'pending';
"""


def build_sql(bcsv: str, ucsv: str) -> str:
    updates = ",\n".join(f"    {c} = EXCLUDED.{c}" for c in UPDATE_COLS)
    return SQL.format(bcols=", ".join(BUILDING_COLS), bcsv=bcsv, ucsv=ucsv, updates=updates)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--container", default=CONTAINER)
    args = ap.parse_args()

    bcsv, ucsv = SEED_ROOT / "buildings.csv", SEED_ROOT / "units.csv"
    for p in (bcsv, ucsv):
        if not p.exists():
            print(f"[중단] {p} 가 없다 — 먼저 run_seed.py 를 돌려라.", file=sys.stderr)
            return 2

    # CSV를 컨테이너로 복사한 뒤 psql \copy — 호스트에 psql이 없어도 된다.
    for src, dst in ((bcsv, "/tmp/buildings.csv"), (ucsv, "/tmp/units.csv")):
        subprocess.run(["docker", "cp", str(src), f"{args.container}:{dst}"], check=True)

    sql = build_sql("/tmp/buildings.csv", "/tmp/units.csv")
    proc = subprocess.run(
        ["docker", "exec", "-i", args.container, "psql", "-U", DB_USER, "-d", DB_NAME, "-v", "ON_ERROR_STOP=1"],
        input=sql, text=True, capture_output=True,
    )
    print(proc.stdout.strip())
    if proc.returncode != 0:
        print(proc.stderr.strip(), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
