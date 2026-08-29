import { describe, it, expect } from 'vitest';
import { createTradeIntentSchema, updateTradeIntentStatusSchema } from '@/lib/validation/trade-intent-validation';
import { z } from 'zod';

describe('Trade Intent Validation Schemas', () => {
  describe('CreateTradeIntentSchema', () => {
    const validBase = {
      walletId: 1,
      inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      outputMint: 'So11111111111111111111111111111111111111112',
      inputAmount: 1000000,
    };

    it('accepts valid trade intent data', () => {
      const result = createTradeIntentSchema.safeParse({
        ...validBase,
        slippageBps: 50,
        priorityFeeLamports: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        ...validBase,
        slippageBps: 50,
        priorityFeeLamports: 1000,
      });
    });

    it('applies default values for optional fields', () => {
      const result = createTradeIntentSchema.safeParse(validBase);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        ...validBase,
        slippageBps: 50, // default
        priorityFeeLamports: 0, // default
      });
    });

    it('rejects negative walletId', () => {
      const result = createTradeIntentSchema.safeParse({
        ...validBase,
        walletId: -1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects zero walletId', () => {
      const result = createTradeIntentSchema.safeParse({
        ...validBase,
        walletId: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects non-integer walletId', () => {
      const result = createTradeIntentSchema.safeParse({
        ...validBase,
        walletId: 1.5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects invalid input mint (too short)', () => {
      const result = createTradeIntentSchema.safeParse({
        ...validBase,
        inputMint: 'short',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects invalid output mint (too short)', () => {
      const result = createTradeIntentSchema.safeParse({
        ...validBase,
        outputMint: 'short',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects negative input amount', () => {
      const result = createTradeIntentSchema.safeParse({
        ...validBase,
        inputAmount: -100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects zero input amount', () => {
      const result = createTradeIntentSchema.safeParse({
        ...validBase,
        inputAmount: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects negative slippageBps', () => {
      const result = createTradeIntentSchema.safeParse({
        ...validBase,
        slippageBps: -10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects slippageBps > 1000', () => {
      const result = createTradeIntentSchema.safeParse({
        ...validBase,
        slippageBps: 1001,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects negative priorityFeeLamports', () => {
      const result = createTradeIntentSchema.safeParse({
        ...validBase,
        priorityFeeLamports: -1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('accepts valid boundary values', () => {
      const result = createTradeIntentSchema.safeParse({
        ...validBase,
        slippageBps: 1, // min positive
        priorityFeeLamports: 0, // min
      });

      expect(result.success).toBe(true);
    });

    it('accepts valid boundary values for max', () => {
      const result = createTradeIntentSchema.safeParse({
        ...validBase,
        slippageBps: 1000, // max
        priorityFeeLamports: 999999999, // large but valid
      });

      expect(result.success).toBe(true);
    });
  });

  describe('UpdateTradeIntentStatusSchema', () => {
    it('accepts all valid status values', () => {
      const validStatuses: (z.infer<typeof updateTradeIntentStatusSchema>['status'])[] = [
        'pending',
        'queued',
        'building',
        'signing',
        'submitted',
        'confirmed',
        'failed',
        'canceled',
      ];

      for (const status of validStatuses) {
        const result = updateTradeIntentStatusSchema.safeParse({ status });
        expect(result.success).toBe(true);
        expect(result.data.status).toBe(status);
      }
    });

    it('rejects invalid status values', () => {
      const invalidStatuses = ['unknown', '', 'completed', 'processing'];

      for (const status of invalidStatuses) {
        const result = updateTradeIntentStatusSchema.safeParse({ status });
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it('accepts optional metadata with error and signature', () => {
          const result = updateTradeIntentStatusSchema.safeParse({
            status: 'confirmed',
            metadata: {
              error: 'Something went wrong',
              signature: 'mock_tx_signature',
            },
          });

          expect(result.success).toBe(true);
          expect(result.data.metadata?.error).toBe('Something went wrong');
          expect(result.data.metadata?.signature).toBe('mock_tx_signature');
        });

    it('accepts optional metadata with only error', () => {
      const result = updateTradeIntentStatusSchema.safeParse({
        status: 'failed',
        metadata: {
          error: 'Insufficient funds',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data.metadata?.error).toBe('Insufficient funds');
      expect(result.data.metadata?.signature).toBeUndefined();
    });

    it('accepts optional metadata with only signature', () => {
      const result = updateTradeIntentStatusSchema.safeParse({
        status: 'confirmed',
        metadata: {
          signature: 'mock_tx_signature',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data.metadata?.signature).toBe('mock_tx_signature');
      expect(result.data.metadata?.error).toBeUndefined();
    });

    it('accepts empty metadata', () => {
      const result = updateTradeIntentStatusSchema.safeParse({
        status: 'pending',
        metadata: {},
      });

      expect(result.success).toBe(true);
      expect(result.data.metadata).toEqual({});
    });

    it('accepts no metadata', () => {
      const result = updateTradeIntentStatusSchema.safeParse({
        status: 'queued',
      });

      expect(result.success).toBe(true);
      expect(result.data.metadata).toBeUndefined();
    });
  });

  describe('Zod Error Messages', () => {
    it('provides helpful error messages for walletId', () => {
      const result = createTradeIntentSchema.safeParse({
        walletId: 'not-a-number',
        inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        outputMint: 'So11111111111111111111111111111111111111112',
        inputAmount: 1000000,
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('Expected number');
    });

    it('provides helpful error messages for inputMint length', () => {
      const result = createTradeIntentSchema.safeParse({
        walletId: 1,
        inputMint: 'short',
        outputMint: 'So11111111111111111111111111111111111111112',
        inputAmount: 1000000,
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('32');
    });
  });
});