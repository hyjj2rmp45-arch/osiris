/**
 * P5.1 — Loss Circuit Breaker Service
 *
 * Rolling window PNL computation with loss threshold enforcement.
 */

import { db } from '@/lib/db';
import { circuitBreakerState } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { postNtfy } from '@/lib/ntfy';

export interface CircuitBreakerConfig {
  rollingWindowMs: number;
  lossThresholdLamports: number;
  consecutiveLossesThreshold: number;
  overrideExpiryMs: number;
}

export interface TradeRecord {
  pnlLamports: number;
  executedAt: Date;
}

export interface CircuitBreakerEvaluationResult {
  tripped: boolean;
  reason?: string | null;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  rollingWindowMs: 60 * 60 * 1000,
  lossThresholdLamports: 0.5 * 1_000_000_000,
  consecutiveLossesThreshold: 3,
  overrideExpiryMs: 60 * 60 * 1000,
};

export class CircuitBreakerService {
  private config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async evaluate(userId: number, trades: TradeRecord[]): Promise<{ tripped: boolean; reason?: string | null }> {
    const state = await this.getState(userId);
    if (state?.isTripped) {
      if (state.overrideExpiresAt && state.overrideExpiresAt > new Date()) {
        return { tripped: false };
      }
      await this.reset(userId);
    }

    const cutoff = new Date(Date.now() - this.config.rollingWindowMs);
    const windowTrades = trades.filter(t => t.executedAt >= cutoff);

    const rollingLoss = windowTrades.reduce((sum, t) => sum + Math.min(0, t.pnlLamports), 0);
    const consecutiveLosses = this.countConsecutiveLosses(windowTrades);

    let tripped = false;
    let reason: string | undefined;

    if (rollingLoss <= -this.config.lossThresholdLamports) {
      tripped = true;
      reason = 'rolling_loss_exceeded';
    } else if (consecutiveLosses >= this.config.consecutiveLossesThreshold) {
      tripped = true;
      reason = 'consecutive_losses_exceeded';
    }

    if (tripped) {
      await this.trip(userId, reason!, rollingLoss, consecutiveLosses);
    } else {
      await this.upsertState(userId, rollingLoss, consecutiveLosses, false);
    }

    return { tripped, reason: reason ?? null };
  }

  async trip(userId: number, reason: string, rollingLoss: number, consecutiveLosses: number): Promise<void> {
    const expiresAt = new Date(Date.now() + this.config.overrideExpiryMs);
    await db.insert(circuitBreakerState).values({
      userId,
      rollingLoss,
      consecutiveLosses,
      isTripped: true,
      trippedAt: new Date(),
      overrideExpiresAt: expiresAt,
      lastTradeAt: new Date(),
    }).onConflictDoUpdate({
      target: [circuitBreakerState.userId],
      set: {
        rollingLoss,
        consecutiveLosses,
        isTripped: true,
        trippedAt: new Date(),
        overrideExpiresAt: expiresAt,
        lastTradeAt: new Date(),
        updatedAt: new Date(),
      },
    });

    postNtfy(
      'OSIRIS Circuit Breaker Tripped',
      `userId=${userId} reason=${reason} rollingLoss=${rollingLoss} consecutiveLosses=${consecutiveLosses}`
    ).catch(() => {});
  }

  async override(userId: number): Promise<boolean> {
    const state = await this.getState(userId);
    if (!state?.isTripped) return false;

    await this.reset(userId);
    return true;
  }

  async getState(userId: number) {
    const [state] = await db.select()
      .from(circuitBreakerState)
      .where(eq(circuitBreakerState.userId, userId))
      .limit(1);
    return state;
  }

  private async reset(userId: number): Promise<void> {
    await db.update(circuitBreakerState)
      .set({ isTripped: false, trippedAt: null, overrideExpiresAt: null, updatedAt: new Date() })
      .where(eq(circuitBreakerState.userId, userId));
  }

  private async upsertState(userId: number, rollingLoss: number, consecutiveLosses: number, isTripped: boolean): Promise<void> {
    await db.insert(circuitBreakerState).values({
      userId,
      rollingLoss,
      consecutiveLosses,
      isTripped,
      lastTradeAt: new Date(),
    }).onConflictDoUpdate({
      target: [circuitBreakerState.userId],
      set: {
        rollingLoss,
        consecutiveLosses,
        isTripped,
        lastTradeAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  private countConsecutiveLosses(trades: TradeRecord[]): number {
    let count = 0;
    for (const trade of [...trades].reverse()) {
      if (trade.pnlLamports < 0) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }
}

export const circuitBreakerService = new CircuitBreakerService();
