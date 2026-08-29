# Runtime Service Route Restoration Guide

## Current State

The following API routes are stubbed to preserve build safety:
- `src/app/api/killswitch/route.ts`
- `src/app/api/rate-limits/route.ts`
- `src/app/api/rugcheck/route.ts`
- `src/app/api/prices/route.ts`

Full service-backed implementations are preserved as backups:
- `src/app/api/killswitch/_route.service.ts.bak`
- `src/app/api/rate-limits/_route.service.ts.bak`
- `src/app/api/rugcheck/_route.service.ts.bak`
- `src/app/api/prices/_route.service.ts.bak`

## Required Runtime Setup

Before restoring, ensure the following are configured:

### 1. Redis
```env
REDIS_URL=redis://localhost:6379
```
- Redis must be reachable at build/runtime
- Rate limiter and price cache depend on Redis availability

### 2. PostgreSQL
```env
DATABASE_URL=postgresql://osiris:password@localhost:5432/osiris
```
- Database must be migrated with Phase 5 schema tables:
  - `circuit_breaker_state`
  - `tax_lots`
  - `token_metadata`
  - `rate_limits`
  - `multisig_proposals`
  - `kill_switch_events`
- Run migrations before restoring routes that query these tables

### 3. External APIs (optional)
```env
JUPITER_API_URL=https://api.jup.ag
BIRDEYE_API_KEY=
DEXSCREENER_API_URL=https://api.dexscreener.com
RUGCHECK_API_URL=https://api.rugcheck.xyz
```

## Restoration Steps

### Step 1: Verify Runtime Connectivity
```bash
# Test Redis connectivity
redis-cli ping

# Test PostgreSQL connectivity
psql $DATABASE_URL -c "SELECT 1"

# Verify schema tables exist
psql $DATABASE_URL -c "\dt"
```

### Step 2: Restore Service Routes
```bash
# Killswitch
cp src/app/api/killswitch/_route.service.ts.bak src/app/api/killswitch/route.ts

# Rate limits
cp src/app/api/rate-limits/_route.service.ts.bak src/app/api/rate-limits/route.ts

# Rugcheck
cp src/app/api/rugcheck/_route.service.ts.bak src/app/api/rugcheck/route.ts

# Prices
cp src/app/api/prices/_route.service.ts.bak src/app/api/prices/route.ts
```

### Step 3: Verify Build
```bash
rm -rf .next
npm run build
```

### Step 4: Verify Runtime
```bash
npm run dev
# Test endpoints:
curl http://localhost:3000/api/killswitch
curl http://localhost:3000/api/rate-limits
curl http://localhost:3000/api/rugcheck
curl http://localhost:3000/api/prices
```

## Fallback Plan

If build-time collection still crashes after restoration:
1. Add `export const dynamic = 'force-dynamic'` to the route
2. Move service calls into runtime-only handlers
3. Keep a stub fallback if Redis/DB is unavailable

## Rollback

To revert to stubs:
```bash
# Overwrite with current stubs from this guide
```

## Notes

- All service modules remain intact in `src/services/`
- Tests for services remain in place
- Copy-trading flow is already wired to service imports
