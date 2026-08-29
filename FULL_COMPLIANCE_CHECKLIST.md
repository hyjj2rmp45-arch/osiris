# OSIRIS COMPLIANCE CHECKLIST — Gate-Structured
# Derived from OSIRIS_AI_READY_MASTER_PLAN_v2.txt + 3 rounds compliance research
# Session: 20260824_103808_25a35c5e (completed) | Phase 10 dashboard active

# GATE-0 — PAYMENT INTEGRITY (blocks everything money-related)
#   P1: Don't trust expectedAmount from client — fetch on-chain, verify amount
#   P2: Payment must be bound to authenticated user's wallet (fromAddress ≡ user wallet)
#   P3: Must require `finalized` commitment, not just `confirmed`
#   P4: SPL token transfers need different parser (lamports field)
#   R-403: Single transaction + fee constants + idempotent credit
#   R-399: Payment verification ON-CHAIN, FINALIZED, IDEMPOTENT (unique sig constraint)

## GATE-0
- [ ] P1: Remove expectedAmount from POST body; always fetch on-chain verification
- [ ] P2: Verify payment.to matches PHANTOM_SOL_ADDRESS or PHANTOM_USDC_ADDRESS
- [ ] P3: Change status check from 'confirmed' to 'finalized' per R-399
- [ ] P4: Add SPL token transfer parsing fallback
- [ ] R-403: Make tier change + payment credit ONE db transaction (R-401)
- [ ] R-399: Add UNIQUE constraint on payments.signature; reject duplicates

# GATE 1 — INFRASTRUCTURE HONESTY
#   R-494/495: Config module with truthful env validation
#   R-156-158: Winston logger (structured, JSON, levels)
#   R-159/160: auditLogs and securityEvents tables in drizzle schema
#   R-167: /api/health truthful (real dependency state, never static 200)

## GATE 1
- [ ] Config module: Create src/lib/config.ts — validate every required env var on startup, fail hard if missing (R-189)
- [ ] Winston logger: Install winston, configure structured JSON logging, integrate with all API routes (R-156-158)
- [ ] Audit logs table: Add auditLog to drizzle schema (userId, type, reason, metadata, createdAt) (R-159)
- [ ] Security events table: Add securityEvent to drizzle schema (eventType, userId, ip, userAgent, createdAt) (R-160)
- [ ] /api/health: Implement real dependency checks (DB conn, Redis, RPC, signer, queue) returning non-200 when unavailable (R-167)
- [ ] Better-auth integration: Un-integrate or fully integrate — currently installed but broken/unused

# GATE 2 — ACCESS CONTROL
#   R-198: CSRF middleware protecting all non-GET routes reachable by browser
#   R-216: Redis-backed rate-limiter (fail-closed when Redis down)
#   R-195-197: Session hardening (server-side, revocable, short expiry, idle expiry, rotation on privilege change)

## GATE 2
- [ ] CSRF middleware: Create src/middleware/csrf.ts with token mismatch ⇒ 403 + security event; verify origin/referer as second signal (R-198)
- [ ] Redis rate-limiter: Create src/lib/rate-limiter.ts using Redis; per-IP, per-user, per-session, per-endpoint-class, globally; deny when Redis unreachable (R-216)
- [ ] Session server-side: Move sessions from cookie-only to DB-backed; add absolute expiry + idle expiry + immediate invalidation on logout/tier change/revocation (R-195-197)
- [ ] Cookie hardening: HttpOnly + Secure + SameSite=Strict + Path=/ + __Host- prefix where applicable + short max-age (R-196)
- [ ] Session fixation rotation: New session identifier on every privilege change: login, tier upgrade, password change, 2FA change, admin elevation (R-197)

# GATE 3 — OPS SAFETY
#   R-323: RPC failover — one RPC per decision, never merge partial answers
#   R-217: Velocity limits (daily/momentum limits on trades)
#   R-410: Daily reconciliation job (on-chain vs records, discrepancies alert never auto-correct)
#   D-055: Heartbeats
#   T-3d/T-1d: Renewal dunning via notificationEvents

## GATE 3
- [ ] RPC failover: Implement single-RPC-per-decision pattern; on failure, restart against another provider, reconcile explicitly, never merge (R-323)
- [ ] Velocity limits: Add daily trade count / per-user rate limits (R-217)
- [ ] Reconciliation job: Schedule daily job comparing on-chain balances vs trade records/lots/fee accounts; alert discrepancies beyond tolerance, NEVER auto-correct (R-410)
- [ ] Heartbeats: Implement WS/SSE heartbeat mechanism with idle timeout and server-side cleanup (D-055)
- [ ] Renewal dunning: Implement notificationEvents-driven dunning at T-3d and T-1d before expiry (T-3d/T-1d)

# GATE 4 — CUSTODY & RECOVERY
#   R-170/175: KEK/DEK encryption — wallet private keys encrypted with DEK; DEK wrapped by KEK (MASTER_KEK/Vault); KEK never touches DB or logs
#   R-173: Signer module exists
#   R-528/532/568: Runbooks exist + restore rehearsal
#   R-032/563: Agent state files (AGENT-STATE.md, VERIFICATION.md, DEVIATIONS.md)

## GATE 4
- [ ] KEK/DEK module: Create src/lib/kek-dek.ts — generation, wrapping, unwrapping, rotation, revocation; keyEncryptionKeys table; keyStatusEnum (active|rotated|compromised) (R-170/175)
- [ ] Signer module: Create signer service per master plan specs (R-173/186)
- [ ] Runbooks: Create docs/runbooks/ directory with: key-compromise.md, disaster-recovery.md, DR rehearsal schedule
- [ ] Agent state files: Create docs/AGENT-STATE.md (current phase, task, next action, gates passed, outstanding, HARD STOP) (R-032)
- [ ] Verification docs: Create VERIFICATION.md (external verifications, rehearsals, measured budgets) (R-563)
- [ ] Deviations doc: Create DEVIATIONS.md (every difference from master plan, per R-016)

# POLISH
#   R-509: TLS everywhere, HSTS, Caddy auto-renewal
#   R-166: Boot-time config validation (R-189)
#   Zod validation on remaining 23 API routes (R-131)
#   Prod backdoor test
#   No secrets in repo artifacts

## POLISH
- [ ] TLS/HSTS: Configure Caddy with TLS auto-renewal; HTTP → HTTPS redirect; internal service traffic encrypted; HSTS enabled (R-509)
- [ ] Config validation: Boot-time test covers each missing/empty/known-default/shorter-than-min-length env var (R-189/R-166)
- [ ] Zod validation: Add Zod boundary validation to remaining 23 API routes that skip it (R-131)
- [ ] Prod backdoor test: Write integration test confirming no backdoor paths exist
- [ ] Secrets audit: Run gitleaks/trufflehog; remediate any found secrets in repo

# DASHBOARD / FEATURE GATING (Phase 10)
- [ ] Page-level TierGuard on /dashboard/trading (requires monthly/lifetime)
- [ ] Page-level TierGuard on /dashboard/copy-trading (requires monthly/lifetime)
- [ ] Page-level TierGuard on /dashboard/settings (requires monthly/lifetime)
- [ ] Page-level TierGuard on /dashboard/alerts (requires monthly/lifetime)
- [ ] Page-level TierGuard on /dashboard/analytics (requires monthly/lifetime)
- [ ] Button-level checks in TradePanel, CopyTradeHistory, etc.
- [ ] UpgradePrompt shows when tier check fails
- [ ] TierPricing displays correctly from server-side /api/me

# TELEGRAM BOT (Phase 8)
- [ ] grammY webhook mode with secret verification (R-373/DEF-001)
- [ ] Idempotent update processing by update_id (R-374)
- [ ] Chat ID ≠ authorization — resolve to OSIRIS user with verified binding (R-375/R-202)
- [ ] Trust tiers enforced server-side (not just missing keyboards) (R-376)
- [ ] Destructive commands require explicit confirmation with nonce (R-377)
- [ ] Callback data untrusted and bound (R-378)
- [ ] Never accept/display secrets in chat (R-379)
- [ ] Message coalescing and rate limiting (R-380/R-222)

# TRADE PIPELINE (Phase 1/4/24/25)
- [ ] Trade intents table with idempotency key (R-327)
- [ ] Trade state machine persisted (R-326)
- [ ] Pre-sign check set as single function (R-328)
- [ ] User params never silently widened (R-329)
- [ ] Quote bound to intent (R-330)
- [ ] Price impact/sanity bounds enforced (R-331)
- [ ] Execution serialized per wallet (R-332)
- [ ] Revocation/kill switch interrupts at every stage (R-333)
- [ ] Full economics recorded per trade (R-340)

# COPY TRADING (Phase 4/27)
- [ ] copy_trading_enabled flag + per-user opt-in + active session + per-target limits (R-349)
- [ ] Targets validated and bounded (R-350)
- [ ] Copy sizing explicit, capped, never proportional by accident (R-351)
- [ ] Decode target's trade — don't guess (R-352)
- [ ] Stale signals discarded (R-353)
- [ ] Deduplicate every signal by signature + target-event-id (R-354)
- [ ] Copy trades obey every manual-trade control (R-355)
- [ ] Self-copy and loops impossible (R-356)
- [ ] Auto-disable on anomaly (R-362)

# REAL-TIME (Phase 3/28)
- [ ] WS for control, SSE for data (R-363)
- [ ] Connections authenticated at handshake + re-authorized continuously (R-364)
- [ ] Subscriptions scoped to owner (R-365)
- [ ] Server pushes only what user may see (R-366)
- [ ] Connections bounded and backpressured (R-367)
- [ ] Heartbeats + idle timeouts mandatory (R-368)
- [ ] Messages versioned, typed, Zod-validated (R-369)
- [ ] Real-time is convenience, never authority (R-370)
- [ ] Clients reconnect with backoff + resume correctly (R-371)
- [ ] Revocation/kill switch propagate in real time (R-372)

# SOLANA EXECUTION (Phase 1/24/25)
- [ ] Helius RPC + Sender client (R-296)
- [ ] Jupiter v6 API client (R-297)
- [ ] PumpPortal WebSocket client (R-298)
- [ ] SAF-05 token safety parsing (R-342)
- [ ] Authorities checked including program upgrade authority (R-343)
- [ ] Honeypot/liquidity checks mandatory (R-344)
- [ ] Safety verdicts cached with short TTL (R-345)
- [ ] Third-party scores are inputs, not decisions (R-346)
- [ ] Token metadata is hostile input (R-347)
- [ ] Failed sell raises risk state (R-348)

# PAYMENTS/TIERS/REFERRALS/FEES (Phase 2/31)
- [ ] Deposit addresses derived, recorded, never reused (R-400)
- [ ] Tier changes transactional + audited (R-401)
- [ ] Referral credit earned, bounded, self-referral-proof (R-402)
- [ ] Platform fees explicit, disclosed, capped (R-403)
- [ ] Fee/treasury accounts separate from user funds (R-404)
- [ ] No automated treasury withdrawals (R-405)
- [ ] Withdrawal destinations verified + change-delayed (R-406)
- [ ] Reconcile daily (R-410)

# MONITORING/ALERTING (Phase 43)
- [ ] Admin alerts via ntfy/Telegram/SMS (R-535)
- [ ] Metrics endpoint truthful (R-167)
- [ ] Alert on backup failure/silence (R-531)
- [ ] Cost control monitoring (R-543)
- [ ] Performance/scale metrics (R-548)

# SECRETS/KEYS/CUSTODY (Phase 15)
- [ ] No secrets in code/repo/artifacts (R-169/R-170/R-171)
- [ ] Private keys never plaintext at rest (R-170)
- [ ] Signing rate-limited, logged, attributed (R-174)
- [ ] KEK/DEK lifecycle implemented (R-175)
- [ ] Compromise response pre-written (R-189)

# DEPLOY/INFRA (Phase 9/40/41)
- [ ] VM hardening script (scripts/setup-oracle-cloud.sh)
- [ ] docker-compose.yml production services
- [ ] PM2 ecosystem.config.js
- [ ] Caddyfile reverse proxy with TLS
- [ ] Graceful shutdown + deploy safety (R-521)

# TESTING (Phase 36)
- [ ] Unit tests ≥80% coverage (R-447)
- [ ] Integration tests for auth, payments, trade pipeline (R-448)
- [ ] E2E tests for critical flows (R-449)
- [ ] Negative-control tests proving each check is load-bearing (R-328)
- [ ] Concurrency tests for serialization (R-332)
- [ ] Rate limit threshold/reset/Redis-down tests (R-216)
- [ ] Session revocation tests (R-195)
- [ ] CSRF tests (R-198)
- [ ] Backup restore rehearsal (R-528)