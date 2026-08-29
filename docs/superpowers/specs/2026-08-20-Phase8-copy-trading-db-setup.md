# Copy Trading Runtime Setup

This note documents the exact setup needed to restore the full `/api/copy-trading` implementation from the current build-safe stub to live DB-backed behavior.

## Current state
- Dashboard page: `src/app/dashboard/copy-trading/page.tsx`
- Route stub: `src/app/api/copy-trading/route.ts`
- Full implementation backup: `src/app/api/copy-trading/_route.ts.bak`
- Data model: `src/lib/schema.ts` defines `copyTargets`, `copyTrades`, and `copyTargetsUnique`

## Prerequisites
- PostgreSQL reachable from the app runtime
- DB user with rights to create/read tables and indexes for the OSIRIS schema
- Copy-trading schema objects present in the target database

## Environment variable
Set `DATABASE_URL` for the runtime that runs Next.js requests.

Examples:
- Local dev: `.env.local`
- Hosted: provider secret/config var store

```
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>?schema=<optional_schema>
```

## Schema expectation
The route implementation assumes the following tables/indexes already exist:
- `copy_targets`
- `copy_trades`
- unique index `copy_targets_user_address_unique`

If migrations are not already present, create/apply them before enabling the full route.

## Restore steps
1. Confirm `DATABASE_URL` is present in the runtime environment.
2. Confirm the copy-trading schema objects exist.
3. Replace `src/app/api/copy-trading/route.ts` with `src/app/api/copy-trading/_route.ts.bak`.
4. Remove the backup file after restore:
   - `rm src/app/api/copy-trading/_route.ts.bak`
5. Rebuild/restart the app.

## Verification
- `npm test`
- `npm run build`
- Runtime smoke test against `/api/copy-trading` with expected auth headers present
