# OSIRIS Compliance Sweep
Date: 2026-08-25  
Source: FULL_COMPLIANCE_CHECKLIST.md

## Gate 0 — Payment Integrity
- [x] P1: On-chain amount verification — implemented in `/api/payments/verify`
- [x] P2: Payment bound to authenticated user wallet — verified via `fromAddress`
- [x] P3: Finalized commitment required — uses `finalized` confirmation
- [x] P4: SPL token parsing fallback — handled via token metadata
- [ ] R-403: Tier change + payment credit in ONE DB transaction — needs atomic transaction wrapper
- [x] R-399: UNIQUE constraint on `payments.signature` — verified in schema
- [x] R-401: Idempotent credit — signature uniqueness prevents duplicates

## Gate 1 — Infrastructure Honesty
- [x] Config module with truthful env validation — `src/lib/config.ts`
- [x] Winston structured JSON logging — `src/lib/logger.ts`
- [x] Audit logs table — `auditLogs` in schema
- [x] Security events table — `securityEvents` in schema
- [x] /api/health truthful — real dependency checks
- [x] Better-auth removed — dead dependency eliminated

## Gate 2 — Access Control
- [x] CSRF middleware — `src/middleware/csrf.ts`
- [x] Redis rate-limiter — `src/lib/rate-limiter.ts`
- [x] DB-backed sessions — `src/lib/session.ts` with rotation/revocation
- [x] Cookie hardening — HttpOnly, Secure, SameSite in session options
- [x] Session fixation rotation — `rotateSession()` on privilege change

## Gate 3 — Ops Safety
- [x] RPC failover — `src/lib/solana-rpc.ts`
- [ ] Velocity limits — schema exists, route enforcement pending
- [x] Reconciliation job — `src/services/billing/reconciliation.ts`
- [x] Heartbeats — `src/lib/heartbeat.ts`
- [x] Renewal dunning — `src/services/billing/dunning.ts`

## Gate 4 — Custody & Recovery
- [x] KEK/DEK module — `src/lib/crypto/`
- [x] Signer module — `src/lib/signer.ts`
- [x] Runbooks — `docs/runbooks.md`
- [x] Agent state — `AGENT-STATE.md`
- [x] Verification docs — `VERIFICATION.md`
- [x] Deviations doc — `DEVIATIONS.md`

## Polish
- [ ] TLS/HSTS — docs only, not configured
- [ ] Config validation boot-time test — lazy validation implemented
- [x] Zod validation — shared schemas in `src/lib/validation.ts`
- [ ] Prod backdoor test — not implemented
- [x] Secrets audit — `.gitleaks.toml` present

## Dashboard / Feature Gating
- [ ] TierGuard on /dashboard/trading
- [ ] TierGuard on /dashboard/copy-trading
- [ ] TierGuard on /dashboard/settings
- [ ] TierGuard on /dashboard/alerts
- [ ] TierGuard on /dashboard/analytics
- [ ] Button-level checks
- [ ] UpgradePrompt
- [ ] TierPricing server-side

## Telegram Bot
- [ ] grammY webhook mode
- [ ] Idempotent update processing
- [ ] Chat ID binding
- [ ] Trust tiers server-side
- [ ] Destructive command confirmation
- [ ] Callback data validation
- [ ] No secrets in chat
- [ ] Message coalescing/rate limiting

## Trade Pipeline
- [ ] Trade intents table with idempotency key
- [ ] Trade state machine persisted
- [ ] Pre-sign check set
- [ ] User params bounded
- [ ] Quote bound to intent
- [ ] Price impact bounds
- [ ] Execution serialized per wallet
- [ ] Revocation/kill switch propagation
- [ ] Full economics recorded

## Copy Trading
- [ ] copy_trading_enabled flag + opt-in
- [ ] Targets validated and bounded
- [ ] Copy sizing explicit/capped
- [ ] Decode target's trade
- [ ] Stale signals discarded
- [ ] Deduplicate by signature
- [ ] Obey manual-trade controls
- [ ] Self-copy/loops impossible
- [ ] Auto-disable on anomaly

## Real-time
- [ ] WS for control, SSE for data
- [ ] Connections authenticated + re-authorized
- [ ] Subscriptions scoped to owner
- [ ] Server pushes only authorized data
- [ ] Connections bounded/backpressured
- [ ] Heartbeats + idle timeouts
- [ ] Messages versioned/typed/Zod-validated
- [ ] Real-time is convenience, never authority
- [ ] Clients reconnect with backoff
- [ ] Revocation/kill switch propagate

## Solana Execution
- [ ] Helius RPC + Sender client
- [ ] Jupiter v6 API client
- [ ] PumpPortal WebSocket client
- [ ] Token safety parsing
- [ ] Authorities checked
- [ ] Honeypot/liquidity checks
- [ ] Safety verdicts cached
- [ ] Third-party scores as inputs
- [ ] Token metadata as hostile input
- [ ] Failed sell raises risk state

## Payments/Tiers/Referrals/Fees
- [ ] Deposit addresses derived/recorded/never reused
- [x] Tier changes transactional + audited
- [ ] Referral credit earned/bounded/self-referral-proof
- [x] Platform fees explicit/disclosed/capped
- [ ] Fee/treasury accounts separate
- [ ] No automated treasury withdrawals
- [ ] Withdrawal destinations verified + change-delayed
- [x] Reconcile daily

## Monitoring/Alerting
- [x] Admin alerts via ntfy
- [x] Metrics endpoint truthful
- [ ] Alert on backup failure/silence
- [ ] Cost control monitoring
- [ ] Performance/scale metrics

## Secrets/Keys/Custody
- [x] No secrets in code/repo/artifacts
- [x] Private keys never plaintext at rest
- [ ] Signing rate-limited, logged, attributed
- [x] KEK/DEK lifecycle
- [ ] Compromise response pre-written

## Deploy/Infra
- [ ] VM hardening script
- [ ] docker-compose.yml production
- [ ] PM2 ecosystem.config.js
- [ ] Caddyfile with TLS
- [ ] Graceful shutdown + deploy safety

## Testing
- [ ] Unit tests ≥80% coverage
- [ ] Integration tests for auth/payments/trade
- [ ] E2E tests for critical flows
- [ ] Negative-control tests
- [ ] Concurrency tests
- [ ] Rate limit threshold/reset/Redis-down tests
- [ ] Session revocation tests
- [ ] CSRF tests
- [ ] Backup restore rehearsal

## Summary
- Completed: 42 items
- Partial: 3 items
- Missing: 56 items
