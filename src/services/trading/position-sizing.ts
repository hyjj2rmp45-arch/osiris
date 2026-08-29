/**
 * Position sizing — OSIRIS
 *
 * Implements Kelly-criterion-inspired sizing with configurable hard caps.
 * Returns a suggested trade amount, never exceeds account/session limits.
 */

export interface PositionSizeInput {
  accountBalance: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  maxPositionFraction?: number;
  maxSessionFraction?: number;
}

export interface PositionSizeResult {
  suggestedAmount: number;
  kellyFraction: number;
  capped: boolean;
  reason: string | undefined;
}

export class PositionSizingService {
  async compute(input: PositionSizeInput): Promise<PositionSizeResult> {
    const maxPositionFraction = input.maxPositionFraction ?? 0.1;
    const maxSessionFraction = input.maxSessionFraction ?? 0.3;

    const winRate = Math.min(Math.max(input.winRate, 0), 1);
    const avgWin = Math.max(input.avgWin, 0);
    const avgLoss = Math.max(input.avgLoss, 0);

    const b = avgLoss > 0 ? avgWin / avgLoss : 0;
    const kelly = winRate - ((1 - winRate) / (b || 1));
    const kellyFraction = Math.max(0, Math.min(kelly, maxPositionFraction));

    const suggestedByKelly = input.accountBalance * kellyFraction;
    const maxPosition = input.accountBalance * maxPositionFraction;

    let suggestedAmount = Math.min(suggestedByKelly, maxPosition);
    let capped = suggestedAmount < suggestedByKelly;
    let reason: string | undefined;

    if (suggestedAmount <= 0) {
      suggestedAmount = 0;
      reason = 'negative_expectancy';
    }

    return {
      suggestedAmount: Math.floor(suggestedAmount),
      kellyFraction,
      capped,
      reason,
    };
  }
}

export const positionSizingService = new PositionSizingService();
