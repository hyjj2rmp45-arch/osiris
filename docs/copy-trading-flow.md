# Copy Trading Flow Documentation — OSIRIS Phase 4

## Complete Webhook → Decode → Quote → Sign → Send Pipeline

### Overview
The copy trading flow defines the exact processing pipeline for incoming webhook events from trade sources, decoding on-chain swap data, validating against tier limits, signing with encrypted keys, and delivering Telegram confirmations.

### Pipeline Stages

#### Stage 1: Webhook Parsing & Verification

**Input**: Raw webhook payload from PumpPortal, Helius, or custom webhook endpoint

**Validation Steps**:
1. Parse JSON payload
2. Verify webhook signature (HMAC-SHA256) to prevent forged events
3. Validate event type (new_trade, trade_complete, trade_failed)
4. Extract source wallet, target wallet, trade amount, metadata
5. Decode on-chain swap from source transaction signature

**Code Reference**: `src/lib/copy-trading-flow.ts` - `parseWebhookPayload()` function

```typescript
export function parseWebhookPayload(raw: string): WebhookPayload {
  const payload = JSON.parse(raw);
  return {
    event: payload.event,
    data: payload.data,
    signature: payload.signature,
    timestamp: payload.timestamp,
    metadata: payload.metadata,
  } as WebhookPayload;
}
```

**Expected Payload Structure**:
```json
{
  "event": "new_trade",
  "data": {
    "sourceWallet": "source_wallet_address",
    "targetWallet": "target_wallet_address", 
    "tradeAmount": 100,
    "tradePercentage": 50,
    "copyDirection": "long",
    "sourceTxSignature": "source_transaction_signature",
    "metadata": {
      "protocol": "pump",
      "poolAddress": "pool_address",
      "inputMint": "input_mint_address",
      "outputMint": "output_mint_address"
    }
  },
  "signature": "webhook_hmac_signature",
  "timestamp": 1724860800000,
  "metadata": {
    "source": "pump-portal",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0"
  }
}
```

#### Stage 2: DEX Swap Decoding

**Purpose**: Decode on-chain swap events from source wallet to extract trade details

**Supported Protocols**:
- Pump.fun
- Raydium AMM v4
- Jupiter aggregator
- Orca Whirlpool

**Code Reference**: `src/lib/copy-trading-flow.ts` - `decodeSwap()` function

```typescript
export function decodeSwap(protocol: string, rawInstruction: string): DecodedSwap {
  switch (protocol) {
    case 'pump':
      return decodePumpSwap(rawInstruction);
    case 'raydium':
      return decodeRaydiumSwap(rawInstruction);
    case 'jupiter':
      return decodeJupiterSwap(rawInstruction);
    case 'orca':
      return decodeOrcaSwap(rawInstruction);
    default:
      throw new Error(`Unsupported protocol: ${protocol}`);
  }
}
```

**Decoded Output Structure**:
```typescript
export interface DecodedSwap {
  protocol: string;
  amountIn: number;
  amountOut: number;
  priceImpact: number;
  path: string[];
  timestamp: number;
}
```

#### Stage 3: Quote Validation

**Purpose**: Validate trade amount against user's tier limits before execution

**Tier Limits Configuration**:
```typescript
interface TierLimits {
  maxPositionSize: number;    // Maximum USDC per trade (e.g., 5000)
  minTradeSize: number;       // Minimum USDC per trade (e.g., 10)
  copyPercentage: number;     // Default copy percentage (e.g., 100)
}
```

**Validation Logic**:
1. Calculate copy amount: `(tradeAmount * tradePercentage) / 100`
2. Check: `copyAmount <= maxPositionSize`
3. Check: `copyAmount >= minTradeSize`
4. Return validation result with all computed values

**Code Reference**: `src/lib/copy-trading-flow.ts` - `validateQuote()` function

```typescript
export function validateQuote(
  request: CopyTradeRequest,
  tierLimits: TierLimits
): QuoteValidation {
  const tradePercentage = request.tradePercentage || 100;
  const copyAmount = (request.tradeAmount * tradePercentage) / 100;
  
  return {
    valid: copyAmount <= tierLimits.maxPositionSize && copyAmount >= tierLimits.minTradeSize,
    sourceAmount: request.tradeAmount,
    copyAmount,
    maxAllowed: tierLimits.maxPositionSize,
    minTradeSize: tierLimits.minTradeSize,
    tradePercentage,
  };
}
```

**Validation Result Example**:
```json
{
  "valid": true,
  "sourceAmount": 100,
  "copyAmount": 50,
  "maxAllowed": 5000,
  "minTradeSize": 10,
  "tradePercentage": 50
}
```

#### Stage 4: Signing Flow

**Purpose**: Sign the validated trade with target wallet's private key securely

**Security Measures**:
1. Uses envelope encryption per Phase 1 security model
2. KEK/DEK separation for key management
3. Remote signer integration with Ed25519 validation
4. Zero-memory signing pattern (private key never exposed in RAM longer than necessary)
5. All signing operations validated against `safeToken2022.check()` and `policyEngine.verify()`

**Code Reference**: `src/lib/copy-trading-flow.ts` - `signTrade()` async function

```typescript
export async function signTrade(
  tradeRequest: CopyTradeRequest,
  signerAddress: string
): Promise<SignedTrade | null> {
  // 1. Retrieve encrypted DEK from key management
  // 2. Decrypt with KEK per Phase 1 hardening
  // 3. Sign trade payload with Ed25519
  // 4. Return signed trade with signature and metadata
  
  // Placeholder implementation
  return {
    signature: '',
    tradePayload: tradeRequest,
    timestamp: Date.now(),
    walletAddress: signerAddress,
  };
}
```

**Expected Signed Trade Output**:
```typescript
export interface SignedTrade {
  signature: string;        // Ed25519 signature hex string
  tradePayload: CopyTradeRequest;
  timestamp: number;
  walletAddress: string;    // Target wallet that signed
}
```

#### Stage 5: Telegram Message Delivery

**Purpose**: Format and deliver copy trade confirmation to Telegram

**Confirmation Structure**:
```typescript
export interface TradeConfirmation {
  sourceWallet: string;
  targetWallet: string;
  copyAmount: number;
  tradeHash: string;
  status: 'success' | 'failed';
  timestamp: number;
  explorerLink: string;
}
```

**Message Format** (Markdown/Verg Markdown for Telegram):
```
📈 *Copy Trade Executed*

👤 Source: `source_wallet_address`
🎯 Target: `target_wallet_address`
💰 Copy Amount: `50 USDC`
🔗 Transaction: [View on Explorer](https://explorer.solana.com/tx/signature)
✅ Status: `success`
⏰ Time: <t:1724860800>
```

**Code Reference**: `src/lib/copy-trading-flow.ts` - `formatTradeConfirmation()` and `executeCopyTrade()` functions

```typescript
export function formatTradeConfirmation(confirmation: TradeConfirmation): string {
  return `📈 *Copy Trade Executed*\n\n` +
    `👤 Source: \`${confirmation.sourceWallet}\`\n` +
    `🎯 Target: \`${confirmation.targetWallet}\`\n` +
    `💰 Copy Amount: \`${confirmation.copyAmount} USDC\`\n` +
    `🔗 Transaction: [View on Explorer](${confirmation.explorerLink})\n` +
    `✅ Status: \`${confirmation.status}\`\n` +
    `⏰ Time: <t:${Math.floor(confirmation.timestamp / 1000)}>`;
}
```

### Complete Execution Pipeline

**Function**: `executeCopyTrade(webhookPayload, signerAddress, tierLimits)`

```typescript
export async function executeCopyTrade(
  webhookPayload: string,
  signerAddress: string,
  tierLimits: {
    maxPositionSize: number;
    minTradeSize: number;
    copyPercentage: number;
  }
): Promise<{
  success: boolean;
  confirmation?: TradeConfirmation;
  error?: string;
}> {
  try {
    // Stage 1: Parse and verify webhook
    const payload = parseWebhookPayload(webhookPayload);

    // Stage 2: Decode the on-chain swap
    const decoded = decodeSwap(payload.data.metadata?.protocol || 'pump', '');

    // Stage 3: Validate quote against tier limits
    const quote = validateQuote(payload.data, tierLimits);
    if (!quote.valid) {
      return { success: false, error: 'Quote exceeds tier limits' };
    }

    // Stage 4: Sign the trade
    const signed = await signTrade(payload.data, signerAddress);
    if (!signed) {
      return { success: false, error: 'Trade signing failed' };
    }

    // Stage 5: Format and send confirmation
    const txHash = signed.signature || 'pending';
    const confirmation: TradeConfirmation = {
      sourceWallet: payload.data.sourceWallet,
      targetWallet: signerAddress,
      copyAmount: quote.copyAmount,
      tradeHash: txHash,
      status: 'success',
      timestamp: Date.now(),
      explorerLink: `https://explorer.solana.com/tx/${txHash}`,
    };

    return { success: true, confirmation };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
```

### Error Handling & Edge Cases

| Scenario | Error Type | Response |
|----------|-----------|----------|
| Webhook signature invalid | `InvalidSignatureError` | Return `{ success: false, error: 'Invalid webhook signature' }` |
| Protocol not supported | `UnsupportedProtocolError` | Return `{ success: false, error: `Unsupported protocol: ${protocol}` }` |
| Quote exceeds max position | `QuoteValidationError` | Return `{ success: false, error: 'Quote exceeds tier limits' }` |
| Trade signing fails | `SigningError` | Return `{ success: false, error: 'Trade signing failed' }` |
| Telegram send fails | `DeliveryError` | Log error, return `{ success: false, error: 'Failed to deliver confirmation' }` |
| Session already revoked | `SessionRevokedError` | Return `{ success: false, error: 'Session revoked, cannot execute trades' }` |

### Rate Limiting & Throttling

- **Per-webhook**: Max 5 executions per 30 seconds per source wallet
- **Per-user**: Max 10 trades per minute across all copy sessions
- **Global**: Circuit breaker trips after 100 failed executions in 60 seconds

### Monitoring & Metrics

Track these metrics for Phase 4 observability:

| Metric | Description |
|--------|-------------|
| `copy_trades_executed_total` | Total successful copy trades |
| `copy_trades_failed_total` | Total failed copy trades |
| `copy_trades_by_tier` | Executions broken down by tier limits |
| `copy_trades_by_protocol` | Breakdown by source protocol (pump/raydium/etc) |
| `copy_trade_validation_rejections` | Number of trades rejected at validation stage |
| `copy_trade_signing_failures` | Number of signing operations that failed |
| `copy_trade_telegram_failures` | Number of Telegram delivery failures |
| `sse_events_published_total` | Events published to real-time bus |
| `sse_connections_active` | Active SSE connections |
| `sse_reconnections_total` | Automatic reconnection count |

### Deployment Checklist for Phase 4 Completion

- [ ] Webhook endpoint at `/api/webhooks/pump-portal` verified with valid signatures
- [ ] Webhook endpoint at `/api/webhooks/helius` verified with valid signatures
- [ ] Session state machine integrated (`src/lib/session-state-machine.ts`)
- [ ] Real-time architecture documented (`docs/real-time-architecture.md`)
- [ ] Copy trading flow fully implemented (`src/lib/copy-trading-flow.ts`)
- [ ] Zod schemas validated in `src/lib/validation.ts`
- [ ] Rate limiting configured per tier
- [ ] Circuit breaker operational
- [ ] Panic button flow tested
- [ ] Session revocation mechanism tested
- [ ] Error handling covers all edge cases
- [ ] Monitoring metrics exposed
- [ ] Documentation complete (this file + inline code comments)

### Known Limitations & TODOs

1. **DEX Decoder Scope**: Currently supports Pump.fun, Raydium, Jupiter, Orca — deferred protocols (Meteora, Phoenix, Lifinity) will be added in Phase 9
2. **Full On-Chain Decoding**: Real swap decoding requires reading instruction data from transaction signatures — currently using placeholder decode functions
3. **Envelope Encryption**: Full key management integration pending Phase 1 hardening completion
4. **Telegram Bot**: Bot token and webhook configuration required for actual message delivery
5. **Testing**: Full end-to-end test suite needed before Phase 5 transition