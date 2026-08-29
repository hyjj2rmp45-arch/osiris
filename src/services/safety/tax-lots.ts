/**
 * P5.2 — Tax Lot Accounting (FIFO)
 *
 * FIFO lot matching algorithm for cost basis tracking.
 */

import { db } from '@/lib/db';
import { taxLots } from '@/lib/schema';
import { and, eq, sql } from 'drizzle-orm';

export interface TaxLot {
  id?: number;
  userId: number;
  walletId: number;
  mint: string;
  amount: number;
  originalAmount: number;
  costBasis: number;
  costBasisUsd?: number | null;
  acquisitionDate: Date;
  acquisitionPrice: number;
  acquisitionSlot?: number | null;
  isClosed: boolean;
  closedAt?: Date | null;
  realizedPnl?: number | null;
}

export interface TaxLotInput {
  userId: number;
  walletId: number;
  mint: string;
  amount: number;
  costBasis: number;
  costBasisUsd: number;
  acquisitionPrice: number;
  acquisitionSlot?: number;
}

export interface SellInput {
  userId: number;
  walletId: number;
  mint: string;
  sellAmount: number;
  sellPrice: number;
  sellTimestamp: Date;
}

export interface MatchResult {
  matchedAmount: number;
  costBasis: number;
  realizedPnl: number;
  lotsUsed: Array<{ lotId: number; amount: number; costBasis: number }>;
}

export class TaxLotService {
  async createLot(input: TaxLotInput): Promise<TaxLot> {
    const [lot] = await db.insert(taxLots).values({
      userId: input.userId,
      walletId: input.walletId,
      mint: input.mint,
      amount: input.amount,
      originalAmount: input.amount,
      costBasis: input.costBasis,
      costBasisUsd: input.costBasisUsd,
      acquisitionPrice: input.acquisitionPrice,
      acquisitionSlot: input.acquisitionSlot ?? null,
    }).returning();

    if (!lot) {
      throw new Error('Failed to create tax lot');
    }

    return lot as TaxLot;
  }

  async sell(input: SellInput): Promise<MatchResult> {
    const openLots = await db.select()
      .from(taxLots)
      .where(eq(taxLots.userId, input.userId))
      .orderBy(taxLots.acquisitionDate);

    const matched: MatchResult = {
      matchedAmount: 0,
      costBasis: 0,
      realizedPnl: 0,
      lotsUsed: [],
    };

    let remaining = input.sellAmount;

    for (const lot of openLots) {
      if (remaining <= 0) break;

      const lotAvailable = lot.amount - matched.lotsUsed
        .filter(u => u.lotId === lot.id)
        .reduce((s, u) => s + u.amount, 0);

      if (lotAvailable <= 0) continue;

      const useAmount = Math.min(remaining, lotAvailable);
      const lotCostBasis = (useAmount / lot.amount) * lot.costBasis;
      const lotPnl = (useAmount * input.sellPrice) - lotCostBasis;

      matched.matchedAmount += useAmount;
      matched.costBasis += lotCostBasis;
      matched.realizedPnl += lotPnl;
      matched.lotsUsed.push({ lotId: lot.id, amount: useAmount, costBasis: lotCostBasis });

      remaining -= useAmount;
    }

    if (matched.matchedAmount > 0) {
      await this.applyMatches(input, matched);
    }

    return matched;
  }

  async getOpenLots(userId: number, mint?: string) {
    const where = mint
      ? and(eq(taxLots.userId, userId), eq(taxLots.mint, mint))
      : eq(taxLots.userId, userId);

    return db.select()
      .from(taxLots)
      .where(where)
      .orderBy(taxLots.acquisitionDate);
  }

  private async applyMatches(sell: SellInput, result: MatchResult): Promise<void> {
    for (const used of result.lotsUsed) {
      await db.update(taxLots)
        .set({
          amount: sql`${taxLots.amount} - ${used.amount}`,
          isClosed: sql`CASE WHEN ${taxLots.amount} - ${used.amount} <= 0 THEN true ELSE ${taxLots.isClosed} END`,
          closedAt: sql`CASE WHEN ${taxLots.amount} - ${used.amount} <= 0 THEN ${sell.sellTimestamp} ELSE ${taxLots.closedAt} END`,
          realizedPnl: sql`${taxLots.realizedPnl} + ${(used.amount / sell.sellAmount) * result.realizedPnl}`,
          updatedAt: new Date(),
        })
        .where(eq(taxLots.id, used.lotId));
    }
  }
}

export const taxLotService = new TaxLotService();
