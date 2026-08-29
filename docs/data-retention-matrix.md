# OSIRIS Data Retention Matrix

**Version:** 1.0  
**Last Updated:** 2026-08-26  
**Owner:** OSIRIS Development / Compliance Team  
**Status:** Active  

---

## 1. PURPOSE

This document defines the retention schedule for all data processed by OSIRIS. It reconciles:
- GDPR right to erasure (Article 17)
- AML/BSA 5-year retention requirements
- MiCA record-keeping obligations
- CARF reporting requirements
- Operational/security needs

**Principle:** Personal data is retained only as long as necessary; transaction records are retained for compliance minimums; all retention is documented and auditable.

---

## 2. DATA CLASSIFICATION

| Category | Description | Contains Personal Data? | Contains Transaction Data? | Retention Driver |
|----------|-------------|------------------------|---------------------------|------------------|
| **User Profile** | Telegram ID, username, display name, preferences | Yes | No | GDPR / Operational |
| **Session Tokens** | httpOnly session cookies, refresh tokens | Yes | No | Security / GDPR |
| **Authentication Logs** | Login timestamps, IP addresses, device info | Yes | No | Security / GDPR |
| **Trade Execution Logs** | Copy-trade signals, transactions, PnL | No | Yes | AML (5 years) |
| **Webhook Payloads** | Helius/PumpPortal event payloads | Potentially | Yes | Security / AML |
| **Audit Logs** | Security events, admin actions | Yes | Potentially | Security / GDPR |
| **Metrics/Health** | System metrics, uptime, latency | No | No | Operational |
| **Backups** | Database dumps, file backups | Potentially | Potentially | Operational / AML |
| **Error Logs** | Application errors, stack traces | Potentially | No | Operational / Security |

---

## 3. RETENTION SCHEDULE

### 3.1 Personal Data (GDPR-governed)

| Data Type | Retention Period | Trigger for Deletion | Rationale |
|-----------|------------------|----------------------|-----------|
| **User Profile** | Active account + 30 days | Account deletion request | GDPR Article 17; operational necessity |
| **Session Tokens** | 24 hours (idle) / 7 days (active) | Session expiry / logout | Security best practice |
| **Authentication Logs** | 90 days | Automatic purge | Security monitoring; GDPR minimization |
| **Audit Logs (personal)** | 90 days | Automatic purge | Security monitoring; GDPR minimization |
| **IP Addresses** | 90 days | Automatic purge | Security monitoring; GDPR minimization |

### 3.2 Transaction Data (AML-governed)

| Data Type | Retention Period | Trigger for Deletion | Rationale |
|-----------|------------------|----------------------|-----------|
| **Trade Execution Logs** | 5 years | Automatic purge at 5 years | AML/BSA 5-year minimum; MiCA record-keeping |
| **Webhook Payloads (transaction)** | 5 years | Automatic purge at 5 years | AML/BSA 5-year minimum |
| **Fee Records** | 5 years | Automatic purge at 5 years | Tax / AML obligations |
| **Subscription Records** | 5 years | Automatic purge at 5 years | Tax / AML obligations |

### 3.3 Operational Data

| Data Type | Retention Period | Trigger for Deletion | Rationale |
|-----------|------------------|----------------------|-----------|
| **Metrics/Health** | 30 days | Automatic purge | Operational monitoring |
| **Error Logs (non-personal)** | 90 days | Automatic purge | Debugging / security |
| **Backups** | 30 days | Automatic purge | Disaster recovery |
| **CI/CD Logs** | 90 days | Automatic purge | Audit trail |

### 3.4 Legal/Compliance Data

| Data Type | Retention Period | Trigger for Deletion | Rationale |
|-----------|------------------|----------------------|-----------|
| **Terms of Service Acceptance** | 5 years | Automatic purge at 5 years | Legal / dispute resolution |
| **Risk Disclosure Acceptance** | 5 years | Automatic purge at 5 years | Legal / dispute resolution |
| **Incident Reports** | 7 years | Automatic purge at 7 years | Legal / regulatory |
| **Regulatory Correspondence** | 7 years | Automatic purge at 7 years | Legal / regulatory |

---

## 4. GDPR vs AML RECONCILIATION

### 4.1 The Tension
- **GDPR Article 17:** Right to erasure ("right to be forgotten")
- **AML/BSA:** 5-year retention requirement for transaction records
- **MiCA:** Record-keeping obligations for crypto-asset services

### 4.2 Resolution Strategy

**Segregation Principle:**
1. **Personal data** (user profiles, session tokens, auth logs) → Retain for operational/security needs; delete on user request
2. **Transaction data** (trade logs, webhook payloads, fee records) → Retain 5 years minimum; anonymize personal identifiers
3. **Mixed data** (webhook payloads with user context) → Anonymize personal fields; retain transaction portion

**Implementation:**
```
User requests erasure:
1. Delete user profile (telegram ID, username, preferences)
2. Anonymize auth logs (replace IP with "REDACTED")
3. Retain trade execution logs (anonymized) for 5 years
4. Retain fee records (anonymized) for 5 years
5. Confirm erasure completion to user
```

---

## 5. TECHNICAL IMPLEMENTATION

### 5.1 Automated Purge Jobs

```typescript
// Daily purge job (run via cron)
async function purgeExpiredData() {
  const now = Date.now();
  
  // Purge auth logs older than 90 days
  await redis.zremrangebyscore('auth:logs', '-inf', now - (90 * 24 * 60 * 60 * 1000));
  
  // Purge metrics older than 30 days
  await redis.zremrangebyscore('metrics', '-inf', now - (30 * 24 * 60 * 60 * 1000));
  
  // Purge expired sessions
  await redis.zremrangebyscore('sessions', '-inf', now - (7 * 24 * 60 * 60 * 1000));
  
  // Anonymize trade logs older than 5 years (instead of deleting)
  await anonymizeOldTradeLogs(5 * 365 * 24 * 60 * 60 * 1000);
}
```

### 5.2 GDPR Erasure Endpoint

```typescript
// POST /api/user/erasure
async function handleErasureRequest(userId: string) {
  // 1. Delete user profile
  await db.users.delete({ where: { id: userId } });
  
  // 2. Anonymize auth logs
  await db.authLogs.updateMany(
    { where: { userId } },
    { data: { ipAddress: 'REDACTED', userAgent: 'REDACTED' } }
  );
  
  // 3. Anonymize trade logs (retain for AML)
  await db.tradeLogs.updateMany(
    { where: { userId } },
    { data: { telegramId: 'ANONYMIZED', username: 'ANONYMIZED' } }
  );
  
  // 4. Delete session tokens
  await redis.del(`session:${userId}`);
  
  // 5. Log erasure for audit
  await auditLog.record({
    action: 'GDPR_ERASURE',
    userId,
    timestamp: new Date(),
    details: 'User data erased per GDPR Article 17 request'
  });
  
  return { success: true, message: 'Data erasure complete' };
}
```

### 5.3 Database Migration Strategy

```sql
-- Add retention policy metadata
ALTER TABLE trade_logs ADD COLUMN retention_until TIMESTAMP;
ALTER TABLE auth_logs ADD COLUMN retention_until TIMESTAMP;
ALTER TABLE user_profiles ADD COLUMN deletion_requested_at TIMESTAMP;

-- Create purge function
CREATE OR REPLACE FUNCTION purge_expired_records()
RETURNS void AS $$
BEGIN
  -- Anonymize trade logs past retention
  UPDATE trade_logs 
  SET telegram_id = 'ANONYMIZED', username = 'ANONYMIZED'
  WHERE retention_until < NOW() AND telegram_id != 'ANONYMIZED';
  
  -- Delete auth logs past retention
  DELETE FROM auth_logs
  WHERE retention_until < NOW();
  
  -- Delete user profiles marked for deletion
  DELETE FROM user_profiles
  WHERE deletion_requested_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

---

## 6. DATA INVENTORY

### 6.1 Data Storage Locations

| Data Type | Primary Store | Backup | Encryption at Rest | Access Control |
|-----------|--------------|--------|-------------------|----------------|
| User Profile | PostgreSQL | Encrypted S3 | Yes | Role-based |
| Session Tokens | Redis | Redis AOF | Yes | Environment variable |
| Auth Logs | PostgreSQL | Encrypted S3 | Yes | Role-based |
| Trade Execution Logs | PostgreSQL | Encrypted S3 | Yes | Role-based |
| Webhook Payloads | PostgreSQL | Encrypted S3 | Yes | Role-based |
| Audit Logs | PostgreSQL | Encrypted S3 | Yes | Admin-only |
| Metrics/Health | Prometheus | N/A | No | Internal network |
| Error Logs | Loki/Elasticsearch | N/A | No | Internal network |

### 6.2 Third-Party Data Processors

| Processor | Data Type | Location | GDPR DPA | Purpose |
|-----------|-----------|----------|----------|---------|
| **Telegram** | User ID, username, initData | EU/US | Yes | Authentication |
| **Helius** | Wallet addresses, transaction hashes | US | Yes | RPC/webhook |
| **PostgreSQL (hosted)** | All database records | EU/US | Yes | Primary database |
| **Redis** | Session tokens, cache | EU/US | Yes | Session/cache |
| **Vercel** | Application logs | US | Yes | Hosting/CI |
| **ntfy.sh** | Alert notifications | EU | Yes | Alerting |

---

## 7. USER RIGHTS IMPLEMENTATION

### 7.1 Right to Access (Article 15)
- **Implementation:** `GET /api/user/data-export`
- **Format:** JSON download of all personal data
- **SLA:** 30 days

### 7.2 Right to Rectification (Article 16)
- **Implementation:** `PATCH /api/user/profile`
- **SLA:** Immediate

### 7.3 Right to Erasure (Article 17)
- **Implementation:** `POST /api/user/erasure`
- **SLA:** 30 days
- **Exceptions:** AML retention (transaction records anonymized, not deleted)

### 7.4 Right to Portability (Article 20)
- **Implementation:** `GET /api/user/data-export` (JSON format)
- **SLA:** 30 days

### 7.5 Right to Object (Article 21)
- **Implementation:** User can disable data processing via settings
- **SLA:** Immediate

---

## 8. BREACH NOTIFICATION PROCEDURE

### 8.1 Assessment Timeline
- **Immediate (0-2 hours):** Assess scope and impact
- **72 hours:** Notify supervisory authority (GDPR Article 33)
- **Without undue delay:** Notify affected data subjects (GDPR Article 34)

### 8.2 Notification Thresholds
- **Always notify:** Unauthorized access to personal data
- **Notify if high risk:** Financial data, authentication credentials, health data
- **Document decision:** If not notifying, document rationale

---

## 9. AUDIT & COMPLIANCE

### 9.1 Annual Review
- Review retention periods against regulatory changes
- Audit purge job execution logs
- Verify GDPR erasure requests processed
- Review third-party processor agreements

### 9.2 Metrics
- Number of GDPR erasure requests
- Average processing time for erasure requests
- Data volume purged monthly
- Compliance incidents (missed purges, over-retention)

---

## 10. FREE RESOURCES

| Resource | Type | Use Case |
|----------|------|----------|
| **PolicifyAI** | Legal doc generator | Privacy policy generator with GDPR/MiCA awareness |
| **termly.io** | Legal doc generator | Privacy policy and terms templates |
| **termsfeed.com** | Legal doc generator | Free privacy policy generator |
| **freeprivacypolicy.com** | Legal doc generator | Free privacy policy generator |

---

## 11. CHANGE LOG

| Date | Version | Change |
|------|---------|--------|
| 2026-08-26 | 1.0 | Initial creation; reconciles GDPR erasure with AML 5-year retention |

---

*This matrix is maintained by the OSIRIS compliance team. Review and update quarterly or upon regulatory change.*
