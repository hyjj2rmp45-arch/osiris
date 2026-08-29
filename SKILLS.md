# Project Skills Library

## Installed Skills

### crypto-subscription-system
- **Description**: Build crypto subscriptions with on-chain verification, scenario handling, and Telegram bot integration
- **Category**: software-development
- **Key Files**: 
  - `src/lib/payment-handler.ts` — Core scenario processor
  - `src/lib/payment-monitoring.ts` — Multi-provider fallback monitoring
  - `src/lib/notifications.ts` — Telegram user/admin notifications
  - `src/app/api/payments/verify/route.ts` — REST API endpoint
  - `src/app/select-tier/[tier]/PaymentClient.tsx` — Payment page with auto-renew toggle
- **Scenario Matrix**: 14 scenarios (exact, over, under, wrong wallet, old treasury, duplicate, congestion, auto-renew ON/OFF, mid-period cancel, Helius failure, refund, multi-account wallet, USDC)
- **Hosting Options**: Oracle Cloud (free), Northflank (managed), Hetzner+Coolify ($5/mo), SnapDeploy ($1/24h)