#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"
export PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"

gunzip -c "$BACKUP_FILE" | psql -U "${POSTGRES_USER:-postgres}" -h "${POSTGRES_HOST:-db}" "${POSTGRES_DB:-osiris}"

echo "Restore complete from: $BACKUP_FILE"
