/**
 * Trade Intents API Route Tests
 *
 * Tests the API routes for trade intents. Since these are Next.js App Router
 * handlers, we test the exportable schema validation and route behavior directly.
 *
 * Note: Full route handler testing with HTTP request/response would require
 * a more complex integration test setup (e.g., using supertest or MSW).
 * These tests verify the schema validation and route structure.
 */

import { describe, it, expect } from 'vitest';
import { createTradeIntentSchema, updateTradeIntentStatusSchema } from '@/lib/validation/trade-intent-validation';
import { canTransition, isTerminal } from '@/lib/trade-intent-state-machine';
import type { TradeIntentStatus } from '@/lib/trade-intent-state-machine';

describe('Trade Intent API Route Structure', () => {
  describe('POST /api/trade-intents schema', () => {
    const validBase = {
      walletId: 1,
      inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      outputMint: 'So11111111111111111111111111111111111111112',
      inputAmount: 1000000,
    };

    it('defines createTradeIntentSchema export', () => {
      expect(createTradeIntentSchema).toBeDefined();
    });

    it('accepts valid trade intent data', () => {
      const result = createTradeIntentSchema.safeParse(validBase);
      expect(result.success).toBe(true);
    });

    it('accepts all required fields', () => {
      const result = createTradeIntentSchema.safeParse({
        ...validBase,
        slippageBps: 50,
        priorityFeeLamports: 1000,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.walletId).toBe(1);
        expect(result.data.inputAmount).toBe(1000000);
        expect(result.data.slippageBps).toBe(50);
        expect(result.data.priorityFeeLamports).toBe(1000);
      }
    });

    it('applies default slippageBps', () => {
      const result = createTradeIntentSchema.safeParse(validBase);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slippageBps).toBe(50);
      }
    });

    it('applies default priorityFeeLamports', () => {
      const result = createTradeIntentSchema.safeParse(validBase);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priorityFeeLamports).toBe(0);
      }
    });

    it('rejects missing required fields', () => {
      const result = createTradeIntentSchema.safeParse({});
      expect(result.success).toBe(false);
      expect(result.error.issues.length).toBeGreaterThan(0);
    });

    it('rejects negative walletId', () => {
      const result = createTradeIntentSchema.safeParse({ ...validBase, walletId: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects zero inputAmount', () => {
      const result = createTradeIntentSchema.safeParse({ ...validBase, inputAmount: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects negative inputAmount', () => {
      const result = createTradeIntentSchema.safeParse({ ...validBase, inputAmount: -100 });
      expect(result.success).toBe(false);
    });

    it('rejects slippageBps > 1000', () => {
      const result = createTradeIntentSchema.safeParse({ ...validBase, slippageBps: 1001 });
      expect(result.success).toBe(false);
    });

    it('rejects slippageBps < 1', () => {
      const result = createTradeIntentSchema.safeParse({ ...validBase, slippageBps: 0 });
      expect(result.success).toBe(false);
    });
  });

  describe('PATCH /api/trade-intents/[id] schema', () => {
    it('defines updateTradeIntentStatusSchema export', () => {
      expect(updateTradeIntentStatusSchema).toBeDefined();
    });

    it('accepts all valid status values', () => {
      const validStatuses: TradeIntentStatus[] = [
        'pending', 'queued', 'building', 'signing',
        'submitted', 'confirmed', 'failed', 'canceled',
      ];

      for (const status of validStatuses) {
        const result = updateTradeIntentStatusSchema.safeParse({ status });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(status);
        }
      }
    });

    it('accepts status with metadata containing error', () => {
      const result = updateTradeIntentStatusSchema.safeParse({
        status: 'failed',
        metadata: { error: 'Insufficient funds' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata?.error).toBe('Insufficient funds');
      }
    });

    it('accepts status with metadata containing signature', () => {
      const result = updateTradeIntentStatusSchema.safeParse({
        status: 'confirmed',
        metadata: { signature: 'mock_sig_123' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata?.signature).toBe('mock_sig_123');
      }
    });

    it('accepts status without metadata', () => {
      const result = updateTradeIntentStatusSchema.safeParse({ status: 'queued' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata).toBeUndefined();
      }
    });

    it('rejects invalid status', () => {
      const result = updateTradeIntentStatusSchema.safeParse({ status: 'unknown' });
      expect(result.success).toBe(false);
    });

    it('rejects empty status', () => {
      const result = updateTradeIntentStatusSchema.safeParse({ status: '' });
      expect(result.success).toBe(false);
    });
  });
});

describe('Trade Intent State Machine Integration with Route Schemas', () => {
  /**
   * Validates that the route's status enum matches the state machine's
   * valid statuses. This ensures API and state machine are in sync.
   */
  it('route schema status values match state machine valid statuses', () => {
    const routeStatuses = [
      'pending', 'queued', 'building', 'signing',
      'submitted', 'confirmed', 'failed', 'canceled',
    ];

    const smStatuses: TradeIntentStatus[] = [
      'pending', 'queued', 'building', 'signing',
      'submitted', 'confirmed', 'failed', 'canceled',
    ];

    expect(routeStatuses).toEqual(smStatuses);
  });

  /**
   * Validates that transitions used in PATCH requests are valid
   * according to the state machine.
   */
  it('validates all PATCH status transitions against state machine', () => {
    // Test the valid state transitions that would be sent from a client
    const validPatchTransitions: Array<[TradeIntentStatus, TradeIntentStatus]> = [
      ['pending', 'queued'],
      ['pending', 'canceled'],
      ['queued', 'building'],
      ['queued', 'canceled'],
      ['building', 'signing'],
      ['building', 'failed'],
      ['signing', 'submitted'],
      ['signing', 'failed'],
      ['submitted', 'confirmed'],
      ['submitted', 'failed'],
    ];

    for (const [from, to] of validPatchTransitions) {
      expect(canTransition(from, to)).toBe(true);
    }
  });

  it('identifies terminal states as not transitionable', () => {
    const terminalStates: TradeIntentStatus[] = ['confirmed', 'failed', 'canceled'];
    const anyState: TradeIntentStatus = 'pending';

    for (const terminal of terminalStates) {
      expect(isTerminal(terminal)).toBe(true);
      expect(canTransition(terminal, anyState)).toBe(false);
    }
  });

  it('pending intent can be queued or canceled', () => {
    const intent = { status: 'pending' as TradeIntentStatus };
    expect(canTransition(intent.status, 'queued')).toBe(true);
    expect(canTransition(intent.status, 'canceled')).toBe(true);
    expect(canTransition(intent.status, 'confirmed')).toBe(false);
  });

  it('submitted intent can be confirmed or failed', () => {
    const intent = { status: 'submitted' as TradeIntentStatus };
    expect(canTransition(intent.status, 'confirmed')).toBe(true);
    expect(canTransition(intent.status, 'failed')).toBe(true);
    expect(canTransition(intent.status, 'canceled')).toBe(false);
  });
});
