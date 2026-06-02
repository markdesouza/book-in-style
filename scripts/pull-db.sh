#!/usr/bin/env bash
#
# pull-db.sh — copy all data from the production Turso database into the local
# SQLite file (local.db) that `npm run dev` uses. Handy for testing against a
# realistic snapshot of production data.
#
# Usage:
#   npm run db:pull                 # book-in-style -> local.db
#   bash scripts/pull-db.sh [target-file]
#
# Environment:
#   TURSO_DB_NAME   Turso database name to pull from (default: book-in-style)
#
# Auth: uses your logged-in Turso CLI session (`turso auth login`); no tokens
# are read from .env. The target file is OVERWRITTEN.
#
set -euo pipefail

DB_NAME="${TURSO_DB_NAME:-book-in-style}"
TARGET="${1:-local.db}"

command -v turso >/dev/null 2>&1 || {
  echo "error: turso CLI not found. Install with: brew install tursodatabase/tap/turso" >&2
  exit 1
}
command -v sqlite3 >/dev/null 2>&1 || {
  echo "error: sqlite3 not found (it ships with macOS)." >&2
  exit 1
}

if ! turso auth whoami >/dev/null 2>&1; then
  echo "error: not logged in to Turso. Run: turso auth login" >&2
  exit 1
fi

echo "Pulling Turso database '$DB_NAME' -> $TARGET ..."

DUMP="$(mktemp -t book-in-style-dump)"
trap 'rm -f "$DUMP" "$TARGET.tmp"' EXIT

# 1. Dump production (schema + data) to a temp SQL file.
turso db shell "$DB_NAME" ".dump" > "$DUMP"

# 2. Load it into a fresh database file, then atomically swap it in. Building a
#    new file (rather than loading into the existing one) avoids primary-key
#    collisions from the dump's INSERTs.
rm -f "$TARGET.tmp"
sqlite3 "$TARGET.tmp" < "$DUMP"
mv -f "$TARGET.tmp" "$TARGET"

echo "Done. '$TARGET' now mirrors production. Row counts:"
sqlite3 "$TARGET" "
  SELECT 'customers    ' || count(*) FROM customers
  UNION ALL SELECT 'appointments ' || count(*) FROM appointments
  UNION ALL SELECT 'news_events  ' || count(*) FROM news_events;
"
