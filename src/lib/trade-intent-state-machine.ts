/**
 * Trade Intent State Machine — OSIRIS
 *
 * Lifecycle:
 *   pending -> queued -> building -> signing -> submitted -> confirmed
 *                                                          \-> failed
 *                                              \-> canceled
 */

export type TradeIntentStatus =
  | 'pending'
  | 'queued'
  | 'building'
  | 'signing'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'canceled';

export interface TradeIntent {
  id: number;
  userId: number;
  walletId: number;
  status: TradeIntentStatus;
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  slippageBps: number | null;
  priorityFeeLamports: number;
  txSignature: string | null;
  error: string | null;
  metadata: Record<string, unknown>;
  takeProfitPrice: number | null;
  stopLossPrice: number | null;
  trailingStopBps: number | null;
  orderType: 'market' | 'limit' | 'oco' | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransitionResult {
  success: boolean;
  nextStatus: TradeIntentStatus;
  error?: string;
}

const ALLOWED_TRANSITIONS: Record<TradeIntentStatus, TradeIntentStatus[]> = {
  pending: ['queued', 'canceled'],
  queued: ['building', 'canceled'],
  building: ['signing', 'failed'],
  signing: ['submitted', 'failed'],
  submitted: ['confirmed', 'failed'],
  confirmed: [],
  failed: [],
  canceled: [],
};

export function canTransition(from: TradeIntentStatus, to: TradeIntentStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transition(intent: TradeIntent, to: TradeIntentStatus): TransitionResult {
  if (!canTransition(intent.status, to)) {
    return {
      success: false,
      nextStatus: intent.status,
      error: `Invalid transition from ${intent.status} to ${to}`,
    };
  }

  return {
    success: true,
    nextStatus: to,
  };
}

export function isTerminal(status: TradeIntentStatus): boolean {
  return ['confirmed', 'failed', 'canceled'].includes(status);
}
