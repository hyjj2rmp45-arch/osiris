import { describe, it, expect } from 'vitest';
import {
  TradeIntent,
  canTransition,
  transition,
  isTerminal,
} from '@/lib/trade-intent-state-machine';

const makeIntent = (status: TradeIntent['status'] = 'pending'): TradeIntent => ({
  id: 1,
  userId: 1,
  walletId: 1,
  status,
  inputMint: 'USDC',
  outputMint: 'SOL',
  inputAmount: 1000,
  slippageBps: 50,
  priorityFeeLamports: 0,
  txSignature: null,
  error: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('trade-intent-state-machine', () => {
  it('allows pending -> queued', () => {
    expect(canTransition(makeIntent('pending').status, 'queued')).toBe(true);
  });

  it('allows pending -> canceled', () => {
    expect(canTransition(makeIntent('pending').status, 'canceled')).toBe(true);
  });

  it('blocks pending -> confirmed', () => {
    expect(canTransition(makeIntent('pending').status, 'confirmed')).toBe(false);
  });

  it('allows queued -> building', () => {
    expect(canTransition(makeIntent('queued').status, 'building')).toBe(true);
  });

  it('allows building -> signing', () => {
    expect(canTransition(makeIntent('building').status, 'signing')).toBe(true);
  });

  it('allows signing -> submitted', () => {
    expect(canTransition(makeIntent('signing').status, 'submitted')).toBe(true);
  });

  it('allows submitted -> confirmed', () => {
    expect(canTransition(makeIntent('submitted').status, 'confirmed')).toBe(true);
  });

  it('allows submitted -> failed', () => {
    expect(canTransition(makeIntent('submitted').status, 'failed')).toBe(true);
  });

  it('blocks confirmed -> any state', () => {
    expect(canTransition(makeIntent('confirmed').status, 'pending')).toBe(false);
  });

  it('transition returns success for valid move', () => {
    const result = transition(makeIntent('pending'), 'queued');
    expect(result.success).toBe(true);
    expect(result.nextStatus).toBe('queued');
  });

  it('transition returns failure for invalid move', () => {
    const result = transition(makeIntent('confirmed'), 'pending');
    expect(result.success).toBe(false);
    expect(result.nextStatus).toBe('confirmed');
  });

  it('isTerminal returns true for terminal states', () => {
    expect(isTerminal('confirmed')).toBe(true);
    expect(isTerminal('failed')).toBe(true);
    expect(isTerminal('canceled')).toBe(true);
  });

  it('isTerminal returns false for non-terminal states', () => {
    expect(isTerminal('pending')).toBe(false);
    expect(isTerminal('queued')).toBe(false);
    expect(isTerminal('building')).toBe(false);
  });
});
