/**
 * P5.4 — Token Metadata Cache
 *
 * Multi-source metadata with Redis cache and DB persistence.
 */

import { logger } from '@/lib/logger';
import redis from '@/lib/redis';
import { db } from '@/lib/db';
import { tokenMetadata } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { AdminAlerts } from '@/lib/admin-alerts';

export interface TokenMetadata {
  mint: string;
  name: string | undefined;
  symbol: string | undefined;
  decimals: number | undefined;
  logoUri: string | undefined;
  price: number | undefined;
  priceUsd: number | undefined;
  isToken2022: boolean | undefined;
  riskScore: number | undefined;
  mintAuthority: string | undefined;
  freezeAuthority: string | undefined;
  transferHookProgramId: string | undefined;
  isAuthoritySafe: boolean | undefined;
  safetyScore: number | undefined;
}

const CACHE_TTL = 60 * 60; // 1 hour
const CACHE_KEY_PREFIX = 'token-metadata:';

export class TokenMetadataService {
  evaluateSafety(metadata: Partial<TokenMetadata> | undefined): { isAuthoritySafe: boolean; safetyScore: number } {
    if (!metadata) {
      return { isAuthoritySafe: false, safetyScore: 0 };
    }

    let score = 100;

    if (metadata.mintAuthority) {
      score -= 40;
    }

    if (metadata.freezeAuthority) {
      score -= 40;
    }

    if (metadata.transferHookProgramId) {
      score -= 20;
    }

    const clampedScore = Math.max(0, Math.min(100, score));
    return {
      isAuthoritySafe: clampedScore >= 70,
      safetyScore: clampedScore,
    };
  }

  async get(mint: string): Promise<TokenMetadata | null> {
    const cacheKey = `${CACHE_KEY_PREFIX}${mint}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as TokenMetadata;
          if (parsed && parsed.mint) {
            return parsed;
          }
        } catch {
          // ignore corrupt cache
        }
      }
    } catch (err) {
      AdminAlerts.high(`Token metadata cache read failed: ${err instanceof Error ? err.message : err}`, mint, 'token-metadata');
    }

    let row: any[] = [];
    try {
      row = await db.select()
        .from(tokenMetadata)
        .where(eq(tokenMetadata.mint, mint))
        .limit(1);
    } catch (err) {
      AdminAlerts.high(`Token metadata DB read failed: ${err instanceof Error ? err.message : err}`, mint, 'token-metadata');
      return null;
    }

    if (row[0]) {
      const metadata: TokenMetadata = {
        mint: row[0].mint,
        name: row[0].name ?? undefined,
        symbol: row[0].symbol ?? undefined,
        decimals: row[0].decimals ?? undefined,
        logoUri: row[0].logoUri ?? undefined,
        price: row[0].price ?? undefined,
        priceUsd: row[0].priceUsd ?? undefined,
        isToken2022: row[0].isToken2022 ?? undefined,
        riskScore: row[0].riskScore ?? undefined,
        mintAuthority: row[0].mintAuthority ?? undefined,
        freezeAuthority: row[0].freezeAuthority ?? undefined,
        transferHookProgramId: row[0].transferHookProgramId ?? undefined,
        isAuthoritySafe: row[0].isAuthoritySafe ?? undefined,
        safetyScore: row[0].safetyScore ?? undefined,
      };

      try {
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(metadata));
      } catch {
        // Ignore cache errors
      }

      return metadata;
    }

    return null;
  }

  async set(metadata: TokenMetadata): Promise<void> {
    const cacheKey = `${CACHE_KEY_PREFIX}${metadata.mint}`;

    try {
      await db.insert(tokenMetadata).values({
        mint: metadata.mint,
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: metadata.decimals,
        logoUri: metadata.logoUri,
        price: metadata.price,
        priceUsd: metadata.priceUsd,
        isToken2022: metadata.isToken2022,
        riskScore: metadata.riskScore,
        mintAuthority: metadata.mintAuthority,
        freezeAuthority: metadata.freezeAuthority,
        transferHookProgramId: metadata.transferHookProgramId,
        isAuthoritySafe: metadata.isAuthoritySafe,
        safetyScore: metadata.safetyScore,
        lastFetchedAt: new Date(),
      }).onConflictDoUpdate({
        target: [tokenMetadata.mint],
        set: {
          name: metadata.name,
          symbol: metadata.symbol,
          decimals: metadata.decimals,
          logoUri: metadata.logoUri,
          price: metadata.price,
          priceUsd: metadata.priceUsd,
          isToken2022: metadata.isToken2022,
          riskScore: metadata.riskScore,
          lastFetchedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      AdminAlerts.high(`Token metadata DB write failed: ${err instanceof Error ? err.message : err}`, metadata.mint, 'token-metadata');
    }

    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(metadata));
    } catch {
      // Ignore cache errors
    }
  }
}

export const tokenMetadataService = new TokenMetadataService();
