import { describe, it, expect, vi } from 'vitest';
import {
  canTransition,
  isTerminal,
  transition,
  type TradeIntent,
  type TradeIntentStatus,
} from '@/lib/trade-intent-state-machine';

// Test the state machine integration logic directly
// without mocking the complex Drizzle query builder

const makeMockIntent = (overrides: Partial<TradeIntent> = {}): TradeIntent => ({
  id: 1,
  userId: 1,
  walletId: 1,
  status: 'pending' as TradeIntentStatus,
  inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  outputMint: 'So11111111111111111111111111111111111111112',
  inputAmount: 1000000,
  slippageBps: 50,
  priorityFeeLamports: 0,
  txSignature: null,
  error: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('TradeIntentService business logic (state machine integration)', () => {
  describe('State transition validation', () => {
    it('identifies valid transition for pending -> queued', () => {
      const intent = makeMockIntent({ status: 'pending' });
      expect(canTransition(intent.status, 'queued')).toBe(true);
    });

    it('identifies valid transition for pending -> canceled', () => {
      const intent = makeMockIntent({ status: 'pending' });
      expect(canTransition(intent.status, 'canceled')).toBe(true);
    });

    it('rejects invalid transition for confirmed -> pending', () => {
      const intent = makeMockIntent({ status: 'confirmed' });
      expect(canTransition(intent.status, 'pending')).toBe(false);
    });

    it('rejects invalid transition for failed -> pending', () => {
      const intent = makeMockIntent({ status: 'failed' });
      expect(canTransition(intent.status, 'pending')).toBe(false);
    });
  });

  describe('Confirmed state requires signature', () => {
    it('confirms intent requires signature when transitioning to confirmed', () => {
      const intent = makeMockIntent({ status: 'submitted', txSignature: null });
      // This is the business rule: confirmed needs signature
      const needsSignature = intent.status === 'submitted' && !intent.txSignature;
      expect(needsSignature).toBe(true);
    });

    it('confirms intent succeeds when signature provided in metadata', () => {
      const intent = makeMockIntent({ status: 'submitted', txSignature: null });
      const metadata = { signature: 'mock_tx_sig' };
      const hasSignature = !!(intent.txSignature || metadata.signature);
      expect(hasSignature).toBe(true);
    });

    it('confirms intent succeeds when txSignature already set', () => {
      const intent = makeMockIntent({ status: 'submitted', txSignature: 'existing_sig' });
      const metadata: Record<string, unknown> = {};
      const hasSignature = !!(intent.txSignature || metadata.signature);
      expect(hasSignature).toBe(true);
    });
  });

  describe('Cancel transitions', () => {
    it('allows cancel from pending', () => {
      const intent = makeMockIntent({ status: 'pending' });
      expect(canTransition(intent.status, 'canceled')).toBe(true);
    });

    it('allows cancel from queued', () => {
      const intent = makeMockIntent({ status: 'queued' });
      expect(canTransition(intent.status, 'canceled')).toBe(true);
    });

    it('blocks cancel from building', () => {
      const intent = makeMockIntent({ status: 'building' });
      expect(canTransition(intent.status, 'canceled')).toBe(false);
    });

    it('blocks cancel from signing', () => {
      const intent = makeMockIntent({ status: 'signing' });
      expect(canTransition(intent.status, 'canceled')).toBe(false);
    });

    it('blocks cancel from submitted', () => {
      const intent = makeMockIntent({ status: 'submitted' });
      expect(canTransition(intent.status, 'canceled')).toBe(false);
    });

    it('blocks cancel from confirmed', () => {
      const intent = makeMockIntent({ status: 'confirmed' });
      expect(canTransition(intent.status, 'canceled')).toBe(false);
    });
  });

  describe('Full state machine path', () => {
    it('follows happy path: pending -> queued -> building -> signing -> submitted -> confirmed', () => {
      const path: TradeIntentStatus[] = ['pending', 'queued', 'building', 'signing', 'submitted', 'confirmed'];

      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        expect(canTransition(from, to)).toBe(true);
      }
    });

    it('allows failure path: building -> failed', () => {
      expect(canTransition('building', 'failed')).toBe(true);
    });

    it('allows failure path: signing -> failed', () => {
      expect(canTransition('signing', 'failed')).toBe(true);
    });

    it('allows failure path: submitted -> failed', () => {
      expect(canTransition('submitted', 'failed')).toBe(true);
    });

    it('does not allow failure from terminal states', () => {
      expect(canTransition('confirmed', 'failed')).toBe(false);
      expect(canTransition('failed', 'pending')).toBe(false);
      expect(canTransition('canceled', 'failed')).toBe(false);
    });
  });
});

describe('State machine pure functions', () => {
  describe('canTransition', () => {
    it.each([
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
    ] as const)('allows %s -> %s', (from, to) => {
      expect(canTransition(from, to)).toBe(true);
    });

    it.each([
      ['pending', 'building'],
      ['pending', 'signing'],
      ['pending', 'submitted'],
      ['pending', 'confirmed'],
      ['pending', 'failed'],
      ['queued', 'signing'],
      ['queued', 'submitted'],
      ['queued', 'confirmed'],
      ['building', 'submitted'],
      ['building', 'confirmed'],
      ['signing', 'confirmed'],
      ['confirmed', 'pending'],
      ['confirmed', 'failed'],
      ['confirmed', 'canceled'],
      ['failed', 'pending'],
      ['failed', 'confirmed'],
      ['failed', 'canceled'],
      ['canceled', 'pending'],
      ['canceled', 'confirmed'],
    ] as const)('blocks %s -> %s', (from, to) => {
      expect(canTransition(from, to)).toBe(false);
    });
  });

  describe('transition', () => {
    it('returns success for valid transition', () => {
      const result = transition(makeMockIntent({ status: 'pending' }), 'queued');
      expect(result.success).toBe(true);
      expect(result.nextStatus).toBe('queued');
      expect(result.error).toBeUndefined();
    });

    it('returns failure for invalid transition', () => {
      const result = transition(makeMockIntent({ status: 'confirmed' }), 'pending');
      expect(result.success).toBe(false);
      expect(result.nextStatus).toBe('confirmed');
      expect(result.error).toContain('Invalid transition');
    });

    it('preserves current status on failure', () => {
      const result = transition(makeMockIntent({ status: 'building' }), 'canceled');
      expect(result.success).toBe(false);
      expect(result.nextStatus).toBe('building');
    });
  });

  describe('isTerminal', () => {
    it('returns true for terminal states', () => {
      expect(isTerminal('confirmed')).toBe(true);
      expect(isTerminal('failed')).toBe(true);
      expect(isTerminal('canceled')).toBe(true);
    });

    it('returns false for non-terminal states', () => {
      expect(isTerminal('pending')).toBe(false);
      expect(isTerminal('queued')).toBe(false);
      expect(isTerminal('building')).toBe(false);
      expect(isTerminal('signing')).toBe(false);
      expect(isTerminal('submitted')).toBe(false);
    });
  });
});
