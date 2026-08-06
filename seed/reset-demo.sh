#!/usr/bin/env bash
# 시연 DB 초기화 — 업무 데이터를 비우고 demo-snapshot.sql을 재적재한다.
#
#   DEMO_DB_URL='postgresql://...' ./seed/reset-demo.sh [-y]
#
# DEMO_DB_URL은 Railway Postgres의 DATABASE_PUBLIC_URL.
#
# users·lookup 6종은 보존 — 시연 계정과 Flyway seed가 거기 있고,
# 스냅샷은 buildings·units 데이터만
set -euo pipefail

SNAPSHOT="$(cd "$(dirname "$0")" && pwd)/demo-snapshot.sql"
: "${DEMO_DB_URL:?DEMO_DB_URL이 필요하다 (Railway Postgres의 DATABASE_PUBLIC_URL)}"
[ -f "$SNAPSHOT" ] || {
  echo "스냅샷이 없다: $SNAPSHOT" >&2
  exit 1
}

if command -v psql >/dev/null 2>&1; then
  psql_run() { psql "$DEMO_DB_URL" "$@"; }
else
  psql_run() { docker exec -i "${PG_CONTAINER:-backend-postgres-1}" psql "$DEMO_DB_URL" "$@"; }
fi

if [ "${1:-}" != "-y" ]; then
  read -r -p "buildings·units·visits를 비우고 스냅샷으로 되돌린다. 계속? [y/N] " answer
  [ "$answer" = "y" ] || exit 1
fi

# visits → units → buildings 순의 FK를 CASCADE로 한 번에 끊는다.
psql_run -v ON_ERROR_STOP=1 -q -c \
  "TRUNCATE replacement_item_flags, replacement_items, visits, units, buildings CASCADE;"

# 스냅샷은 끝에 setval 2줄을 포함한다 — 시퀀스도 함께 제자리로 돌아온다.
psql_run -v ON_ERROR_STOP=1 -q --single-transaction -f - <"$SNAPSHOT"

psql_run -Atc "
select 'buildings='||count(*) from buildings
union all select 'units='||count(*) from units
union all select 'visits='||count(*) from visits;"
