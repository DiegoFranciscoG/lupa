#!/usr/bin/env bash
# Full monthly run: download and flatten, load the lake, build, test and publish.
# A failed source year keeps its previous data (T-10); any failed test stops publication (T-12).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
: "${LUPA_HASH_SALT:?Define LUPA_HASH_SALT (64 hex characters)}"
YEARS="${LUPA_YEARS:-2015..2026}"

echo "== ingest ($YEARS)"
lupa-ingest run --years "$YEARS" --raw-dir data/raw --out-dir data/parquet

echo "== database"
scripts/lupa.sh all

echo "== feeds"
LUPA_FEEDS_IN=data/export/feeds.json LUPA_FEEDS_OUT="${LUPA_RSS_OUT:-out/rss}" node web/scripts/build-feeds.mjs
echo "== done"
