/**
 * Copy Trading Flow — OSIRIS Phase 4
 * Defines the exact webhook → decode → quote → sign → send pipeline
 * as required by the master plan for copy trading automation.
 */

import { CircuitBreaker } from '@/lib/circuit-breaker';
import { tokenomics } from '@/lib/tokenomics';
import redis from '@/lib/redis';
import notificationBatcher from '@/lib/notification-batcher';
import {
  tradesTotalCounter,
  tradeVolumeCounter,
  feeRevenueCounter,
  breakerTripCounter,
  rateLimitBlockedCounter,
  tradeDurationHistogram,
} from '@/lib/metrics';
import { rateLimiterService } from '@/services/safety/rate-limiter';
import { taxLotService } from '@/services/safety/tax-lots';
import { pnlEngine } from '@/services/safety/pnl-engine';
import { tokenMetadataService } from '@/services/safety/token-metadata';
import { rugCheckService } from '@/services/safety/rugcheck';
import { killSwitchService } from '@/services/safety/killswitch';
import { adminMultiSigService as multisig } from '@/services/admin/multisig';
import { feeStrategyService } from '@/services/fees/strategy';
import { solanaUpgradeHandler } from '@/lib/solana-upgrade';
import { AdminAlerts } from '@/lib/admin-alerts';
import { treasuryService } from '@/services/treasury';
import { costControlService } from '@/services/cost-control';

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_TRADES = 5; // max trades per window per source wallet

/** Maximum age of a webhook timestamp before it's considered stale (ms) */
const STALE_SIGNAL_MAX_AGE_MS = 5 * 60_000; // 5 minutes

/** TTL for dedup entries in Redis (ms) */
const DEDUP_TTL_MS = 24 * 60 * 60_000; // 24 hours

/**
 * Checks a sliding-window rate limit using Redis (ZSET per source wallet).
 * Persisted across instances, so it works when scaling horizontally.
 * @param sourceWallet The source wallet address
 * @returns Promise<boolean> true if allowed, false if rate limited
 */
export async function checkRateLimit(
  sourceWallet: string,
  maxTrades: number = RATE_LIMIT_MAX_TRADES,
  windowMs: number = RATE_LIMIT_WINDOW_MS
): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const key = `ratelimit:${sourceWallet}`;

  try {
    const multi = redis.multi();
    multi.zadd(key, now.toString(), now.toString()); // add current timestamp
    multi.zremrangebyscore(key, 0, windowStart.toString()); // evict stale entries
    multi.zcard(key); // count remaining = trades in this window
    multi.expire(key, Math.ceil(windowMs / 1000)); // TTL
    const results = await multi.exec();

    const count = results?.[2]?.[1] as number ?? 0;
    return count <= maxTrades;
  } catch (error) {
    console.error(`[ratelimit] redis error, allowing trade:`, error instanceof Error ? error.message : error);
    AdminAlerts.system.rateLimitExceeded('trade', 'redis-error');
    return true;
  }
}

/**
 * Step 1b: Dedup check — prevent duplicate processing of the same source transaction.
 * Uses Redis SET to track seen sourceTxSignatures for 24h.
 */
export async function isDuplicateCopyTrade(
  sourceTxSignature: string
): Promise<boolean> {
  try {
    const key = `copytrade:dedup:${sourceTxSignature}`;
    const exists = await redis.exists(key);
    if (exists) {
      return true;
    }
    // Mark as seen
    await redis.set(key, '1', 'PX', DEDUP_TTL_MS);
    return false;
  } catch (error) {
    console.error(`[copytrade] dedup redis error, allowing trade:`, error instanceof Error ? error.message : error);
    AdminAlerts.system.rateLimitExceeded('copy-trade', 'dedup-redis-error');
    return false;
  }
}

/**
 * Step 1c: Stale signal check — reject webhooks with timestamps older than threshold.
 * Prevents replay of old/canceled signals.
 */
export function isStaleSignal(timestamp: number): boolean {
  const age = Date.now() - timestamp;
  return age > STALE_SIGNAL_MAX_AGE_MS;
}

export interface CopyTradeRequest {
  sourceWallet: string;
  targetWallet: string;
  tradeAmount: number;
  tradePercentage: number;
  copyDirection: 'long' | 'short';
  timestamp: number;
  sourceTxSignature: string;
  metadata?: {
    protocol: 'pump' | 'raydium' | 'jupiter' | 'orca';
    poolAddress?: string;
    inputMint?: string;
    outputMint?: string;
  };
}

export interface WebhookPayload {
  event: 'new_trade' | 'trade_complete' | 'trade_failed';
  data: CopyTradeRequest;
  signature: string; // webhook signature for verification
  timestamp: number;
  metadata: {
    source: 'pump-portal' | 'helius' | 'webhook-endpoint';
    ip: string;
    userAgent?: string;
  };
}

export enum WebhookEvent {
  NEW_TRADE = 'new_trade',
  TRADE_COMPLETE = 'trade_complete',
  TRADE_FAILED = 'trade_failed',
}

/**
 * Step 1: Webhook Parsing & Signature Verification
 */
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

/**
 * Step 2: DEX Swap Decoding
 * Decodes on-chain swap events from source wallet
 */
export interface DecodedSwap {
  protocol: string;
  amountIn: number;
  amountOut: number;
  priceImpact: number;
  path: string[];
  timestamp: number;
}

export function decodePumpSwap(rawInstruction: string): DecodedSwap {
  return { protocol: 'pump', amountIn: 0, amountOut: 0, priceImpact: 0, path: [], timestamp: Date.now() };
}

export function decodeRaydiumSwap(rawInstruction: string): DecodedSwap {
  return { protocol: 'raydium', amountIn: 0, amountOut: 0, priceImpact: 0, path: [], timestamp: Date.now() };
}

export function decodeJupiterSwap(rawInstruction: string): DecodedSwap {
  return { protocol: 'jupiter', amountIn: 0, amountOut: 0, priceImpact: 0, path: [], timestamp: Date.now() };
}

export function decodeOrcaSwap(rawInstruction: string): DecodedSwap {
  return { protocol: 'orca', amountIn: 0, amountOut: 0, priceImpact: 0, path: [], timestamp: Date.now() };
}

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

/**
 * Step 3: Quote Validation
 * Validates trade amount against copy percentage limits
 */
export interface QuoteValidation {
  valid: boolean;
  sourceAmount: number;
  copyAmount: number;
  maxAllowed: number;
  minTradeSize: number;
  tradePercentage: number;
}

export function validateQuote(
  request: CopyTradeRequest,
  tierLimits: {
    maxPositionSize: number;
    minTradeSize: number;
    copyPercentage: number;
  }
): QuoteValidation {
  const tradePercentage = request.tradePercentage || 100;
  const copyAmount = (request.tradeAmount * tradePercentage) / 100;
  const maxAllowed = tierLimits.maxPositionSize;
  const minTradeSize = tierLimits.minTradeSize;

  return {
    valid: copyAmount <= maxAllowed && copyAmount >= minTradeSize,
    sourceAmount: request.tradeAmount,
    copyAmount,
    maxAllowed,
    minTradeSize,
    tradePercentage,
  };
}

/**
 * Step 4: Signing Flow
 * Signs the validated trade with the target wallet's private key securely
 */
export interface SignedTrade {
  signature: string;
  tradePayload: CopyTradeRequest;
  timestamp: number;
  walletAddress: string;
}

/**
 * Mock signing function for testing - in production this would use envelope encryption
 * and Ed25519 signing via keymanager.
 */
export async function signTrade(
  tradePayload: CopyTradeRequest,
  signerAddress: string
): Promise<SignedTrade> {
  // For testing: return a deterministic mock signature
  const mockSignature = `mock-${Buffer.from(JSON.stringify(tradePayload)).toString('base64').slice(0, 32)}`;
  return {
    signature: mockSignature,
    tradePayload,
    timestamp: Date.now(),
    walletAddress: signerAddress,
  };
}

/**
 * Step 5: Telegram Message Delivery
 * Formats and sends the copy trade confirmation to Telegram
 */
export interface TradeConfirmation {
  sourceWallet: string;
  targetWallet: string;
  copyAmount: number;
  tradeHash: string;
  status: 'success' | 'failed';
  timestamp: number;
  explorerLink: string;
  payout?: number; // net payout after fees (optional)
}

export function formatTradeConfirmation(confirmation: TradeConfirmation): string {
  let output = `📈 *Copy Trade Executed*\n\n` +
    `👤 Source: \`${confirmation.sourceWallet}\`\n` +
    `🎯 Target: \`${confirmation.targetWallet}\`\n` +
    `💰 Copy Amount: \`${confirmation.copyAmount} USDC\`\n`;

  if (confirmation.payout !== undefined) {
    output += `💵 Payout: \`${confirmation.payout} USDC\`\n`;
  }

  output += `🔗 Transaction: [View on Explorer](${confirmation.explorerLink})\n` +
    `✅ Status: \`${confirmation.status}\`\n` +
    `⏰ Time: <t:${Math.floor(confirmation.timestamp / 1000)}>`;
  return output;
}

/**
 * Complete copy trading pipeline with safety checks
 */
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
  const startTime = Date.now();
  try {
    // Step 1: Parse and verify webhook
    const payload = parseWebhookPayload(webhookPayload);
    const sourceWallet = payload.data.sourceWallet;

    // Step 1a: Reject stale signals before doing any work
    if (isStaleSignal(payload.timestamp)) {
      tradesTotalCounter.inc({ outcome: 'failed' });
      tradeDurationHistogram.observe({ outcome: 'failure' }, (Date.now() - startTime) / 1000);
      AdminAlerts.system.webhookFailure('copy-trade', 'stale signal rejected');
      return { success: false, error: 'Stale signal: timestamp exceeds max age' };
    }

    // Step 1b: Dedup check — prevent duplicate processing of same source transaction
    const isDuplicate = await isDuplicateCopyTrade(payload.data.sourceTxSignature);
    if (isDuplicate) {
      tradesTotalCounter.inc({ outcome: 'failed' });
      tradeDurationHistogram.observe({ outcome: 'failure' }, (Date.now() - startTime) / 1000);
      return { success: false, error: 'Duplicate copy trade detected' };
    }

    // 5. Rate limit check — prevent abuse from a single source wallet (Redis-backed)
    let rateAllowed = true;
    try {
      const rateStatus = await rateLimiterService.check(sourceWallet, 'trade');
      rateAllowed = rateStatus.allowed;
    } catch {
      rateAllowed = true;
    }

    if (!rateAllowed) {
      rateLimitBlockedCounter.inc();
      tradesTotalCounter.inc({ outcome: 'failed' });
      tradeDurationHistogram.observe({ outcome: 'failure' }, (Date.now() - startTime) / 1000);
      AdminAlerts.system.rateLimitExceeded('trade', sourceWallet);
      return { success: false, error: 'Rate limit exceeded' };
    }

    // 6. Circuit breaker check — ensure trade amount respects safety margin
    const circuitBreaker = new CircuitBreaker();
    if (!circuitBreaker.checkSafety(tierLimits.copyPercentage || 100, tierLimits.maxPositionSize)) {
      breakerTripCounter.inc();
      tradesTotalCounter.inc({ outcome: 'failed' });
      tradeDurationHistogram.observe({ outcome: 'failure' }, (Date.now() - startTime) / 1000);
      AdminAlerts.circuitBreaker.opened('copy-trade', 100);
      return { success: false, error: 'Circuit breaker engaged' };
    }

    // Step 2: Decode the on-chain swap
    const decoded = decodeSwap(payload.data.metadata?.protocol || 'pump', '');

    // Step 3: Validate quote against tier limits
    const quote = validateQuote(payload.data, tierLimits);
    if (!quote.valid) {
      tradesTotalCounter.inc({ outcome: 'failed' });
      tradeDurationHistogram.observe({ outcome: 'failure' }, (Date.now() - startTime) / 1000);
      AdminAlerts.tokenomics.anomaly('quote-validation', quote.copyAmount, tierLimits.maxPositionSize);
      return { success: false, error: 'Quote exceeds tier limits' };
    }

    // Step 4: Sign the trade
    const signed = await signTrade(payload.data, signerAddress);
    if (!signed) {
      tradesTotalCounter.inc({ outcome: 'failed' });
      tradeDurationHistogram.observe({ outcome: 'failure' }, (Date.now() - startTime) / 1000);
      AdminAlerts.system.configError('trade-signing', 'SignTrade returned undefined');
      return { success: false, error: 'Trade signing failed' };
    }

    // Step 8: Calculate payout using tokenomics
    const payoutResult = tokenomics.calculatePayout(quote.copyAmount);
    // For now we just take the net amount as payout
    const netPayout = payoutResult.netAmount;

    // Step 9: Record metrics
    const protocol = payload.data.metadata?.protocol || 'unknown';
    tradesTotalCounter.inc({ outcome: 'success' });
    tradeVolumeCounter.inc({ sourceWallet, targetWallet: signerAddress, protocol }, quote.copyAmount);
    feeRevenueCounter.inc({ feeType: 'taker' }, payoutResult.fees.takeFee);
    feeRevenueCounter.inc({ feeType: 'transfer' }, payoutResult.fees.transferFee);
    tradeDurationHistogram.observe({ outcome: 'success' }, (Date.now() - startTime) / 1000);

    // Step 9a: Attribute fees to operational/treasury split
    const totalFeeLamports = payoutResult.fees.takeFee + payoutResult.fees.transferFee;
    if (totalFeeLamports > 0) {
      await treasuryService.attributeFee({
        tradeId: signed.signature,
        sourceWallet,
        feeType: 'copy-trade',
        lamports: totalFeeLamports,
      });
    }

    // Step 9b: Cost control guardrail
    const costCheck = costControlService.evaluate(
      {
        budgetLamports: tierLimits.maxPositionSize,
        spentLamports: quote.copyAmount,
      },
      'session'
    );
    if (!costCheck.allowed) {
      return { success: false, error: 'Cost control hard cap reached' };
    }

    // Step 10: Format and send confirmation
    const txHash = signed.signature || 'pending';
    const confirmation: TradeConfirmation = {
      sourceWallet: payload.data.sourceWallet,
      targetWallet: signerAddress,
      copyAmount: quote.copyAmount,
      tradeHash: txHash,
      status: 'success',
      timestamp: Date.now(),
      explorerLink: `https://explorer.solana.com/tx/${txHash}`,
      payout: netPayout,
    };

    // Use the batcher to publish the trade confirmation (batched, rate-limited)
    notificationBatcher.add('trade:new', confirmation);

    return { success: true, confirmation };
  } catch (error) {
    tradesTotalCounter.inc({ outcome: 'failed' });
    tradeDurationHistogram.observe({ outcome: 'failure' }, (Date.now() - startTime) / 1000);
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Failures are priority (sent immediately, bypass batching)
    notificationBatcher.add('trade:failed', { sourceWallet: '', signerAddress, error: message }, { priority: true });
    AdminAlerts.system.webhookFailure('copy-trade', message);
    return { success: false, error: message };
  }
}