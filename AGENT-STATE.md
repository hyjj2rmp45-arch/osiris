# AGENT-STATE

Last updated: 2026-08-25

## Current Phase
Step 5F — runbooks, verification docs, deviations, TLS guidance, Zod boundary validation, secret scanning.

## Completed Gates
- Gate 0: payment route exists; P1-P5 fixes pending final review.
- Gate 1: auth implemented (Telegram HMAC + session cookies).
- Gate 2: RBAC via `assertSignedIn` on protected API routes.
- Gate 3: logging via Winston + security logger + health checks.
- Gate 4: schema includes auditLogs, securityEvents, featureFlags.

## Known Deviations
- Redis is optional at startup; rate-limiter fails open by default for non-critical actions.
- Health endpoint is dynamic and may perform outbound RPC checks on POST.
- `x-forwarded-for` is used for rate-limit identity; ensure reverse proxy sets it.

## Secrets
- `ENCRYPTION_KEY`: 64 hex chars required for KEK.
- `TELEGRAM_SECRET_KEY`: HMAC key for Telegram auth.
- `DATABASE_URL`: PostgreSQL connection string.
- `SOLANA_RPC_URL`: primary RPC endpoint.

## Next Actions
- Add Zod schemas to remaining API routes.
- Add gitleaks/config to repo.
- Document TLS termination strategy.
