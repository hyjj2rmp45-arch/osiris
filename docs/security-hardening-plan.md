# OSIRIS Security Hardening Plan

**Version:** 1.0  
**Last Updated:** 2026-08-26  
**Owner:** OSIRIS Development Team  
**Status:** Active  

---

## 1. PURPOSE

This document is the single source of truth for the OSIRIS security hardening program. It maps every control to an owner, evidence requirement, and verification step. All security work must be traceable to this plan.

---

## 2. SCOPE

- Security hardening across supply chain, auth, webhooks, Telegram Mini App, Solana transactions, sessions, observability, and infrastructure
- Compliance readiness: MiCA, GDPR, DORA, CARF/OECD, SEC no-action, UK FCA, UAE VARA
- Legal/trust: Terms of Service, Privacy Policy, risk disclosures, incident response
- No new user-facing features; current pricing model preserved; referrals deferred

---

## 3. SEVERITY DEFINITIONS

| Severity | Meaning | Action |
|----------|---------|--------|
| **Must** | Critical security/compliance gap; must be addressed before production | Immediate |
| **Should** | High-value control; address within current sprint | Planned |
| **Nice** | Improvement or future-proofing; address when resources allow | Backlog |

---

## 4. MASTER CHECKLIST

### 4.1 DOCUMENTATION / PROCESS

| ID | Item | Severity | Effort | Owner | Evidence | Verification |
|----|------|----------|--------|-------|----------|--------------|
| 0.1 | Create/update `docs/security-hardening-plan.md` | Must | Small | Dev | This document exists | Review |
| 0.2 | Create `docs/compliance-roadmap.md` | Must | Medium | Dev/Compliance | Roadmap covers MiCA, DORA, GDPR, CARF, SEC, UK FCA, UAE VARA | Review |
| 0.3 | Create `docs/incident-response-runbook.md` | Must | Medium | Dev/Ops | Runbook with 0-15 min kill chain | Tabletop exercise |
| 0.4 | Create `docs/data-retention-matrix.md` | Must | Medium | Dev/Compliance | Matrix reconciles GDPR erasure with AML retention | Legal review |

### 4.2 SUPPLY CHAIN & KEY MANAGEMENT

| ID | Item | Severity | Effort | Owner | Evidence | Verification |
|----|------|----------|--------|-------|----------|--------------|
| 1.1 | Audit npm/Python deps for typosquatting/malware | Must | Small | Dev | `pnpm audit` output clean; no suspicious packages | CI report |
| 1.2 | Rotate all keys if suspicious package installed | Must | Small | Dev/Ops | Key rotation log; old keys revoked | Audit log |
| 1.3 | Enforce non-custodial key isolation | Must | Medium | Dev | Code review confirms OSIRIS never handles user private keys | Pen test |
| 1.4 | HSM/KMS-backed signer segregation | Should | Medium | Dev/Ops | Separate signers per strategy documented | Architecture review |
| 1.5 | Dependency vulnerability scanning in CI | Should | Small | Dev | CI runs `pnpm audit` / Dependabot / Snyk | CI pipeline |
| 1.6 | Secrets management hygiene | Must | Small | Dev | No secrets in `NEXT_PUBLIC_`; `.env` gitignored; startup validation | CI check |
| 1.7 | SBOM + artifact provenance tracking | Should | Small | Dev | SBOM generated; artifact hashes tracked | CI artifact |

### 4.3 FRAMEWORK & AUTH HARDENING

| ID | Item | Severity | Effort | Owner | Evidence | Verification |
|----|------|----------|--------|-------|----------|--------------|
| 2.1 | Upgrade Next.js to patched version | Must | Small | Dev | `package.json` shows Next.js 15.5.18+ or 16.2.6+ | `npm ls next` |
| 2.2 | Never rely on middleware alone for auth | Must | Medium | Dev | All `/api/*` handlers re-verify auth server-side | Code review |
| 2.3 | Add handler-level auth wrapper | Must | Medium | Dev | `withAuth()` wrapper used in all protected routes | Code review |
| 2.4 | Auth middleware coverage audit | Must | Medium | Dev | 100% of trade/auth/payment/webhook routes enforce auth | Audit report |
| 2.5 | Open redirect prevention | Must | Small | Dev | `returnTo` validated as relative URL only | Unit test |
| 2.6 | CSRF protection for cookie-authenticated routes | Should | Small | Dev | Origin header check or CSRF token on state-changing endpoints | Integration test |

### 4.4 WEBHOOK & EVENT SECURITY

| ID | Item | Severity | Effort | Owner | Evidence | Verification |
|----|------|----------|--------|-------|----------|--------------|
| 3.1 | Webhook timestamp + nonce validation + idempotency | Must | Small | Dev | 5-min timestamp window; unique nonce; Redis SET dedup | Unit test + integration test |
| 3.2 | Constant-time signature comparison | Must | Small | Dev | `crypto.timingSafeEqual` or `hmac.compare_digest` used everywhere | Code review |
| 3.3 | Strict fail-closed on webhook validation failure | Must | Small | Dev | Reject on missing/invalid signature, expired timestamp, reused nonce | Unit test |
| 3.4 | Redis-backed webhook idempotency store | Should | Small | Dev | Idempotency keys prevent duplicate processing | Integration test |

### 4.5 TELEGRAM MINI APP HARDENING

| ID | Item | Severity | Effort | Owner | Evidence | Verification |
|----|------|----------|--------|-------|----------|--------------|
| 4.1 | Register domain for cross-origin protection | Must | Small | Dev | BotFather `/setdomain` configured | Telegram bot settings |
| 4.2 | Server-side initData constant-time + replay checks | Must | Small | Dev | `auth_date` ≤1h; constant-time compare; replay rejection | Unit test |
| 4.3 | Never store auth tokens in Mini App localStorage without encryption | Must | Medium | Dev | httpOnly cookies or encrypted localStorage | Code review |

### 4.6 SOLANA TRANSACTION SAFETY

| ID | Item | Severity | Effort | Owner | Evidence | Verification |
|----|------|----------|--------|-------|----------|--------------|
| 5.1 | Pre-flight transaction simulation | Must | Small | Dev | `simulateTransaction` or `simulateBundle` before send | Integration test |
| 5.2 | Priority fee sanity bounds | Should | Small | Dev | Priority fee bounds validated against block median | Unit test |
| 5.3 | Blockhash/nonce freshness checks | Should | Small | Dev | Reject expired blockhash (>2 min) or reused nonce | Unit test |
| 5.4 | Jito bundle awareness / MEV protection strategy | Should | Medium | Dev | MEV protection strategy documented; Jito bundle tested | Architecture review |
| 5.5 | Session concurrent-limit enforcement | Must | Small | Dev | Max 3-5 concurrent sessions per user enforced | Unit test |
| 5.6 | Session rotation on privilege escalation | Must | Small | Dev | Session rotated after role/admin changes | Unit test |

### 4.7 SESSION & ACCESS CONTROL

| ID | Item | Severity | Effort | Owner | Evidence | Verification |
|----|------|----------|--------|-------|----------|--------------|
| 6.1 | CSP + cookie flags consistency | Should | Small | Dev | `secure`, `sameSite`, CSP headers production-complete | Security headers scan |
| 6.2 | Rate limiting fail-closed behavior | Should | Medium | Dev | Auth/route rate limits deny on Redis outage | Integration test |
| 6.3 | PII minimization in logs/responses | Should | Medium | Dev | No unnecessary PII in logs/responses | Code review |
| 6.4 | Encryption-at-rest review for sensitive DB fields | Nice | Medium | Dev | Sensitive fields encrypted or justified as plaintext | Architecture review |

### 4.8 OBSERVABILITY & INCIDENT READINESS

| ID | Item | Severity | Effort | Owner | Evidence | Verification |
|----|------|----------|--------|-------|----------|--------------|
| 7.1 | Secrets redaction in all logs | Must | Small | Dev | Structured logger redacts tokens/keys/secrets | Log review |
| 7.2 | Correlation IDs across request paths | Must | Small | Dev | Every request carries correlation ID from entry to exit | Log review |
| 7.3 | Metrics/health completeness | Should | Small | Dev | Health/metrics expose latency/error/uptime signals | Dashboard review |
| 7.4 | Alert fatigue controls | Should | Small | Dev/Ops | Recurring failures deduplicated; rate-limited alerts | Ops review |
| 7.5 | Incident runbook with killswitch procedure | Must | Small | Dev/Ops | Runbook documents halt trading, revoke sessions, rotate keys | Tabletop exercise |
| 7.6 | Log retention policy | Should | Small | Dev/Ops | Retention periods defined; compliant with regulations | Legal review |

### 4.9 INFRASTRUCTURE & DATA SAFETY

| ID | Item | Severity | Effort | Owner | Evidence | Verification |
|----|------|----------|--------|-------|----------|--------------|
| 8.1 | `.env.example` completeness + startup validation | Must | Small | Dev | All required vars listed; missing vars fail fast | Startup test |
| 8.2 | Database migration/rollback procedure | Should | Medium | Dev/Ops | Migrations reproducible; rollback steps documented | Drill |
| 8.3 | Backup/recovery testing | Must | Medium | Dev/Ops | Scripted backups; tested restore; retention/encryption | Drill |
| 8.4 | CI/CD security gates | Should | Medium | Dev | `pnpm audit`, dependency scanning, build/lint/typecheck in CI | CI pipeline |
| 8.5 | Build/lint/typecheck gates | Must | Small | Dev | CI enforces before deploy | CI pipeline |
| 8.6 | Process/restart policy | Should | Small | Dev/Ops | Restart policies defined; non-root execution confirmed | Ops review |

### 4.10 LEGAL, COMPLIANCE & TRUST

| ID | Item | Severity | Effort | Owner | Evidence | Verification |
|----|------|----------|--------|-------|----------|--------------|
| 9.1 | Terms of Service | Must | Medium | Legal/Dev | Legal-grade ToS published | Legal review |
| 9.2 | Privacy Policy | Must | Medium | Legal/Dev | GDPR-compliant privacy policy published | Legal review |
| 9.3 | Risk disclosures | Must | Small | Legal/Dev | Trading risk disclosures published | Legal review |
| 9.4 | MiCA readiness assessment | Must | Medium | Compliance | MiCA authorization/AML/KYC roadmap documented | Compliance review |
| 9.5 | GDPR/privacy-by-design review | Must | Medium | Compliance | Data minimization, consent, erasure, portability implemented | DPIA |
| 9.6 | AML/KYC policy documentation | Should | Medium | Compliance | Risk-based AML/KYC policy documented | Compliance review |
| 9.7 | CARF/OECD reporting readiness review | Nice | Medium | Compliance | "Control or sufficient influence" test documented | Compliance review |
| 9.8 | SOC 2 / ISO 27001 roadmap | Should | High | Compliance | 12-month roadmap to Type I | Roadmap review |
| 9.9 | Incident response plan | Must | Medium | Dev/Ops | Documented escalation paths, regulator notification thresholds | Tabletop exercise |
| 9.10 | Professional indemnity / E&O insurance review | Should | Medium | Legal/Finance | Coverage documented; gaps identified | Insurance review |
| 9.11 | Data retention matrix | Should | Medium | Dev/Compliance | Retention schedule reconciles GDPR erasure with AML obligations | Legal review |
| 9.12 | SEC no-action compliance checklist | Should | Medium | Compliance | 12 conditions documented; compliance status per condition | Legal review |
| 9.13 | UK FCA crypto regime readiness | Nice | Medium | Compliance | FCA perimeter assessment documented | Compliance review |
| 9.14 | UAE VARA compliance assessment | Nice | Medium | Compliance | VARA scope assessment documented | Compliance review |
| 9.15 | DORA ICT risk management framework documentation | Nice | Medium | Compliance | ICT risk management documented | Compliance review |
| 9.16 | Tax reporting user disclosure | Should | Small | Legal/Dev | User disclosure on taxable events published | Legal review |

### 4.11 MASTER PLAN GAPS (P4–P10)

| ID | Phase | Item | Severity | Effort | Owner | Evidence | Verification |
|----|-------|------|----------|--------|-------|----------|--------------|
| 10.1 | P4 | Paper trading isolation + simulation | Must | Medium | Dev | Paper mode never touches real keys/write path | Integration test |
| 10.2 | P5 | Tax lot accounting accuracy verification | Must | Medium | Dev | FIFO lot matching, partial sells, cost basis tracked | Unit test |
| 10.3 | P5 | PnL formula verification + test cases | Must | Medium | Dev | Realized/unrealized PnL, multi-wallet, fee deduction | Unit test |
| 10.4 | P5 | RugCheck integration completeness | Should | Medium | Dev | Risk score caching, trade blocking, UI report | Integration test |
| 10.5 | P5 | Rate limiting full implementation | Should | Medium | Dev | Per-action limits, Redis sliding window, fail-closed | Integration test |
| 10.6 | P6 | Paper/real separation enforcement | Must | Medium | Dev | Data leak prevention, mode-specific views | Integration test |
| 10.7 | P7 | Telegram bot commands + security hardening | Should | Medium | Dev | `/start`, `/help`, `/session`, `/revoke`, `/pnl` implemented | Integration test |
| 10.8 | P8 | Dashboard security gates verification | Must | Medium | Dev | CSP strict, no secrets in frontend, API auth on all routes | Security scan |
| 10.9 | P9 | Security audit + penetration test | Must | High | External | External pen test report; bug bounty setup | Audit report |
| 10.10 | P10 | Monitoring + alerting (Grafana/Prometheus) | Should | Medium | Dev/Ops | Uptime/latency/error-rate dashboards; alert routing | Ops review |
| 10.11 | P10 | Backup + disaster recovery testing | Must | Medium | Dev/Ops | Scripted backups, restore drills, retention, encryption | Drill |
| 10.12 | P10 | Performance optimization (<100ms latency) | Should | Medium | Dev | Hot-path profiling, connection pooling, cache tuning | Perf test |
| 10.13 | P10 | Compliance + documentation | Nice | Medium | Dev/Compliance | GDPR/MiCA docs, user/admin/dev docs, IR runbook | Review |

### 4.12 UI/UX POLISH

| ID | Item | Severity | Effort | Owner | Evidence | Verification |
|----|------|----------|--------|-------|----------|--------------|
| 11.1 | Astryx/token compliance sweep | Must | Medium | Frontend | No raw `<div>` layout, `style={{}}`, hardcoded colors | Code review |
| 11.2 | Mobile readability/touch targets | Should | Medium | Frontend | Dashboard usable on small screens without horizontal scroll | Manual test |
| 11.3 | Accessibility baseline | Should | Medium | Frontend | Color contrast, focus indicators, semantic headings | Accessibility scan |
| 11.4 | Real-time status clarity | Should | Small | Frontend | Status tokens/pills used consistently | Design review |
| 11.5 | Error/empty/loading states audit | Should | Small | Frontend | Standardized fallback UI | Design review |
| 11.6 | Session/auth state visibility | Nice | Small | Frontend | Authenticated state and session expiry visible | Design review |

### 4.13 TEST/CODE QUALITY GAPS

| ID | Item | Severity | Effort | Owner | Evidence | Verification |
|----|------|----------|--------|-------|----------|--------------|
| 12.1 | Fix remaining failing route tests | Must | Small | Dev | All tests passing | CI pipeline |
| 12.2 | Integration tests for auth/trade pipeline | Should | Medium | Dev | E2E coverage for Telegram auth → session → copy-trade | CI pipeline |
| 12.3 | Load tests for WebSocket/SSE | Should | Medium | Dev | 1000+ concurrent connections tested | Load test report |
| 12.4 | Fuzz tests for webhook parsers | Nice | Small | Dev | Malformed payload resilience tested | Fuzz test report |
| 12.5 | Resolve remaining TODO comments | Small | Small | Dev | No remaining TODO/FIXME/XXX in production code | Code review |

---

## 5. FREE RESOURCES

### 5.1 SECURITY SCANNING & AUDIT

| Resource | Type | Use Case | URL |
|----------|------|----------|-----|
| **auditor-skill** | Open-source AI security audit skill | 1,346 verification items across 20 domains; TypeScript/Next.js/React/Rust/Solana | GitHub |
| **OWASP ZAP** | DAST scanner | API/web app security testing; OpenAPI import; headless CI | zaproxy.org |
| **Nuclei** | Vulnerability scanner | Template-based scanning; Telegram token exposure template | github.com/projectdiscovery/nuclei |
| **Semgrep** | SAST scanner | Free for ≤10 contributors; 1,000+ community rules | semgrep.dev |
| **OSV-Scanner** | Dependency scanner | Google's open-source vulnerability scanner | github.com/google/osv-scanner |
| **Vercelsior** | Next.js/Vercel security scanner | 130+ checks; middleware bypass CVEs; source maps; security headers | GitHub |
| **Counterscarp** | Smart contract audit CLI | Free community tier; Solana support; 21+ analyzers; SARIF export | counterscarp.io |

### 5.2 DEPENDENCY & SUPPLY CHAIN

| Resource | Type | Use Case | URL |
|----------|------|----------|-----|
| **pnpm audit** | Built-in scanner | npm dependency vulnerability scanning | pnpm.io |
| **Dependabot** | GitHub native | Automated dependency updates | github.com/features/security |
| **Snyk free tier** | Cloud scanner | Open-source dependency scanning | snyk.io |
| **Socket.dev** | Supply-chain scanner | Detect malicious packages | socket.dev |
| **ScanCode** | SCA/license scanner | Open-source license compliance | github.com/aboutcode-org/scancode-toolkit |

### 5.3 TELEGRAM MINI APP SECURITY

| Resource | Type | Use Case | URL |
|----------|------|----------|-----|
| **TENET** | Open-source auditor | Purpose-built Telegram Mini App insecurity auditor | arxiv.org/abs/2608.17538 |
| **telekit** | Dev kit | 50+ production-ready examples; initData validation, HMAC verification | GitHub |
| **alexvkokin/telegram-mini-app-validation** | PHP library | Mini App initData validation (reference implementation) | GitHub |
| **SCW Intel Bot** | Telegram bot | Free CVE search, Sigma detection rules, breach alerts | Telegram |

### 5.4 SOLANA SECURITY & SIMULATION

| Resource | Type | Use Case | URL |
|----------|------|----------|-----|
| **Solsec** | Security resources | Curated Solana smart contract audit tools and vulnerabilities | GitHub |
| **Jito `simulateBundle`** | Free simulation | Pre-flight bundle simulation; failed simulation is free | docs.jito.wtf |
| **Helius free tier** | RPC provider | 1M free credits/month for dev/testing | helius.dev |
| **QuickNode free tier** | RPC provider | 10M free credits/month for dev/testing | quicknode.com |
| **SolanaPriorityFee.org** | Fee estimator | Real-time priority fee tracking and calculation | solanapriorityfee.org |
| **RPC Fast transaction simulator** | Simulation API | Free transaction simulation API | rpcfast.com |
| **Rugcheck API** | Token risk API | Honeypot/rug-pull detection; no API key required | GitHub |
| **MadeOnSol** | Security tool comparison | 8 Solana security tools compared | madeonsol.com/compare-security |

### 5.5 OBSERVABILITY & MONITORING

| Resource | Type | Use Case | URL |
|----------|------|----------|-----|
| **OpenTelemetry** | Observability framework | Distributed tracing, metrics, logs | opentelemetry.io |
| **Jaeger** | Tracing backend | Open-source distributed tracing | jaegertracing.io |
| **Grafana** | Visualization | Metrics dashboards | grafana.com |
| **Prometheus** | Metrics storage | Time-series metrics | prometheus.io |
| **Loki** | Log aggregation | Log aggregation for Grafana | grafana.com/oss/loki |
| **SigNoz** | All-in-one observability | Self-hosted Datadog alternative | signoz.io |
| **Uptime Kuma** | Uptime monitoring | Self-hosted; unlimited checks | GitHub |
| **WatchCron** | SSL/uptime monitoring | Free SSL expiry and uptime checks | watchcron.com |
| **UptimeRobot** | Uptime monitoring | Free tier: 50 monitors, 5-min intervals | uptimerobot.com |
| **Qualys SSL Labs** | SSL analysis | Deep SSL/TLS configuration analysis | ssllabs.com |

### 5.6 LEGAL & COMPLIANCE

| Resource | Type | Use Case | URL |
|----------|------|----------|-----|
| **PolicifyAI** | Legal doc generator | MiCA/GDPR/AML-aware ToS, privacy policy, risk disclosures | policifyai.com |
| **Termly.io** | Legal doc generator | Privacy policy, terms of service templates | termly.io |
| **TermsFeed** | Legal doc generator | Free privacy policy and terms templates | termsfeed.com |
| **FreePrivacyPolicy.com** | Legal doc generator | Free privacy policy generator | freeprivacypolicy.com |
| **SimpleAudit** | SOC 2 toolkit | Policy templates, readiness checklist, evidence guide | GitHub |
| **capetron/incident-response-plan-template** | IR plan | NIST SP 800-61-based; ransomware, phishing, breach playbooks | GitHub |
| **NorthPoint MiCA marketing self-audit skill** | Compliance skill | 40 rules for EU crypto marketing compliance | GitHub |
| **brandonhimpfen/awesome-crypto-compliance** | Compliance resources | Curated crypto compliance tools and frameworks | GitHub |
| **vyayasan/kyc-analyst** | KYC/AML automation | Open-source KYC/AML compliance automation | GitHub |

### 5.7 SECRETS MANAGEMENT & CRYPTOGRAPHY

| Resource | Type | Use Case | URL |
|----------|------|----------|-----|
| **OpenBao** | Secrets manager | Open-source Vault alternative; MPL-2.0 licensed | openbao.org |
| **Infisical** | Secrets manager | Open-source-first; polished DX; self-hostable | infisical.com |
| **Node.js crypto module** | Built-in library | AES-256-GCM, HMAC, random bytes | nodejs.org/api/crypto.html |

### 5.8 INCIDENT RESPONSE & THREAT INTEL

| Resource | Type | Use Case | URL |
|----------|------|----------|-----|
| **Rootly** | IR runbook templates | Free runbook templates, IR frameworks | rootly.com |
| **awesome-threat-intelligence** | Threat intel feeds | Free IP/domain/malware feeds | GitHub |
| **OpenPhish** | Phishing feeds | Real-time phishing URL feeds | openphish.com |
| **Cyber Cure** | Threat intel | Free cyber threat intelligence feeds | cybercure.ai |
| **ELLIO** | IP feed | Community free IP threat list | feed.ellio.tech |
| **NormShield** | Domain intel | Phishing domain information | services.normshield.com |

### 5.9 AI AGENT SECURITY

| Resource | Type | Use Case | URL |
|----------|------|----------|-----|
| **AgentArmor** | Security framework | 8-layer defense-in-depth for agentic AI; OWASP ASI Top 10 | GitHub |
| **Microsoft Agent Governance Toolkit** | Runtime security | OS-level security for autonomous AI agents | GitHub |

### 5.10 BACKUP & RECOVERY

| Resource | Type | Use Case | URL |
|----------|------|----------|-----|
| **btcrecover** | Recovery tool | Bitcoin wallet password/seed recovery | GitHub |
| **Crypto-seed-phrase-recovery** | Recovery tool | 13-chain seed phrase recovery | GitHub |

### 5.11 BUG BOUNTY & PENETRATION TESTING

| Resource | Type | Use Case | URL |
|----------|------|----------|-----|
| **HackerOne Community Edition** | Bug bounty platform | Free for eligible open-source projects | hackerone.com |
| **Wapiti** | DAST scanner | Open-source web app vulnerability scanner | wapiti-scanner.github.io |

### 5.12 MONITORING & ALERTING

| Resource | Type | Use Case | URL |
|----------|------|----------|-----|
| **Grafana Cloud free tier** | Monitoring | 10k series, 50 GB logs, 14-day retention | grafana.com |
| **Watchflare** | Self-hosted monitoring | Open-source server monitoring with alerting | watchflare.io |
| **MonSys** | Self-hosted monitoring | Go agent + React SPA + TimescaleDB | GitHub |

### 5.13 COMPLIANCE FRAMEWORKS

| Resource | Type | Use Case | URL |
|----------|------|----------|-----|
| **theopenlane/policy-hub** | Policy templates | SOC2, ISO27001, NIST 800-53 example policies | GitHub |
| **bitecode.tech crypto compliance checklist** | Compliance checklist | KYC, transaction monitoring, Travel Rule, governance | bitecode.tech |
| **Buzzi.ai AI insurance gap assessment** | Insurance tool | Free AI coverage gap heatmap; flags Verisk CG 40 47/48 | buzzi.ai |

---

## 6. IMPLEMENTATION PRIORITY

### PHASE 1: CRITICAL SECURITY (Week 1-2)
1. Upgrade Next.js (2.1)
2. Webhook timestamp + nonce validation (3.1)
3. Audit dependencies for typosquatting (1.1)
4. Rotate keys if suspicious packages present (1.2)
5. Telegram cross-origin domain registration (4.1)
6. Pre-flight transaction simulation (5.1)
7. Session concurrent-limit enforcement (5.5)
8. Secrets redaction + correlation IDs (7.1, 7.2)
9. Non-custodial key isolation verification (1.3)
10. Terms of Service + Privacy Policy (9.1, 9.2)

### PHASE 2: AUTH & COMPLIANCE (Week 3-4)
1. Handler-level auth wrapper (2.3)
2. Auth middleware coverage audit (2.4)
3. Open redirect prevention (2.5)
4. CSRF protection (2.6)
5. MiCA readiness assessment (9.4)
6. GDPR/privacy-by-design review (9.5)
7. Data retention matrix (9.11)
8. Incident response plan (9.9)

### PHASE 3: OBSERVABILITY & INFRASTRUCTURE (Week 5-6)
1. Metrics/health completeness (7.3)
2. Alert fatigue controls (7.4)
3. Incident runbook (0.3)
4. `.env.example` + startup validation (8.1)
5. CI/CD security gates (8.4)
6. Build/lint/typecheck gates (8.5)
7. Backup/recovery testing (8.3)

### PHASE 4: MASTER PLAN GAPS (Week 7-10)
1. Paper trading isolation (10.1)
2. Tax lot accounting (10.2)
3. PnL formula verification (10.3)
4. Paper/real separation (10.6)
5. Dashboard security gates (10.8)
6. Security audit + pen test (10.9)

### PHASE 5: POLISH & FUTURE-PROOFING (Week 11-12)
1. Astryx/token compliance sweep (11.1)
2. Mobile readability (11.2)
3. Accessibility baseline (11.3)
4. HSM/KMS-backed signer segregation (1.4)
5. SOC 2 / ISO 27001 roadmap (9.8)
6. CARF/OECD readiness (9.7)

---

## 7. VERIFICATION PROTOCOL

Every item in this checklist must have:
1. **Evidence:** Concrete artifact (code, config, document, test result)
2. **Verification:** How the evidence is validated (code review, test, drill, legal review)
3. **Owner:** Named individual responsible for completion
4. **Status:** Not Started / In Progress / Complete / Blocked

No item is considered complete without evidence and verification.

---

## 8. CHANGE LOG

| Date | Version | Change |
|------|---------|--------|
| 2026-08-26 | 1.0 | Initial creation; 80 items, 40+ free resources |

---

*This document is maintained by the OSIRIS development team. All security work must be traceable to this plan.*
