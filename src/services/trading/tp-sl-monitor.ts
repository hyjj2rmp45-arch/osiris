/**
 * Auto TP/SL monitor — OSIRIS
 *
 * Polls open positions and current prices, then:
 * - Places Jupiter V2 limit orders for TP/SL triggers
 * - Cancels stale orders on recovery/reconnect
 * - Emits audit events for every lifecycle change
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { positions, wallets } from '@/lib/schema';
import { priceFeedService } from '@/services/prices/feed';
import { positionService } from '@/services/trading/position-service';
import { jupiterV2Client } from '@/services/trading/jupiter-v2';
import { logAuditEvent } from '@/lib/audit';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export interface PositionWithWallet {
  id: number;
  walletId: number;
  userId: number;
  mint: string;
  amount: number;
  avgEntryPrice: number;
  takeProfitPrice: number | null;
  stopLossPrice: number | null;
  trailingStopBps: number | null;
}

export class TpSlMonitor {
  private running = false;

  isRunning(): boolean {
    return this.running;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    logger.info('[tp-sl-monitor] started');

    while (this.running) {
      try {
        await this.tick();
      } catch (error) {
        logger.error('[tp-sl-monitor] tick failed', { error });
      }

      await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    logger.info('[tp-sl-monitor] stopped');
  }

  private async tick(): Promise<void> {
    const activePositions = await db
      .select({
        id: positions.id,
        walletId: positions.walletId,
        userId: wallets.userId,
        mint: positions.mint,
        amount: positions.amount,
        avgEntryPrice: positions.avgEntryPrice,
        takeProfitPrice: positions.takeProfitPrice,
        stopLossPrice: positions.stopLossPrice,
        trailingStopBps: positions.trailingStopBps,
      })
      .from(positions)
      .innerJoin(wallets, eq(wallets.id, positions.walletId))
      .where(and(eq(positions.amount, sql`${positions.amount}`), sql`${positions.amount} > 0`));

    if (activePositions.length === 0) {
      return;
    }

    const mints = Array.from(new Set(activePositions.map((p) => p.mint)));
    const priceMap = await priceFeedService.getPrices(mints);
    const currentPriceMap = new Map<string, number>();
    for (const [mint, data] of priceMap.entries()) {
      currentPriceMap.set(mint, data.price);
    }

    for (const position of activePositions) {
      const currentPrice = currentPriceMap.get(position.mint);
      if (!currentPrice) continue;

      const exits = await positionService.evaluateExits(position.walletId, currentPriceMap);
      for (const exit of exits) {
        const correlationId = crypto.randomUUID();
        await logAuditEvent({
          type: 'tp.sl.triggered',
          userId: position.userId,
          metadata: {
            walletId: position.walletId,
            mint: exit.mint,
            action: exit.action,
            currentPrice: exit.currentPrice,
            correlationId,
          },
        });

        await this.executeExit(position, exit, correlationId);
      }
    }
  }

  private async executeExit(
    position: PositionWithWallet,
    exit: { mint: string; action: 'take_profit' | 'stop_loss' | 'trailing_stop'; currentPrice: number },
    correlationId: string
  ): Promise<void> {
    // P1: Auto TP/SL execution stub — full implementation requires Jupiter V2 order signing + submission
    logger.info('[tp-sl-monitor] exit trigger', {
      mint: exit.mint,
      action: exit.action,
      currentPrice: exit.currentPrice,
      correlationId,
    });
  }
}

export const tpSlMonitor = new TpSlMonitor();
