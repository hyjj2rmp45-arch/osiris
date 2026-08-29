# OSIRIS Incident Response Runbook

**Version:** 1.0  
**Last Updated:** 2026-08-26  
**Owner:** OSIRIS Development / Operations Team  
**Status:** Active  

---

## 1. PURPOSE

This runbook provides step-by-step procedures for responding to security incidents affecting OSIRIS. It is designed for rapid execution under stress.

**Target:** 0-15 minute kill chain from detection to containment.

---

## 2. INCIDENT CLASSIFICATION

| Severity | Definition | Response Time | Examples |
|----------|-----------|---------------|----------|
| **P1 - Critical** | Active exploit, data breach, fund loss | 0-15 minutes | Private key exposure, webhook hijack, unauthorized trades |
| **P2 - High** | Service compromise, potential data exposure | 15-30 minutes | Auth bypass, session hijack, dependency compromise |
| **P3 - Medium** | Service degradation, suspected vulnerability | 1-2 hours | Rate limit bypass, information disclosure |
| **P4 - Low** | Minor issue, no immediate risk | 24 hours | Misconfiguration, outdated dependencies |

---

## 3. INCIDENT RESPONSE TEAM

| Role | Name | Contact | Responsibility |
|------|------|---------|----------------|
| **Incident Commander** | TBD | Phone: 414-518-7407 | Overall coordination, decision authority |
| **Security Lead** | TBD | Phone: TBD | Technical investigation, containment |
| **Communications Lead** | TBD | Phone: TBD | User notifications, regulatory reporting |
| **Legal/Compliance** | TBD | Phone: TBD | Regulatory notification, liability assessment |

---

## 4. 0-15 MINUTE KILL CHAIN

### Minute 0-2: DETECT
**Triggers:**
- Automated alert: unusual trading volume, failed auth spikes, webhook anomalies
- User report: unauthorized trades, account takeover
- Monitoring: service degradation, error rate spike
- External: CVE disclosure affecting OSIRIS stack

**Actions:**
1. Acknowledge alert in monitoring dashboard
2. Classify severity (P1-P4)
3. Page Incident Commander if P1/P2
4. Open incident channel (Telegram/Slack/Discord)

### Minute 2-5: ASSESS
**Actions:**
1. Gather initial evidence:
   - Affected systems/services
   - Error logs, stack traces
   - User impact scope
   - Time of first detection
2. Determine incident type:
   - Webhook hijack/replay
   - Auth bypass/session hijack
   - Dependency compromise
   - Data breach
   - Service degradation
   - Other
3. Assess blast radius:
   - Number of affected users
   - Funds at risk
   - Data exposure

### Minute 5-10: CONTAIN
**Actions by Incident Type:**

#### Webhook Hijack/Replay
1. **Disable webhook endpoint** immediately
2. **Rotate webhook secret** (`WEBHOOK_SECRET`)
3. **Revoke all active sessions** (`redis-cli DEL osiris:sessions:*`)
4. **Enable killswitch** if copy-trading is active
5. **Block attacker IP** at firewall/Cloudflare level

#### Auth Bypass/Session Hijack
1. **Rotate session secret** (`SESSION_SECRET`)
2. **Revoke all active sessions**
3. **Force password reset** for affected users
4. **Disable affected auth method** (Telegram/password)
5. **Enable killswitch** if trading is active

#### Dependency Compromise
1. **Isolate affected service** (killswitch / disable copy-trading)
2. **Pin dependencies** to known-good versions
3. **Scan for persistence** (cron jobs, webhooks, backdoors)
4. **Rotate all secrets** (API keys, RPC keys, bot tokens)
5. **Review recent code changes** (git log, CI/CD logs)

#### Data Breach
1. **Isolate affected systems**
2. **Preserve evidence** (logs, database snapshots)
3. **Disable affected user accounts**
4. **Rotate exposed credentials**
5. **Prepare breach notification** (72h GDPR deadline)

#### Service Degradation
1. **Enable killswitch** to halt new trades
2. **Scale up resources** if capacity-related
3. **Rollback recent deployments** if deployment-related
4. **Switch to read-only mode** if data corruption suspected

### Minute 10-15: NOTIFY
**Internal:**
1. Notify all stakeholders via incident channel
2. Update status page (if public)
3. Brief legal/compliance team

**External (if required):**
1. **Regulators:** MiCA/GDPR 72h breach notification threshold
2. **Users:** Email/Telegram notification if data/funds at risk
3. **Partners:** Helius, RPC providers if third-party service affected

---

## 5. KILLSWITCH PROCEDURE

### 5.1 Killswitch Activation
**When to activate:**
- Unauthorized trades detected
- Webhook hijack confirmed
- Auth bypass confirmed
- Dependency compromise with fund risk

**How to activate:**
```bash
# Option 1: Environment variable (immediate)
export OSIRIS_KILLSWITCH=true

# Option 2: Redis flag (distributed)
redis-cli SET osiris:killswitch:active 1

# Option 3: API endpoint (if available)
curl -X POST https://osiris/api/admin/killswitch \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"active": true}'
```

### 5.2 Killswitch Effects
- **Copy-trading:** HALT immediately; no new trades submitted
- **Paper trading:** Continue (isolated)
- **Dashboard:** Remain accessible (read-only)
- **Telegram bot:** Respond with "service temporarily unavailable"
- **Webhooks:** Queue but do not process

### 5.3 Killswitch Deactivation
1. Verify threat is contained
2. Review all pending trades
3. Rotate all exposed credentials
4. Restore services in order: API → Webhooks → Copy-trading → Telegram
5. Monitor for 30 minutes post-restoration

---

## 6. EVIDENCE PRESERVATION

### 6.1 What to Preserve
- Application logs (structured JSON)
- Database snapshots (pre- and post-incident)
- Network logs (Cloudflare, RPC provider)
- Git commit history (last 30 days)
- CI/CD pipeline logs
- User session records
- Webhook payloads

### 6.2 Preservation Procedure
```bash
# Create incident evidence directory
mkdir -p /evidence/incident-$(date +%Y%m%d-%H%M%S)

# Export logs
cp -r /var/log/osiris/* /evidence/incident-*/
cp -r /logs/* /evidence/incident-*/

# Database snapshot
pg_dump -h localhost -U osiris osiris > /evidence/incident-*/db-snapshot.sql

# Git log
git log --since="30 days ago" --oneline > /evidence/incident-*/git-log.txt

# Redis snapshot
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb /evidence/incident-*/
```

### 6.3 Chain of Custody
- Document who accessed evidence
- Timestamp all access
- Store in write-once storage if legal action anticipated

---

## 7. REGULATORY NOTIFICATION THRESHOLDS

### 7.1 GDPR Breach Notification (72 hours)
**Trigger:** Personal data breach likely to result in risk to rights and freedoms.

**Notification to:**
- Supervisory Authority (within 72 hours of becoming aware)
- Data subjects (without undue delay if high risk)

**Required information:**
- Nature of breach
- Categories and approximate number of data subjects/records
- Likely consequences
- Measures taken/proposed
- Contact details of DPO

### 7.2 MiCA Incident Reporting
**Trigger:** Major operational disruptions, security breaches, fraud.

**Notification to:**
- Competent Authority (CA) without undue delay
- EBA if cross-border impact

### 7.3 CARF Reporting
**Trigger:** If OSIRIS is classified as RCASP.

**Reporting to:**
- Tax authorities of reportable jurisdictions
- Annual reporting by June 30

### 7.4 US State Breach Notification Laws
**Trigger:** If US user data affected.

**Notification to:**
- State Attorneys General (per state law)
- Affected individuals (per state timeline)

---

## 8. COMMUNICATION TEMPLATES

### 8.1 Internal Notification
```
INCIDENT ALERT - [P1/P2/P3/P4]

Type: [Webhook Hijack / Auth Bypass / Dependency Compromise / Data Breach / Other]
Severity: [P1-P4]
Time Detected: [YYYY-MM-DD HH:MM UTC]
Incident Commander: [Name]

Impact:
- Users affected: [X]
- Funds at risk: [Yes/No]
- Data exposure: [Yes/No]

Current Status: [Assessing / Containing / Recovering]

Next update: [Time]
```

### 8.2 User Notification (Data Breach)
```
Subject: Important Security Notice Regarding Your OSIRIS Account

Dear [User],

We discovered a security incident that may have affected your account. 

What happened: [Brief description]
What we found: [Data categories affected]
What we're doing: [Containment measures]
What you should do: [Password reset, enable 2FA, monitor accounts]

We take your security seriously. Contact us at [support email] with questions.

Sincerely,
OSIRIS Security Team
```

### 8.3 Regulatory Notification (GDPR)
```
To: [Supervisory Authority]
Subject: Personal Data Breach Notification - OSIRIS

1. Nature of breach: [Description]
2. Categories of data subjects: [Users / Admins / Other]
3. Approximate number: [X]
4. Likely consequences: [Identity theft / Financial loss / Other]
5. Measures taken: [Containment, remediation, notification]
6. Contact: [DPO name, email, phone]

Date: [YYYY-MM-DD]
```

---

## 9. POST-INCIDENT ACTIVITIES

### 9.1 Immediate (Within 24 hours)
- [ ] Verify threat is fully contained
- [ ] Restore services in controlled manner
- [ ] Monitor for residual indicators of compromise
- [ ] Document timeline of events

### 9.2 Short-term (Within 1 week)
- [ ] Complete incident report
- [ ] Conduct root cause analysis
- [ ] Update security controls to prevent recurrence
- [ ] Notify affected users (if not already done)
- [ ] Submit regulatory notifications (if required)

### 9.3 Long-term (Within 1 month)
- [ ] Present lessons learned to team
- [ ] Update incident response runbook
- [ ] Conduct tabletop exercise for similar scenario
- [ ] Review and update monitoring/alerting
- [ ] Publish transparency report (if appropriate)

---

## 10. INCIDENT RESPONSE PLAYBOOKS

### 10.1 Webhook Hijack Playbook
1. Disable webhook endpoint
2. Rotate `WEBHOOK_SECRET`
3. Revoke all sessions
4. Enable killswitch
5. Review webhook logs for malicious payloads
6. Notify Helius/RPC provider if provider compromise suspected
7. Implement timestamp + nonce validation (if not already in place)

### 10.2 Auth Bypass Playbook
1. Rotate `SESSION_SECRET` and all API keys
2. Revoke all active sessions
3. Force password reset for all users
4. Review auth code for bypass vectors
5. Deploy hotfix if code vulnerability
6. Enable killswitch if trading active
7. Notify users of forced logout

### 10.3 Dependency Compromise Playbook
1. Identify compromised package(s)
2. Isolate affected services
3. Pin dependencies to known-good versions
4. Scan for persistence mechanisms
5. Rotate all secrets
6. Review git history for malicious commits
7. Notify package maintainers and security community

### 10.4 Data Breach Playbook
1. Isolate affected systems
2. Preserve evidence
3. Disable affected accounts
4. Rotate exposed credentials
5. Assess data categories and number of records
6. Notify DPO and legal team
7. Prepare 72h GDPR notification
8. Notify affected users
9. Offer credit monitoring (if financial data exposed)

---

## 11. ESCALATION MATRIX

| Incident Type | Level 1 (Dev) | Level 2 (Security) | Level 3 (Incident Commander) | Level 4 (Legal/Regulator) |
|---------------|---------------|-------------------|------------------------------|---------------------------|
| Webhook hijack | Immediate | 5 min | 10 min | If funds lost |
| Auth bypass | Immediate | 5 min | 10 min | If data breach |
| Dependency compromise | Immediate | 5 min | 10 min | If widespread |
| Data breach | Immediate | 5 min | 10 min | 72h deadline |
| Service degradation | 15 min | 30 min | 1 hour | N/A |

---

## 12. CONTACTS

| Role | Name | Phone | Email | Telegram |
|------|------|-------|-------|----------|
| Incident Commander | TBD | 414-518-7407 | TBD | @zeroo5631 |
| Security Lead | TBD | TBD | TBD | TBD |
| Legal/Compliance | TBD | TBD | TBD | TBD |
| Helius Support | N/A | N/A | support@helius.dev | N/A |
| Cloudflare Support | N/A | N/A | support@cloudflare.com | N/A |

---

## 13. TOOLS & RESOURCES

| Tool | Purpose | Access |
|------|---------|--------|
| **Redis CLI** | Session revocation, killswitch | `redis-cli` |
| **Cloudflare Dashboard** | IP blocking, WAF rules | cloudflare.com |
| **Helius Dashboard** | Webhook management | helius.dev |
| **PostgreSQL** | Database inspection | `psql` |
| **Git** | Code history review | `git log` |
| **Vercel Dashboard** | Deployment rollback | vercel.com |
| **ntfy.sh** | Alerting (OSIRIS topic) | ntfy.sh/OSIRIS |
| **Telegram** | Team communication | @zeroo5631 |

---

## 14. TABLE-TOP EXERCISES

Conduct tabletop exercises quarterly for:
1. Webhook hijack and replay attack
2. Auth bypass and session takeover
3. Dependency compromise (supply chain attack)
4. Data breach notification
5. Regulatory inquiry

---

## 15. CHANGE LOG

| Date | Version | Change |
|------|---------|--------|
| 2026-08-26 | 1.0 | Initial creation; 0-15 min kill chain, playbooks, templates |

---

*This runbook is maintained by the OSIRIS operations team. Review and update quarterly.*
