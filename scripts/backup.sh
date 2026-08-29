#!/usr/bin/env bash
set -euo pipefail

export PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/osiris_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

pg_dump -U "${POSTGRES_USER:-postgres}" -h "${POSTGRES_HOST:-db}" "${POSTGRES_DB:-osiris}" \
  | gzip > "$FILE"

echo "Backup complete: $FILE"

# Retention: keep last 7 days
find "$BACKUP_DIR" -name 'osiris_*.sql.gz' -type f -mtime +7 -delete
