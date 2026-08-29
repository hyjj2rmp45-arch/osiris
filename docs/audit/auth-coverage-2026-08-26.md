# OSIRIS Auth Coverage Audit
**Date:** 2026-08-26  
**Auditor:** Automated + manual review  
**Scope:** `src/app/api/**/route.ts`

## Summary
- Total route files audited: 27
- Routes using shared auth helper: 22
- Routes with manual auth only: 5

## Findings
### Missing shared wrapper
| Route | Current auth | Recommendation |
|-------|--------------|----------------|
| `src/app/api/health/route.ts` | None | Add `withAuth()` for admin-only health checks |
| `src/app/api/me/route.ts` | Manual session lookup | Refactor to `withAuth()` |
| `src/app/api/payments/verify/route.ts` | Manual session lookup | Refactor to `withAuth()` |
| `src/app/api/subscription/auto-renew/route.ts` | Manual session lookup | Refactor to `withAuth()` |

### Already compliant
| Route | Status |
|-------|--------|
| `src/app/api/webhooks/helius/route.ts` | Uses `assertSignedIn()` ✅ |
| `src/app/api/auth/telegram/route.ts` | Public auth endpoint ✅ |
| `src/app/api/sse/route.ts` | Uses `getAuthenticatedUser()` ✅ |
| `src/app/api/alerts/route.ts` | Uses `assertSignedIn()` ✅ |

## Action
Refactor 4 routes to use `withAuth()` wrapper. Tracked in todo #9.
