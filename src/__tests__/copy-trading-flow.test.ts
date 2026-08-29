import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkRateLimit,
  isDuplicateCopyTrade,
  isStaleSignal,
  parseWebhookPayload,
  decodeSwap,
  validateQuote,
  signTrade,
  formatTradeConfirmation,
  executeCopyTrade,
} from '@/lib/copy-trading-flow';

// Mock redis — factory must be self-contained because vitest hoists vi.mock
vi.mock('@/lib/redis', () => ({
  default: {
    multi: vi.fn(() => ({
      zadd: vi.fn().mockReturnThis(),
      zremrangebyscore: vi.fn().mockReturnThis(),
      zcard: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([null, null, 0, null]),
    })),
    exists: vi.fn().mockResolvedValue(0),
    set: vi.fn().mockResolvedValue('OK'),
  },
}));

// Mock AdminAlerts
vi.mock('@/lib/admin-alerts', () => ({
  AdminAlerts: {
    system: {
      rateLimitExceeded: vi.fn(),
      webhookFailure: vi.fn(),
      configError: vi.fn(),
    },
    tokenomics: {
      anomaly: vi.fn(),
    },
    circuitBreaker: {
      opened: vi.fn(),
    },
  },
}));

// Mock metrics
vi.mock('@/lib/metrics', () => ({
  tradesTotalCounter: { inc: vi.fn() },
  tradeVolumeCounter: { inc: vi.fn() },
  feeRevenueCounter: { inc: vi.fn() },
  breakerTripCounter: { inc: vi.fn() },
  rateLimitBlockedCounter: { inc: vi.fn() },
  tradeDurationHistogram: { observe: vi.fn() },
}));

// Mock rateLimiterService
vi.mock('@/services/safety/rate-limiter', () => ({
  rateLimiterService: {
    check: vi.fn().mockResolvedValue({ allowed: true }),
  },
}));

// Mock CircuitBreaker as a real class so `new CircuitBreaker()` works
vi.mock('@/lib/circuit-breaker', () => ({
  CircuitBreaker: class {
    checkSafety = vi.fn().mockReturnValue(true);
  },
}));

// Mock tokenomics
vi.mock('@/lib/tokenomics', () => ({
  tokenomics: {
    calculatePayout: vi.fn().mockReturnValue({
      fees: { takeFee: 0.01, transferFee: 0.01 },
      netAmount: 99.98,
    }),
  },
}));

// Mock notificationBatcher
vi.mock('@/lib/notification-batcher', () => ({
  default: {
    add: vi.fn(),
  },
}));

// Mock treasury service
vi.mock('@/services/treasury', () => ({
  treasuryService: {
    attributeFee: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock cost control service
vi.mock('@/services/cost-control', () => ({
  costControlService: {
    evaluate: vi.fn().mockReturnValue({ allowed: true, fraction: 0.5, threshold: 'normal' }),
  },
}));

describe('copy-trading-flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isStaleSignal', () => {
    it('should return false for recent timestamps', () => {
      const now = Date.now();
      expect(isStaleSignal(now)).toBe(false);
      expect(isStaleSignal(now - 1000)).toBe(false);
      expect(isStaleSignal(now - 60_000)).toBe(false);
    });

    it('should return true for timestamps older than 5 minutes', () => {
      const now = Date.now();
      expect(isStaleSignal(now - 5 * 60_000 - 1)).toBe(true);
      expect(isStaleSignal(now - 10 * 60_000)).toBe(true);
      expect(isStaleSignal(now - 60 * 60_000)).toBe(true);
    });

    it('should return false for timestamps in the future', () => {
      const now = Date.now();
      expect(isStaleSignal(now + 6 * 60_000)).toBe(false);
    });
  });

  describe('isDuplicateCopyTrade', () => {
    it('should return false for new sourceTxSignature', async () => {
      const result = await isDuplicateCopyTrade('new-signature-123');
      expect(result).toBe(false);
    });

    it('should return true for duplicate sourceTxSignature', async () => {
      const redis = await import('@/lib/redis');
      (redis.default.exists as any).mockResolvedValueOnce(1);

      const result = await isDuplicateCopyTrade('duplicate-signature-456');
      expect(result).toBe(true);
    });

    it('should return false on redis error (fail open)', async () => {
      const redis = await import('@/lib/redis');
      (redis.default.exists as any).mockRejectedValueOnce(new Error('Redis down'));

      const result = await isDuplicateCopyTrade('error-signature-789');
      expect(result).toBe(false);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow trade when under limit', async () => {
      const result = await checkRateLimit('test-wallet-1');
      expect(result).toBe(true);
    });

    it('should block trade when over limit', async () => {
      const redis = await import('@/lib/redis');
      (redis.default.multi as any).mockReturnValueOnce({
        zadd: vi.fn().mockReturnThis(),
        zremrangebyscore: vi.fn().mockReturnThis(),
        zcard: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([null, null, [null, 6], null]),
      });

      const result = await checkRateLimit('test-wallet-2', 5, 60_000);
      expect(result).toBe(false);
    });

    it('should allow trade on redis error (fail open)', async () => {
      const redis = await import('@/lib/redis');
      (redis.default.multi as any).mockImplementationOnce(() => {
        throw new Error('Redis connection failed');
      });

      const result = await checkRateLimit('test-wallet-3');
      expect(result).toBe(true);
    });
  });

  describe('parseWebhookPayload', () => {
    it('should parse valid webhook payload', () => {
      const raw = JSON.stringify({
        event: 'new_trade',
        data: {
          sourceWallet: 'wallet1',
          targetWallet: 'wallet2',
          tradeAmount: 100,
          tradePercentage: 50,
          sourceTxSignature: 'sig123',
        },
        signature: 'sig',
        timestamp: Date.now(),
        metadata: {
          source: 'pump-portal',
          ip: '1.2.3.4',
        },
      });

      const result = parseWebhookPayload(raw);
      expect(result.event).toBe('new_trade');
      expect(result.data.sourceWallet).toBe('wallet1');
      expect(result.signature).toBe('sig');
    });
  });

  describe('decodeSwap', () => {
    it('should decode pump swap', () => {
      const result = decodeSwap('pump', 'raw-instruction');
      expect(result.protocol).toBe('pump');
      expect(result.timestamp).toBeDefined();
    });

    it('should decode raydium swap', () => {
      const result = decodeSwap('raydium', 'raw-instruction');
      expect(result.protocol).toBe('raydium');
    });

    it('should decode jupiter swap', () => {
      const result = decodeSwap('jupiter', 'raw-instruction');
      expect(result.protocol).toBe('jupiter');
    });

    it('should decode orca swap', () => {
      const result = decodeSwap('orca', 'raw-instruction');
      expect(result.protocol).toBe('orca');
    });

    it('should throw for unsupported protocol', () => {
      expect(() => decodeSwap('unsupported', 'raw')).toThrow('Unsupported protocol: unsupported');
    });
  });

  describe('validateQuote', () => {
    const tierLimits = {
      maxPositionSize: 1000,
      minTradeSize: 10,
      copyPercentage: 100,
    };

    it('should validate quote within limits', () => {
      const request = {
        sourceWallet: 'wallet1',
        targetWallet: 'wallet2',
        tradeAmount: 100,
        tradePercentage: 50,
        sourceTxSignature: 'sig',
      };

      const result = validateQuote(request, tierLimits);
      expect(result.valid).toBe(true);
      expect(result.copyAmount).toBe(50);
    });

    it('should reject quote exceeding max position size', () => {
      const request = {
        sourceWallet: 'wallet1',
        targetWallet: 'wallet2',
        tradeAmount: 2000,
        tradePercentage: 100,
        sourceTxSignature: 'sig',
      };

      const result = validateQuote(request, tierLimits);
      expect(result.valid).toBe(false);
    });

    it('should reject quote below min trade size', () => {
      const request = {
        sourceWallet: 'wallet1',
        targetWallet: 'wallet2',
        tradeAmount: 5,
        tradePercentage: 100,
        sourceTxSignature: 'sig',
      };

      const result = validateQuote(request, tierLimits);
      expect(result.valid).toBe(false);
    });
  });

  describe('signTrade', () => {
    it('should return a mock signature', async () => {
      const tradePayload = {
        sourceWallet: 'wallet1',
        targetWallet: 'wallet2',
        tradeAmount: 100,
        tradePercentage: 50,
        sourceTxSignature: 'sig',
      };

      const result = await signTrade(tradePayload, 'signer-address');
      expect(result.signature).toContain('mock-');
      expect(result.walletAddress).toBe('signer-address');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('formatTradeConfirmation', () => {
    it('should format confirmation with payout', () => {
      const confirmation = {
        sourceWallet: 'wallet1',
        targetWallet: 'wallet2',
        copyAmount: 50,
        tradeHash: 'tx123',
        status: 'success' as const,
        timestamp: Date.now(),
        explorerLink: 'https://explorer.solana.com/tx/tx123',
        payout: 49.5,
      };

      const formatted = formatTradeConfirmation(confirmation);
      expect(formatted).toContain('Copy Trade Executed');
      expect(formatted).toContain('wallet1');
      expect(formatted).toContain('wallet2');
      expect(formatted).toContain('49.5');
    });

    it('should format confirmation without payout', () => {
      const confirmation = {
        sourceWallet: 'wallet1',
        targetWallet: 'wallet2',
        copyAmount: 50,
        tradeHash: 'tx123',
        status: 'success' as const,
        timestamp: Date.now(),
        explorerLink: 'https://explorer.solana.com/tx/tx123',
      };

      const formatted = formatTradeConfirmation(confirmation);
      expect(formatted).toContain('Copy Trade Executed');
      expect(formatted).not.toContain('Payout');
    });
  });

  describe('executeCopyTrade', () => {
    it('should reject stale signals', async () => {
      const stalePayload = JSON.stringify({
        event: 'new_trade',
        data: {
          sourceWallet: 'wallet1',
          targetWallet: 'wallet2',
          tradeAmount: 100,
          tradePercentage: 50,
          sourceTxSignature: 'stale-sig',
        },
        signature: 'sig',
        timestamp: Date.now() - 10 * 60_000,
        metadata: {
          source: 'pump-portal',
          ip: '1.2.3.4',
        },
      });

      const result = await executeCopyTrade(stalePayload, 'signer', {
        maxPositionSize: 1000,
        minTradeSize: 10,
        copyPercentage: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Stale signal');
    });

    it('should reject duplicate copy trades', async () => {
      const redis = await import('@/lib/redis');
      (redis.default.exists as any).mockResolvedValueOnce(1);

      const payload = JSON.stringify({
        event: 'new_trade',
        data: {
          sourceWallet: 'wallet1',
          targetWallet: 'wallet2',
          tradeAmount: 100,
          tradePercentage: 50,
          sourceTxSignature: 'dup-sig',
        },
        signature: 'sig',
        timestamp: Date.now(),
        metadata: {
          source: 'pump-portal',
          ip: '1.2.3.4',
        },
      });

      const result = await executeCopyTrade(payload, 'signer', {
        maxPositionSize: 1000,
        minTradeSize: 10,
        copyPercentage: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Duplicate');
    });

    it('should execute valid copy trade', async () => {
      const payload = JSON.stringify({
        event: 'new_trade',
        data: {
          sourceWallet: 'wallet1',
          targetWallet: 'wallet2',
          tradeAmount: 100,
          tradePercentage: 50,
          sourceTxSignature: 'valid-sig',
        },
        signature: 'sig',
        timestamp: Date.now(),
        metadata: {
          source: 'pump-portal',
          ip: '1.2.3.4',
        },
      });

      const result = await executeCopyTrade(payload, 'signer', {
        maxPositionSize: 1000,
        minTradeSize: 10,
        copyPercentage: 100,
      });

      expect(result.success).toBe(true);
      expect(result.confirmation).toBeDefined();
      expect(result.confirmation?.sourceWallet).toBe('wallet1');
    });

    it('should attribute fees to treasury on successful trade', async () => {
      const { treasuryService } = await import('@/services/treasury');
      const payload = JSON.stringify({
        event: 'new_trade',
        data: {
          sourceWallet: 'wallet1',
          targetWallet: 'wallet2',
          tradeAmount: 100,
          tradePercentage: 50,
          sourceTxSignature: 'fee-sig',
        },
        signature: 'sig',
        timestamp: Date.now(),
        metadata: {
          source: 'pump-portal',
          ip: '1.2.3.4',
        },
      });

      const result = await executeCopyTrade(payload, 'signer', {
        maxPositionSize: 1000,
        minTradeSize: 10,
        copyPercentage: 100,
      });

      expect(result.success).toBe(true);
      expect(treasuryService.attributeFee).toHaveBeenCalledWith({
        tradeId: expect.any(String),
        sourceWallet: 'wallet1',
        feeType: 'copy-trade',
        lamports: expect.any(Number),
      });
    });

    it('should block trade when cost control hard cap is reached', async () => {
      const { costControlService } = await import('@/services/cost-control');
      (costControlService.evaluate as any).mockReturnValueOnce({
        allowed: false,
        fraction: 1.01,
        threshold: 'hard_cap',
      });

      const payload = JSON.stringify({
        event: 'new_trade',
        data: {
          sourceWallet: 'wallet1',
          targetWallet: 'wallet2',
          tradeAmount: 100,
          tradePercentage: 50,
          sourceTxSignature: 'cap-sig',
        },
        signature: 'sig',
        timestamp: Date.now(),
        metadata: {
          source: 'pump-portal',
          ip: '1.2.3.4',
        },
      });

      const result = await executeCopyTrade(payload, 'signer', {
        maxPositionSize: 1000,
        minTradeSize: 10,
        copyPercentage: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cost control hard cap reached');
    });
  });
});
