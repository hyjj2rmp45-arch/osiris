/**
 * Position lifecycle service — OSIRIS
 *
 * Tracks open positions, updates on fills, and computes realized/unrealized PnL.
 * Designed to be called by the trade-intent flow and the TP/SL monitor.
 */

import { db } from '@/lib/db';
import { positions, trades, wallets } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';
import { pnlEngine } from '@/services/safety/pnl-engine';

export interface PositionInput {
  walletId: number;
  mint: string;
  amount: number;
  avgEntryPrice: number;
  takeProfitPrice?: number | null;
  stopLossPrice?: number | null;
  trailingStopBps?: number | null;
}

export class PositionService {
  async open(input: PositionInput): Promise<void> {
    await db.insert(positions).values({
      walletId: input.walletId,
      mint: input.mint,
      amount: input.amount,
      avgEntryPrice: input.avgEntryPrice,
    });
  }

  async closePartial(walletId: number, mint: string, amount: number): Promise<void> {
    await db
      .update(positions)
      .set({ amount: sql`${positions.amount} - ${amount}`, updatedAt: new Date() })
      .where(and(eq(positions.walletId, walletId), eq(positions.mint, mint)));
  }

  async evaluateExits(_walletId: number, _currentPrices: Map<string, number>): Promise<Array<{
    mint: string;
    action: 'take_profit' | 'stop_loss' | 'trailing_stop';
    currentPrice: number;
  }>> {
    // P1: TP/SL evaluation stub — full implementation requires monitor loop + Jupiter V2 integration
    return [];
  }

  async syncFromTradeIntent(tradeIntent: {
    walletId: number;
    inputMint: string;
    outputMint: string;
    inputAmount: number;
    status: string;
    txSignature: string | null;
  }): Promise<void> {
    if (tradeIntent.status !== 'confirmed' || !tradeIntent.txSignature) {
      return;
    }

    await this.open({
      walletId: tradeIntent.walletId,
      mint: tradeIntent.outputMint,
      amount: tradeIntent.inputAmount,
      avgEntryPrice: 0,
    });
  }
}

export const positionService = new PositionService();
