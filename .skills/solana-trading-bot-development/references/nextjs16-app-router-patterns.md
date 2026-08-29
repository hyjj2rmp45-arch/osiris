# Next.js 16 App Router Patterns — OSIRIS Learned

## Route Params (vs `useSearchParams`)

**Wrong** (reads query string, not route params):
```tsx
// DON'T use useSearchParams() for route params in Next.js 16
export default function Page() {
  const params = useSearchParams();
  const tier = params.get('tier'); // Only reads ?tier= query param
}
```

**Correct** (reads from page props):
```tsx
// Server component receives params as props
export default function PaymentPage({ params }: { params: { tier: string } }) {
  const tier = params?.tier === 'lifetime' ? 'lifetime' : 'monthly';
  return <PaymentClient tier={tier} />;
}
```

## `useSearchParams()` Requires Suspense

**Next.js 16 error**: `useSearchParams() should be wrapped in a suspense boundary at page "/select-tier"`

**Solution 1 — Server wrapper (recommended)**:
```tsx
// page.tsx — server component
import { Suspense } from 'react';
import PaymentClient from './PaymentClient';

export default function PaymentPage({ params }: { params: { tier: string } }) {
  const tier = params?.tier === 'lifetime' ? 'lifetime' : 'monthly';
  return (
    <Suspense fallback={<Loading />}>
      <PaymentClient tier={tier} />
    </Suspense>
  );
}
```

**Solution 2 — Client Suspense**:
```tsx
// In client component's parent layout/page
import { Suspense } from 'react';
export default function Layout({ children }) {
  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>;
}
```

## `next.config.js` Known Issues

### `swcMinify` Removed in Next.js 16
```js
// WRONG — causes warning: Unrecognized key 'swcMinify'
const nextConfig = {
  swcMinify: true, // ❌ Remove this
};

// CORRECT
const nextConfig = {
  // Default behavior: SWC minification enabled in production
};
```

### Turbopack Worker Crashes (Windows)
When Turbopack workers crash with `node process exited before we could connect to it with exit code: 0xc0000142`, the dev server becomes unresponsive.

**Symptoms**:
- HTTP 500 on page requests
- `Jest worker encountered N child process exceptions, exceeding retry limit`
- `"creating new process" / "node process exited before we could connect"`

**Workarounds**:
```bash
# 1. Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" pnpm run dev

# 2. Use production server (no Turbopack)
pnpm run build && pnpm run start

# 3. Kill and restart (port cleanup)
# Windows: wait for TIME_WAIT connections to clear, then restart
```

**Note**: This is a known Next.js 16 Turbopack issue on Windows under memory pressure. It does NOT affect:
- `pnpm run build` (production build)
- `pnpm run test` / `pnpm exec vitest run`
- `pnpm run start` (production server)

## Build Verification Always Works

Even when the dev server crashes, always verify with:
```bash
pnpm run build   # ✅ Verifies TypeScript, compilation, routes
pnpm exec vitest run  # ✅ 207/207 tests
```

## Phantom Wallet Integration Pattern

```tsx
// Type declaration for window.solana
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      publicKey?: { toString(): string; toBase58(): string };
      connect(): Promise<void>;
      signAndSendTransaction(tx: unknown): Promise<{ signature: string }>;
    };
  }
}

// Check on mount
useEffect(() => {
  const phantom = window.solana;
  if (phantom?.isPhantom && phantom.publicKey) {
    setWalletConnected(true);
  }
}, []);

// Connect
await phantom.connect();

// Sign and send
const { signature } = await phantom.signAndSendTransaction(transaction);
```

## Solana RPC Payment Verification

```typescript
import { Connection } from '@solana/web3.js';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

async function verifyPayment(signature: string) {
  const connection = new Connection(SOLANA_RPC);
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'finalized',
  });
  
  if (!tx || tx.meta?.err) {
    throw new Error('Transaction failed');
  }
  
  // Extract transfer details from parsed instruction
  // Validate recipient, amount, etc.
}
```

## Key Files in OSIRIS

| File | Purpose |
|-------|---------|
| `src/app/select-tier/[tier]/page.tsx` | Server component — route params → Suspense → PaymentClient |
| `src/app/select-tier/[tier]/PaymentClient.tsx` | Client — Phantom wallet + SOL transfer |
| `src/app/select-tier/page.tsx` | Tier selection (Monthly/Lifetime cards) |
| `src/components/landing/SmartCta.tsx` | Auth-aware CTA: "Start trading" vs "Open terminal" |
| `src/app/api/payments/verify/route.ts` | Backend verification endpoint |
| `src/lib/payments.ts` | `verifyPayment()` — RPC call + validation |
| `src/contexts/TierContext.tsx` | User/subscription state from `/api/me` |
| `src/lib/session.ts` | HMAC-SHA256 Telegram auth |
