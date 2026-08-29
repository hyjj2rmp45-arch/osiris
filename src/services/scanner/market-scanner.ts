/**
 * Market scanner + momentum engine — OSIRIS
 *
 * Produces ranked candidate tokens based on:
 * - Price confidence from multi-source feed
 * - Rug-check pass
 * - Token authority safety
 *
 * Output is advisory only; execution still requires explicit trade-intent approval.
 */

import { eq, desc, sql, and, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tokenMetadata } from '@/lib/schema';
import { priceFeedService } from '@/services/prices/feed';
import { rugCheckService } from '@/services/safety/rugcheck';
import { tokenMetadataService, type TokenMetadata } from '@/services/safety/token-metadata';

export interface CandidateScore {
  mint: string;
  symbol: string | undefined;
  score: number;
  reasons: string[];
  risk: 'low' | 'medium' | 'high';
}

export class MarketScanner {
  async scan(limit = 20): Promise<CandidateScore[]> {
    const recentTokens = await db
      .select({
        mint: tokenMetadata.mint,
        symbol: tokenMetadata.symbol,
        safetyScore: tokenMetadata.safetyScore,
        isAuthoritySafe: tokenMetadata.isAuthoritySafe,
      })
      .from(tokenMetadata)
      .where(and(gt(tokenMetadata.safetyScore, 50), eq(tokenMetadata.isAuthoritySafe, true)))
      .orderBy(desc(tokenMetadata.safetyScore))
      .limit(limit * 2);

    if (recentTokens.length === 0) {
      return [];
    }

    const mints = recentTokens.map((t) => t.mint);
    const prices = await priceFeedService.getPrices(mints);

    const scored: CandidateScore[] = [];

    for (const token of recentTokens) {
      const price = prices.get(token.mint);
      if (!price) continue;

      const rug = await rugCheckService.check(token.mint);
      if (!rug.passed) continue;

      const safety = tokenMetadataService.evaluateSafety({
        mint: token.mint,
        symbol: token.symbol ?? undefined,
        safetyScore: token.safetyScore ?? 0,
        isAuthoritySafe: token.isAuthoritySafe ?? false,
      } as Partial<TokenMetadata>);
      if (!safety.isAuthoritySafe) continue;

      const normalizedToken = {
        symbol: token.symbol ?? undefined,
        safetyScore: token.safetyScore ?? 0,
      };

      const score = this.computeScore(price, normalizedToken, rug);
      scored.push({
        mint: token.mint,
        symbol: normalizedToken.symbol,
        score,
        reasons: this.describeReasons(price, normalizedToken, rug),
        risk: this.classifyRisk(safety.safetyScore),
      });
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private computeScore(
    price: { confidence: number; source: string; price: number },
    token: { symbol: string | undefined; safetyScore: number },
    rug: { riskScore: number; passed: boolean }
  ): number {
    let score = 0;

    if (price.confidence > 0.8) score += 30;
    if (price.source === 'jupiter') score += 10;
    if (token.symbol) score += 10;
    if (rug.passed && rug.riskScore > 70) score += 20;
    if (token.safetyScore > 80) score += 15;

    return Math.min(score, 100);
  }

  private describeReasons(
    price: { confidence: number; source: string },
    token: { symbol: string | undefined },
    rug: { riskScore: number; passed: boolean }
  ): string[] {
    const reasons: string[] = [];

    if (price.confidence > 0.8) reasons.push('high_confidence');
    if (price.source === 'jupiter') reasons.push('jupiter_source');
    if (token.symbol) reasons.push('named');
    if (rug.passed && rug.riskScore > 70) reasons.push('rugcheck_pass');

    return reasons;
  }

  private classifyRisk(safetyScore: number): 'low' | 'medium' | 'high' {
    if (safetyScore >= 80) return 'low';
    if (safetyScore >= 60) return 'medium';
    return 'high';
  }
}

export const marketScanner = new MarketScanner();
