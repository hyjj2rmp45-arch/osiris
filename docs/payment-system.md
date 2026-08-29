## OSIRIS Payment System — Design & Implementation Decisions

### Overview
OSIRIS uses a Solana-native payment system where users pay subscription fees in SOL to the project's Phantom wallet address. After payment confirmation on-chain, access is automatically granted.

### Payment Flow
1. User selects a tier (Monthly 0.3 SOL / Lifetime 1.0 SOL) from `/select-tier`
2. Redirected to payment page (`/select-tier/[tier]`)
3. User connects Phantom wallet and sends SOL to `5hVZopcd3hRUEQL6p8Hhdk9hBTtaAAWZuEEJm28PxQ56`
4. Backend verifies transaction on Solana RPC (`getTransaction` with `finalized` commitment)
5. Once confirmed, subscription tier is recorded in PostgreSQL and access is granted

### Technical Implementation

#### Smart CTA System (`src/components/landing/SmartCta.tsx`)
- **Not authenticated / loading**: Shows "Start trading" → `/select-tier?tier=monthly` with "authenticating..." pulse text
- **Authenticated without subscription**: Shows "Start trading" → `/select-tier?tier=monthly`
- **Authenticated with active subscription**: Shows "Open terminal" → `/dashboard`
- **Hydration-safe**: Uses `useEffect` + `mounted` state to avoid SSR mismatch

#### Payment Page (`src/app/select-tier/[tier]/PaymentClient.tsx`)
- **Wallet connection**: Connects to Phantom via `window.solana` provider
- **Payment execution**: Uses `@solana/web3.js` `SystemProgram.transfer` to send SOL to treasury address
- **Transaction signing**: `phantom.signAndSendTransaction()` returns signature
- **Payment verification**: POST to `/api/payments/verify` which calls `verifyPayment()` from `src/lib/payments.ts`
- **Auto-grant access**: After verification, calls `setTier()` and redirects to `/dashboard` with 2s delay
- **States**: Loading → Connect wallet → Processing → Payment sent → Access granted

#### On-Chain Verification (`src/lib/payments.ts`)
- Uses `Connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 })` with `finalized` commitment
- Verifies transaction succeeded (`meta.err === null`)
- Checks recipient address matches `PHANTOM_SOL_ADDRESS` or `PHANTOM_USDC_ADDRESS`
- Checks amount matches expected tier amount
- **Best practice per Solana docs**: Wait for `confirmed` (1-2s) or `finalized` (~13s) commitment, never trust frontend confirmations

#### API Endpoint (`src/app/api/payments/verify/route.ts`)
- Server-side verification with `verifyPayment()` from `lib/payments.ts`
- Checks `fromAddress` matches authenticated user's registered wallet
- Checks `toAddress` matches treasury address
- Prevents double-fulfillment by checking `existingPayment.signature`
- Records payment in PostgreSQL `payments` table
- Updates user's `users` tier, `currentPeriodStart`, `currentPeriodEnd` atomically in transaction
- Logs audit event via `logAuditEvent()`

#### Polling Fallback (`src/lib/payments.ts` — `pollRecentPayments`)
- Uses `connection.getSignaturesForAddress(recipient, { limit })` 
- Checks `preTokenBalances`/`postTokenBalances` for USDC transfers
- Useful as fallback when Helius webhook is unavailable

### Database Schema (`src/lib/schema.ts` — `payments` table)
```
payments table:
- id (serial, PK)
- userId (FK → users.id)
- tier ('monthly' | 'lifetime')
- token ('SOL' | 'USDC')
- amount (integer, native units)
- signature (string, unique)
- fromAddress (string)
- toAddress (string)
- status ('pending' | 'confirmed' | 'failed')
- blockTime (timestamp)
- slot (integer)
- error (string)
- metadata (jsonb)
- createdAt / updatedAt (timestamps)
```

### Security Considerations
1. **Never trust frontend confirmation** — always verify server-side via RPC
2. **Wait for `confirmed` or `finalized`** commitment — never act on `processed`
3. **Verify recipient address** — ensure payment went to correct treasury address
4. **Check fromAddress** — ensure payment came from authenticated user's wallet
5. **Verify mint address** for USDC — prevent fake token attacks
6. **Prevent double fulfillment** — track processed signatures
7. **Rate limiting** on verification endpoint to prevent spam
8. **Wallet mismatch detection** — reject payments from unauthorized wallets

### Future Enhancements
- **USDC payment support** — add `transferChecked` verification for USDC payments
- **Signature subscription** — use RPC websockets for real-time payment detection instead of polling
- **Session tokens** — auto-generate session tokens after payment verification
- **Auto-renewal** — track subscription expiry and prompt renewal
- **Payment history** — show user's payment history with status indicators