# OSIRIS Database Migration & Rollback Procedure

**Version:** 1.0  
**Last Updated:** 2026-08-26  
**Owner:** OSIRIS Development / Operations Team  
**Status:** Active  

---

## 1. PURPOSE

This document defines the procedure for applying database schema changes using Drizzle migrations, including rollback procedures for failed deployments.

---

## 2. TOOLS

- **Drizzle Kit**: `pnpm drizzle-kit generate` / `pnpm drizzle-kit migrate`
- **Database**: PostgreSQL 15+
- **Backup**: `pg_dump` / `pg_restore`

---

## 3. PRE-MIGRATION CHECKLIST

- [ ] Review migration SQL for breaking changes
- [ ] Test migration on staging database
- [ ] Verify no downtime is required
- [ ] Create database backup
- [ ] Notify team of maintenance window (if needed)

---

## 4. MIGRATION PROCEDURE

### 4.1 Generate Migration

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate:pg

# Review generated SQL in drizzle/
```

### 4.2 Apply Migration

```bash
# Apply pending migrations
pnpm drizzle-kit migrate

# Verify migration applied
pnpm drizzle-kit studio  # Check schema in browser
```

### 4.3 Post-Migration Verification

- [ ] Run full test suite: `pnpm test`
- [ ] Verify application starts: `pnpm build && pnpm start`
- [ ] Check health endpoint: `curl http://localhost:3000/api/health`
- [ ] Monitor error logs for 15 minutes

---

## 5. ROLLBACK PROCEDURE

### 5.1 Immediate Rollback

```bash
# Restore from backup
pg_restore -U osiris_user -d osiris_backup -c backup.sql

# Or restore specific table
pg_restore -U osiris_user -d osiris -t users -c users_backup.sql
```

### 5.2 Application Rollback

```bash
# Revert to previous code version
git revert HEAD
pnpm install
pnpm build
pnpm start
```

---

## 6. EMERGENCY PROCEDURES

### 6.1 Migration Failure

1. Stop application immediately
2. Restore database from pre-migration backup
3. Revert code changes
4. Document failure in incident log
5. Fix migration and retry in staging

### 6.2 Data Corruption

1. Identify corrupted tables/rows
2. Restore from last known good backup
3. Apply any manual data fixes
4. Validate data integrity
5. Resume normal operations

---

## 7. BACKUP SCHEDULE

- **Automated daily backups**: 02:00 UTC
- **Pre-migration backups**: Before every schema change
- **Retention period**: 30 days
- **Storage**: Separate from application server

---

## 8. MONITORING

Monitor these metrics during/after migrations:
- Database connection pool utilization
- Query execution time
- Error rate in application logs
- Health check status
