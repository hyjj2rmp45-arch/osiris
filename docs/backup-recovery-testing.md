# OSIRIS Backup & Recovery Testing Procedure

**Version:** 1.0  
**Last Updated:** 2026-08-26  
**Owner:** OSIRIS Development / Operations Team  
**Status:** Active  

---

## 1. PURPOSE

This document defines the procedure for testing database backup and recovery procedures to ensure business continuity and data integrity.

---

## 2. SCOPE

- PostgreSQL database backups
- Application state recovery
- Session data recovery
- Configuration restoration

---

## 3. BACKUP TYPES

### 3.1 Full Database Backup
```bash
pg_dump -U osiris_user -d osiris -F c -f backup.dump
```

### 3.2 Schema-Only Backup
```bash
pg_dump -U osiris_user -d osiris -s -f schema.sql
```

### 3.3 Data-Only Backup
```bash
pg_dump -U osiris_user -d osiris -a -f data.sql
```

### 3.4 Configuration Backup
```bash
# Backup .env files
cp .env .env.backup
cp .env.example .env.example.backup

# Backup application config
tar -czf osiris-config.tar.gz drizzle/ src/lib/db/ src/lib/config.ts
```

---

## 4. RECOVERY PROCEDURES

### 4.1 Full Recovery
```bash
# Stop application
pnpm stop

# Restore database
pg_restore -U osiris_user -d osiris_restore -c backup.dump

# Verify data
psql -U osiris_user -d osiris_restore -c "SELECT COUNT(*) FROM users;"

# Swap databases
pg_ctl stop
# Update connection string to point to osiris_restore
# Start application
pnpm start
```

### 4.2 Partial Recovery
```bash
# Restore specific table
pg_restore -U osiris_user -d osiris -t users -c users_backup.dump

# Verify
psql -U osiris_user -d osiris -c "SELECT COUNT(*) FROM users;"
```

---

## 5. TESTING SCHEDULE

| Test Type | Frequency | Owner | Last Tested |
|-----------|-----------|-------|-------------|
| Full backup/restore | Monthly | Dev Team | TBD |
| Partial table restore | Quarterly | Dev Team | TBD |
| Point-in-time recovery | Quarterly | Dev Team | TBD |
| Backup integrity check | Weekly | CI/CD | TBD |

---

## 6. TEST CHECKLIST

### 6.1 Pre-Test
- [ ] Notify team of testing window
- [ ] Create fresh backup before test
- [ ] Document current database state
- [ ] Ensure rollback plan is ready

### 6.2 During Test
- [ ] Restore backup to staging database
- [ ] Verify all tables restored correctly
- [ ] Check data integrity (row counts, checksums)
- [ ] Test application connectivity
- [ ] Verify health checks pass
- [ ] Run smoke tests

### 6.3 Post-Test
- [ ] Document test results
- [ ] Update this runbook with issues found
- [ ] Clean up test databases
- [ ] Notify team of completion

---

## 7. AUTOMATED TESTING

Add to CI/CD pipeline:
```yaml
- name: Backup Integrity Test
  run: |
    pg_dump -U $POSTGRES_USER -d $POSTGRES_DB -F c -f /tmp/test-backup.dump
    pg_restore -U $POSTGRES_USER -d ${POSTGRES_DB}_restore -c /tmp/test-backup.dump
    psql -U $POSTGRES_USER -d ${POSTGRES_DB}_restore -c "SELECT COUNT(*) FROM users;"
```

---

## 8. FAILURE SCENARIOS

| Scenario | Detection | Response |
|----------|-----------|----------|
| Backup file corrupted | Checksum mismatch | Regenerate backup, alert team |
| Restore fails | Error logs | Use previous backup, investigate |
| Data loss during restore | Row count mismatch | Stop, restore from earlier backup |
| Application won't start | Health check fails | Rollback code, verify DB schema |

---

## 9. CONTACTS

- **Primary**: OSIRIS Dev Team
- **Backup**: Database Admin
- **Emergency**: On-call engineer
