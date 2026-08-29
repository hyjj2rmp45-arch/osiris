/**
 * P5.3 — PNL Computation Engine
 *
 * Realized/unrealized PNL with multi-wallet aggregation and fee tracking.
 */

import { db } from '@/lib/db';
import { positions, trades, paperTrades, wallets } from '@/lib/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';

export interface PnlInput {
  userId: number;
  walletId?: number;
  currentPrice: number;
}

export interface PnlResult {
  realizedPnl: number;
  unrealizedPnl: number;
  totalFees: number;
  positions: Array<{
    mint: string;
    amount: number;
    avgEntryPrice: number;
    currentPrice: number;
    realizedPnl: number;
    unrealizedPnl: number;
  }>;
}

export class PnlEngine {
  async compute(input: PnlInput): Promise<PnlResult> {
    const userWallets = await db
      .select({ id: wallets.id })
      .from(wallets)
      .where(eq(wallets.userId, input.userId));

    const walletIds = input.walletId !== undefined
      ? [input.walletId]
      : userWallets.map((w) => w.id);

    if (walletIds.length === 0) {
      return {
        realizedPnl: 0,
        unrealizedPnl: 0,
        totalFees: 0,
        positions: [],
      };
    }

    const positionRows = await db.select()
      .from(positions)
      .where(inArray(positions.walletId, walletIds));

    const realized = await this.sumRealized(walletIds);
    const tradeFees = await this.sumFees(walletIds);

    let unrealized = 0;
    const mapped = positionRows.map(position => {
      const currentValue = position.amount * input.currentPrice;
      const costBasis = position.amount * position.avgEntryPrice;
      const unrealizedPnl = currentValue - costBasis;
      unrealized += unrealizedPnl;

      return {
        mint: position.mint,
        amount: position.amount,
        avgEntryPrice: position.avgEntryPrice,
        currentPrice: input.currentPrice,
        realizedPnl: position.realizedPnl ?? 0,
        unrealizedPnl,
      };
    });

    return {
      realizedPnl: realized,
      unrealizedPnl: unrealized,
      totalFees: tradeFees,
      positions: mapped,
    };
  }

  async sumRealized(walletIds: number[]): Promise<number> {
    const [row] = await db.select({
      total: sql<number>`COALESCE(SUM(${trades.fee}), 0)`,
    })
      .from(trades)
      .where(and(
        eq(trades.status, 'confirmed'),
        inArray(trades.walletId, walletIds)
      ))
      .limit(1);

    return Number(row?.total ?? 0);
  }

  async sumFees(walletIds: number[]): Promise<number> {
    const [row] = await db.select({
      total: sql<number>`COALESCE(SUM(${trades.fee}), 0)`,
    })
      .from(trades)
      .where(and(
        eq(trades.status, 'confirmed'),
        inArray(trades.walletId, walletIds)
      ))
      .limit(1);

    return Number(row?.total ?? 0);
  }
}

export const pnlEngine = new PnlEngine();
