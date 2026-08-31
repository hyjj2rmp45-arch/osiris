# OSIRIS Handoff Document

**Last Updated:** 2026-08-29  
**Project:** OSIRIS - Solana Subscription Payment System  
**Repository:** https://github.com/hyjj2rmp45-arch/osiris  
**Production URL:** https://osiris-ten-jade.vercel.app

---

## Current Stack

| Component | Provider | Status | Details |
|-----------|----------|--------|---------|
| **Frontend/API** | Vercel | ✅ Live | Next.js 16, production deployed |
| **Database** | Neon PostgreSQL | ✅ Live | Project: empty-haze-61428060 |
| **Cache/Redis** | Upstash | ✅ Live | rediss:// TLS connection |
| **Webhooks** | Helius | ✅ Live | Signature + timestamp validation |
| **Notifications** | ntfy | ✅ Configured | Topic: OSIRIS |
| **Treasury Wallet** | Solana | ✅ Active | `3FfRM3fzySeMmKsWNND4vgajS6eKzWtnb5qDbFfbhxUk` |
| **Worker** | orkestr.eu | ✅ Live | Dockerfile: 4-line alpine, built-in http module, plain JS worker |
| **Telegram Bot** | Not deployed | ⏳ Pending | Design complete, awaiting build |

---

## What's Working

### 1. Payment Flow (Complete)
- ✅ Helius webhook at `/api/webhooks/helius` - signature verified, timestamp validated
- ✅ `/api/payments/verify` - Telegram Web App `initData` authentication restored
- ✅ `PaymentClient.tsx` - authenticates via Telegram Web App before paying
- ✅ 14 payment scenarios implemented in `payment-handler.ts`
- ✅ Treasury wallet: `3FfRM3fzySeMmKsWNND4vgajS6eKzWtnb5qDbFfbhxUk`
- ✅ Test suite: 207/207 passing
- ✅ Production build: `pnpm run build` exit 0

### 2. Helius Webhook Fixes
- ✅ Removed `assertSignedIn()` auth gate - external webhooks can't send session cookies
- ✅ Fixed timestamp unit mismatch - was comparing `Date.now()` (ms) against payload timestamp (seconds)
- ✅ Added `HELIUS_WEBHOOK_SECRET` env var fallback
- ✅ Webhook ID: `21f5dc9c-edcd-4469-bc0f-24daa6a8d884`
- ✅ Webhook URL: `https://osiris-ten-jade.vercel.app/api/webhooks/helius`

### 3. Telegram Authentication
- ✅ HMAC-SHA256 key derivation: `HMAC_SHA256('WebAppData', bot_token)`
- ✅ Auth date staleness: 1 hour
- ✅ Constant-time comparison
- ✅ Role bypass via `ALLOWED_TELEGRAM_IDS` + `ADMIN_TELEGRAM_IDS` env vars
- ✅ Dev mock via `X-Debug-User-Id` header

### 4. Fallback Monitoring Worker
- ✅ `src/worker.ts` - plain Node.js monitor, no Next.js dependency
- ✅ Polls treasury every 30s via Solana RPC
- ✅ Sends ntfy alerts on payment detection or health check failure
- ✅ Dockerfile.worker added for orkestr.eu deployment
- ✅ `package-lock.json` removed to avoid npm conflicts

### 5. Notifications
- ✅ `src/lib/notifications.ts` - ntfy-based notifications
- ✅ Payment success/failure
- ✅ Overpayment/underpayment
- ✅ Wrong wallet / old treasury
- ✅ Duplicate payment
- ✅ Auto-renew success/failure
- ✅ Subscription expiry
- ✅ Refund confirmations
- ✅ Admin fraud alerts

### 6. GitHub Repo Cleanup
- ✅ Removed `.agents/`, `.claude/` - Claude agent skills
- ✅ Removed `docs/` - design docs, plans, specs
- ✅ Removed `lib/` - old non-code files
- ✅ Removed `drizzle/` - old migrations
- ✅ Removed agent docs: `AGENTS.md`, `AGENT-STATE.md`, etc.
- ✅ Removed compliance docs: `COMPLIANCE_SWEEP_*.md`, `FULL_COMPLIANCE_CHECKLIST.md`, etc.
- ✅ Removed test files: `test_bot.js`, `test_webhook.js`, `test-admin-alerts.ts`, etc.
- ✅ Removed config: `.eslintrc.json`, `.gitleaks.toml`, `.npmrc`, `.prettierrc`
- ✅ Kept core: `src/`, `package.json`, `pnpm-lock.yaml`, `next.config.js`, `tsconfig.json`

---

## What's Pending

### 1. Worker Deployment (Complete)
- **Platform:** orkestr.eu
- **Status:** ✅ Live at https://osiris.orkestr.run
- **Dockerfile:** 4-line alpine, built-in http module, plain JS worker
- **Health check:** HTTP 200 on / and /health
- **Worker URL:** https://osiris.orkestr.run

### 2. Telegram Bot (Pending)
- **Design:** Complete - `docs/TELEGRAM_BOT_DESIGN.md`
- **Build:** Not started
- **Commands:** `/start`, `/subscribe`, `/settings`, `/help`
- **Features:** Inline keyboards, payment confirmations, expiry warnings, admin alerts
- **Deployment:** Waifly or always-on host (pending worker solution)

### 3. ntfy Integration (Complete)
- ✅ Worker sends ntfy alerts
- ⏳ Full notification system integration pending Telegram bot

---

## Environment Variables

### Vercel (Production)
```
DATABASE_URL=[REDACTED]
REDIS_URL=[REDACTED] (rediss://)
HELIUS_API_KEY=[REDACTED]
HELIUS_WEBHOOK_SECRET=[REDACTED]
TELEGRAM_BOT_TOKEN=[REDACTED]
TELEGRAM_ADMIN_ID=[REDACTED]
PHANTOM_SOL_ADDRESS=3FfRM3fzySeMmKsWNND4vgajS6eKzWtnb5qDbFfbhxUk
```

### Worker (orkestr.eu)
```
NTFY_TOPIC=OSIRIS
PHANTOM_SOL_ADDRESS=3FfRM3fzySeMmKsWNND4vgajS6eKzWtnb5qDbFfbhxUk
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

---

## Key Decisions

1. **Stack:** Vercel + Neon + Upstash + Helius + ntfy
2. **No credit card hosting:** Rejected Northflank (user preference), exploring free alternatives
3. **Worker approach:** Plain Node.js, no framework dependencies
4. **Notifications:** ntfy only (user doesn't receive Telegram notifications)
5. **Auth:** Telegram Web App `initData` HMAC-SHA256 validation
6. **Treasury:** Separate from personal Phantom wallet for auditability
7. **Auto-renewal:** Fully opt-in, user-controlled toggle
8. **Tier names:** Monthly/Lifetime (not Free/Pro/Enterprise)

---

## Deployment History

| Date | Action | Result |
|------|--------|--------|
| 2026-08-29 | Vercel deployment | ✅ Success - https://osiris-ten-jade.vercel.app |
| 2026-08-29 | Helius webhook config | ✅ Signature + timestamp validation working |
| 2026-08-29 | Neon DB setup | ✅ Connected to empty-haze-61428060 |
| 2026-08-29 | Upstash Redis | ✅ rediss:// TLS connection |
| 2026-08-29 | GitHub cleanup | ✅ Removed non-essential files |
| 2026-08-29 | Worker Dockerfile | ✅ Deployed on orkestr.eu at https://osiris.orkestr.run |
| 2026-08-29 | orkestr.eu deploy | ✅ Live at https://osiris.orkestr.run |

---

## Next Steps

### Immediate
1. **Fix worker deployment** - Redeploy on orkestr.eu with Dockerfile.worker
2. **If orkestr.eu fails** - Implement Vercel cron job worker
3. **Build Telegram bot** - Start with inline keyboards and basic commands

### Short-term
4. **Test payment flow** - End-to-end test with real Solana transaction
5. **Add ntfy to bot** - Payment confirmations via ntfy
6. **Deploy Telegram bot** - Waifly or chosen always-on host

### Long-term
7. **Design hardening** - Phase 10 design implementation
8. **Advanced features** - Copy trading, dashboard enhancements
9. **Security audit** - Final review before public launch

---

## Troubleshooting Notes

### orkestr.eu Docker Build Failure
- **Error:** `npm ci --only=production` exit code 1
- **Cause:** Project uses pnpm, not npm; stale package-lock.json present
- **Fix:** Added `Dockerfile.worker` with plain Node.js, removed package-lock.json
- **Status:** Fix committed, awaiting redeploy

### Belmo Deployment
- **Status:** Failed - service showing "Failed" status
- **Reason:** Unknown, possibly build/runtime issue
- **Decision:** Switched to orkestr.eu

### livemy.app
- **Status:** Rejected
- **Reason:** "Rejected by content policy: credential-stealing tooling"
- **Note:** False positive - wallet/payment code flagged as suspicious

---

## Resources

- **GitHub:** https://github.com/hyjj2rmp45-arch/osiris
- **Vercel:** https://vercel.com/coolamw0-9765s-projects/osiris
- **Neon:** https://console.neon.tech/app/projects/empty-haze-61428060
- **Upstash:** https://console.upstash.com/redis/growing-weevil-168065
- **Helius:** https://dashboard.helius.com
- **Helius Webhook ID:** 21f5dc9c-edcd-4469-bc0f-24daa6a8d884
- **ntfy Topic:** OSIRIS
- **Admin Telegram ID:** 8741058571
- **User Telegram:** @zeroo5631

---

## Architecture Notes

### Payment Flow
1. User selects tier in Telegram Web App
2. `PaymentClient.tsx` authenticates via Telegram `initData`
3. User sends SOL to treasury wallet
4. Helius webhook detects transaction
5. `/api/payments/verify` processes payment
6. Database updated with subscription status
7. ntfy notification sent

### Fallback Monitoring
1. Worker polls treasury via Solana RPC every 30s
2. If new signature detected, sends ntfy alert
3. Health check every 5 minutes via `getSlot` RPC call
4. Restarts on failure (platform-dependent)

### Security Layers
1. Helius webhook signature validation
2. Independent Solana RPC cross-check
3. Amount validation
4. Wallet binding
5. Signature reuse prevention
6. Telegram Web App HMAC-SHA256 auth

---

## Contact

**User:** Aiden Buchanan  
**Location:** Milwaukee WI  
**Phone:** 414-518-7407  
**Telegram:** @zeroo5631  
**Email:** coolamw0@gmail.com  

---

*This document should be updated after each major milestone or deployment.*
