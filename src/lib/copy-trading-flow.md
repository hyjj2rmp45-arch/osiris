# Copy Trading Flow API

Webhook → decode → quote → sign → send pipeline for OSIRIS copy trading.

## Functions

### `checkRateLimit(sourceWallet, maxTrades?, windowMs?)`
Sliding-window rate limit via Redis ZSET.

- `sourceWallet`: string
- `maxTrades`: number default `5`
- `windowMs`: number default `60000`
- Returns `Promise<boolean>` — `true` if allowed

### `isDuplicateCopyTrade(sourceTxSignature)`
Redis SET dedup with 24h TTL.

- Returns `Promise<boolean>`

### `isStaleSignal(timestamp)`
Rejects webhook timestamps older than 5 minutes.

- Returns `boolean`

### `parseWebhookPayload(raw)`
Parses raw JSON webhook body.

- Returns `WebhookPayload`

### `decodeSwap(protocol, rawInstruction)`
Decodes swap by protocol: `pump`, `raydium`, `jupiter`, `orca`.

- Returns `DecodedSwap`

### `validateQuote(request, tierLimits)`
Validates trade amount vs tier limits.

- Returns `QuoteValidation`

### `signTrade(tradePayload, signerAddress)`
Mock signing flow.

- Returns `Promise<SignedTrade>`

### `formatTradeConfirmation(confirmation)`
Formats Telegram confirmation string.

- Returns `string`

### `executeCopyTrade(webhookPayload, signerAddress, tierLimits)`
Full pipeline: parse → stale check → dedup → rate limit → circuit breaker → decode → quote → sign → fee attribution → cost control → notify.

- Returns `Promise<{ success: boolean; confirmation?: TradeConfirmation; error?: string }>`

## Types

- `CopyTradeRequest`
- `WebhookPayload`
- `DecodedSwap`
- `QuoteValidation`
- `SignedTrade`
- `TradeConfirmation`

## Errors

- `Stale signal: timestamp exceeds max age`
- `Duplicate copy trade detected`
- `Rate limit exceeded`
- `Circuit breaker engaged`
- `Quote exceeds tier limits`
- `Trade signing failed`
- `Cost control hard cap reached`
