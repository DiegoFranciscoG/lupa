#!/usr/bin/env bash
# LUPA pipeline runner. All transformation logic lives in SQL files under sql/;
# this script only applies them in order and checks that tests return zero rows.
#
# Usage: scripts/lupa.sh <command>
#   migrate        apply sql/migrations/V*.sql once each (checksums are verified)
#   load           load fresh years from data/parquet into the DuckLake lake (one snapshot)
#   build          run sql/models/01..05 (macros, staging, marts, signals, graph)
#   test           run sql/tests/quality/*.sql against the built database
#   export         write web/public/data (Parquet + JSON) and run sql/tests/published
#   fingerprint    print a hash of the published aggregates (reproducibility, T-09)
#   unit           run sql/tests/unit/*.sql on synthetic data in a throwaway lake
#   repro          T-09: rebuild from an older DuckLake snapshot and compare fingerprints
#   all            migrate + load + build + test + export
#
# Environment:
#   LUPA_HASH_SALT    required, 64 hex characters (masks natural persons' identifiers)
#   DUCKDB_BIN        DuckDB 2.0 CLI (default: duckdb)
#   LUPA_DB           working database (default: data/lupa.duckdb)
#   LUPA_LAKE         DuckLake catalog path (default: data/lake/catalog.ducklake)
#   LUPA_SNAPSHOT     optional DuckLake snapshot id: build from that version (read-only)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

DUCKDB="${DUCKDB_BIN:-duckdb}"
DB="${LUPA_DB:-data/lupa.duckdb}"
LAKE="${LUPA_LAKE:-data/lake/catalog.ducklake}"
LAKE_FILES="$(dirname "$LAKE")/files/"

fail() { echo "ERROR: $*" >&2; exit 1; }

check_salt() {
  : "${LUPA_HASH_SALT:?Define LUPA_HASH_SALT (64 hex characters). See .env.example}"
  [[ "$LUPA_HASH_SALT" =~ ^[0-9a-fA-F]{64}$ ]] || fail "LUPA_HASH_SALT must be exactly 64 hex characters"
}

prelude() {
  local attach_opts="DATA_PATH '$LAKE_FILES'"
  if [[ -n "${LUPA_SNAPSHOT:-}" ]]; then
    [[ "$LUPA_SNAPSHOT" =~ ^[0-9]+$ ]] || fail "LUPA_SNAPSHOT must be a number"
    attach_opts="$attach_opts, SNAPSHOT_VERSION $LUPA_SNAPSHOT, READ_ONLY"
  fi
  cat <<SQL
INSTALL ducklake; LOAD ducklake;
INSTALL duckpgq FROM community; LOAD duckpgq;
ATTACH IF NOT EXISTS 'ducklake:$LAKE' AS lake ($attach_opts);
SET VARIABLE lupa_salt = '$LUPA_HASH_SALT';
SQL
}

# Runs SQL files (in order) in one DuckDB session against $DB and prints their output.
run_sql() {
  { prelude; for f in "$@"; do cat "$f"; echo; done; } | "$DUCKDB" -no-agent -bail -csv -noheader "$DB"
}

migrate() {
  mkdir -p "$(dirname "$DB")" "$LAKE_FILES"
  "$DUCKDB" -no-agent -bail "$DB" -c "CREATE SCHEMA IF NOT EXISTS meta; CREATE TABLE IF NOT EXISTS meta.schema_version (version VARCHAR PRIMARY KEY, checksum VARCHAR NOT NULL, applied_at TIMESTAMP DEFAULT current_timestamp);"
  for f in sql/migrations/V*.sql; do
    local version sum applied
    version="$(basename "$f" .sql)"
    sum="$(sha256sum "$f" | cut -d' ' -f1)"
    applied="$("$DUCKDB" -no-agent -csv -noheader "$DB" -c "SELECT checksum FROM meta.schema_version WHERE version = '$version'")"
    if [[ -z "$applied" ]]; then
      echo "applying $version"
      { prelude; cat "$f"; echo "INSERT INTO meta.schema_version (version, checksum) VALUES ('$version', '$sum');"; } \
        | "$DUCKDB" -no-agent -bail "$DB" >/dev/null
    elif [[ "$applied" != "$sum" ]]; then
      fail "migration $version was modified after being applied (checksum mismatch)"
    fi
  done
}

# Each test file must print nothing. Any row is a failure and stops the pipeline (T-12).
run_tests() {
  local dir="$1" failed=0 out
  for f in "$dir"/*.sql; do
    out="$(run_sql "$f")" || { echo "FAIL $(basename "$f") (error)"; failed=1; continue; }
    if [[ -n "$out" ]]; then
      echo "FAIL $(basename "$f")"; echo "$out" | head -20 | sed 's/^/    /'; failed=1
    else
      echo "ok   $(basename "$f")"
    fi
  done
  return $failed
}

export_data() {
  rm -rf web/public/data/adjudicaciones web/public/data/items web/public/data/procesos
  mkdir -p web/public/data data/export
  run_sql sql/models/06_export.sql >/dev/null
  # List of partitioned files for the browser (DuckDB-Wasm cannot glob over HTTP).
  ( cd web/public/data && find adjudicaciones items procesos -name '*.parquet' | sort ) \
    | awk 'BEGIN{printf "["} {printf "%s\"%s\"", (NR>1?",":""), $0} END{print "]"}' > web/public/data/files.json
  run_tests sql/tests/published
}

fingerprint() {
  run_sql sql/models/07_fingerprint.sql
}

unit() {
  local tmp failed=0 f
  mkdir -p data; tmp="$(mktemp -d -p data unit.XXXXXX)"
  trap 'rm -rf "$tmp"' RETURN
  for f in sql/tests/unit/*.sql; do
    local name db lake
    name="$(basename "$f" .sql)"
    db="$tmp/$name.duckdb"; lake="$tmp/$name/catalog.ducklake"
    mkdir -p "$tmp/$name/files"
    # Part before "-- @assert" loads synthetic rows; models run; the rest must print nothing.
    awk '/^-- @assert/{exit} {print}' "$f" > "$tmp/$name.setup.sql"
    awk 'f{print} /^-- @assert/{f=1}' "$f" > "$tmp/$name.assert.sql"
    local out
    if ! out="$(LUPA_DB="$db" LUPA_LAKE="$lake" bash -c '
        source scripts/lupa.sh --lib
        run_sql sql/migrations/V*.sql "$1" sql/models/01_macros.sql sql/models/02_staging.sql \
                sql/models/03_marts.sql sql/models/04_signals.sql sql/models/05_graph.sql "$2"' _ \
        "$tmp/$name.setup.sql" "$tmp/$name.assert.sql" 2>&1)"; then
      echo "FAIL $name (error)"; echo "$out" | tail -5 | sed 's/^/    /'; failed=1
    elif [[ -n "$out" ]]; then
      echo "FAIL $name"; echo "$out" | head -20 | sed 's/^/    /'; failed=1
    else
      echo "ok   $name"
    fi
  done
  return $failed
}

# T-09: building from DuckLake snapshot N gives the same fingerprint even after the lake
# has received newer data.
repro() {
  local tmp setup extra
  mkdir -p data; tmp="$(mktemp -d -p data repro.XXXXXX)"
  trap 'rm -rf "$tmp"' RETURN
  setup="$tmp/setup.sql"; extra="$tmp/extra.sql"
  awk '/^-- @assert/{exit} {print}' sql/tests/unit/t03_senales_reproducibles.sql > "$setup"
  cat > "$extra" <<'SQL'
INSERT INTO lake.process VALUES ('late', 'r', '2026-01-05', 'EC-RUC-0960000001001-1', 'ENTIDAD E', NULL, NULL, 'complete',
  NULL, NULL, 'goods', NULL, NULL, NULL, NULL, NULL, 2026);
INSERT INTO lake.award VALUES ('late', 'a-late', '2026-01-06', 'active', 123456.0, 'USD', 2026);
SQL
  local models="sql/models/01_macros.sql sql/models/02_staging.sql sql/models/03_marts.sql sql/models/04_signals.sql sql/models/05_graph.sql"
  local snap fp_a fp_b fp_c
  mkdir -p "$tmp/lake/files"
  export LUPA_LAKE="$tmp/lake/catalog.ducklake"
  snap="$(LUPA_DB="$tmp/a.duckdb" bash -c "source scripts/lupa.sh --lib; run_sql sql/migrations/V*.sql $setup <(echo 'SELECT max(snapshot_id) FROM lake.snapshots();')" | tail -1)"
  fp_a="$(LUPA_DB="$tmp/a.duckdb" bash -c "source scripts/lupa.sh --lib; run_sql $models sql/models/07_fingerprint.sql" | tail -1)"
  fp_b="$(LUPA_DB="$tmp/a.duckdb" bash -c "source scripts/lupa.sh --lib; run_sql $extra $models sql/models/07_fingerprint.sql" | tail -1)"
  fp_c="$(LUPA_DB="$tmp/c.duckdb" LUPA_SNAPSHOT="$snap" bash -c "source scripts/lupa.sh --lib; run_sql $models sql/models/07_fingerprint.sql" | tail -1)"
  echo "snapshot $snap: fingerprint $fp_a; after new data: $fp_b; rebuilt from snapshot $snap: $fp_c"
  [[ -n "$fp_a" && "$fp_a" != "$fp_b" ]] || { echo "FAIL T-09: new data did not change the fingerprint"; return 1; }
  [[ "$fp_a" == "$fp_c" ]] || { echo "FAIL T-09: rebuilding from snapshot $snap gave a different fingerprint"; return 1; }
  echo "ok   T-09 reproducibility by snapshot"
}

[[ "${1:-}" == "--lib" ]] && return 0

check_salt
case "${1:-}" in
  migrate) migrate ;;
  load) run_sql sql/models/00_load_lake.sql >/dev/null ;;
  build) run_sql sql/models/01_macros.sql sql/models/02_staging.sql sql/models/03_marts.sql \
                 sql/models/04_signals.sql sql/models/05_graph.sql >/dev/null ;;
  test) run_tests sql/tests/quality ;;
  export) export_data ;;
  fingerprint) fingerprint ;;
  unit) unit ;;
  repro) repro ;;
  all)
    migrate
    run_sql sql/models/00_load_lake.sql >/dev/null
    "$0" build
    run_tests sql/tests/quality
    export_data
    ;;
  *) sed -n '2,24p' "$0"; exit 2 ;;
esac
