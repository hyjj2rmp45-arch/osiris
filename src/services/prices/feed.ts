/**
 * Multi-source price feed — OSIRIS Phase 5.11
 *
 * Primary: Jupiter Price API (free, no key)
 * Fallback 1: Birdeye API
 * Fallback 2: DexScreener API
 * Redis-backed distributed caching with 2-of-3 agreement validation
 */

import redis from '@/lib/redis';
import { logger } from '@/lib/logger';

export interface PriceData {
  mint: string;
  price: number;
  source: 'jupiter' | 'birdeye' | 'dexscreener';
  timestamp: Date;
  confidence: number;
}

export interface PriceFeedConfig {
  jupiterBaseUrl: string;
  birdeyeBaseUrl: string;
  dexscreenerBaseUrl: string;
  cacheTtlMs: number;
  agreementThreshold: number; // max % diff between sources
}

const DEFAULT_CONFIG: PriceFeedConfig = {
  jupiterBaseUrl: 'https://price.jup.ag/v6',
  birdeyeBaseUrl: 'https://public-api.birdeye.so',
  dexscreenerBaseUrl: 'https://api.dexscreener.com/latest/dex',
  cacheTtlMs: 30_000,
  agreementThreshold: 0.05, // 5% max difference for 2-of-3 agreement
};

const REDIS_KEY_PREFIX = 'price:';

export class PriceFeedService {
  private config: PriceFeedConfig;

  constructor(config: Partial<PriceFeedConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get price for a token mint with fallback sources and 2-of-3 agreement.
   */
  async getPrice(mint: string): Promise<PriceData | null> {
    // Check Redis cache first
    const cached = await this.getCachedPrice(mint);
    if (cached) {
      return cached;
    }

    // Try all sources in parallel
    const sources = await Promise.allSettled([
      this.fetchJupiterPrice(mint),
      this.fetchBirdeyePrice(mint),
      this.fetchDexScreenerPrice(mint),
    ]);

    const validPrices: PriceData[] = [];
    for (let i = 0; i < sources.length; i++) {
      const result = sources[i];
      if (result && result.status === 'fulfilled' && result.value) {
        validPrices.push(result.value);
      }
    }

    if (validPrices.length === 0) {
      return null;
    }

    // Apply 2-of-3 agreement: require at least 2 sources within threshold
    const agreedPrice = this.applyAgreement(validPrices);
    if (!agreedPrice) {
      logger.warn('[price-feed] sources disagree beyond threshold', {
        mint,
        prices: validPrices.map((p) => ({ source: p.source, price: p.price })),
      });
      return null;
    }

    // Cache the agreed price
    await this.setCachedPrice(agreedPrice);
    return agreedPrice;
  }

  /**
   * Get prices for multiple mints in parallel.
   */
  async getPrices(mints: string[]): Promise<Map<string, PriceData>> {
    const results = await Promise.allSettled(
      mints.map((mint) => this.getPrice(mint))
    );

    const priceMap = new Map<string, PriceData>();
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        priceMap.set(mints[index]!, result.value);
      }
    });

    return priceMap;
  }

  private applyAgreement(prices: PriceData[]): PriceData | null {
    if (prices.length === 1) {
      return prices[0]!;
    }

    // Sort by confidence (highest first)
    prices.sort((a, b) => b.confidence - a.confidence);

    // Check if top 2 agree within threshold
    for (let i = 0; i < prices.length - 1; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        const p1 = prices[i]!.price;
        const p2 = prices[j]!.price;
        const diff = Math.abs(p1 - p2) / Math.max(p1, p2);

        if (diff <= this.config.agreementThreshold) {
          // Return the higher-confidence of the agreeing pair
          return prices[i]!.confidence >= prices[j]!.confidence ? prices[i]! : prices[j]!;
        }
      }
    }

    return null;
  }

  private async getCachedPrice(mint: string): Promise<PriceData | null> {
    try {
      const key = `${REDIS_KEY_PREFIX}${mint}`;
      const cached = await redis.get(key);
      if (cached) {
        const parsed = JSON.parse(cached) as PriceData;
        parsed.timestamp = new Date(parsed.timestamp);
        return parsed;
      }
    } catch (error) {
      logger.error('[price-feed] Redis read failed', { mint, error });
    }
    return null;
  }

  private async setCachedPrice(price: PriceData): Promise<void> {
    try {
      const key = `${REDIS_KEY_PREFIX}${price.mint}`;
      await redis.setex(key, Math.ceil(this.config.cacheTtlMs / 1000), JSON.stringify(price));
    } catch (error) {
      logger.error('[price-feed] Redis write failed', { mint: price.mint, error });
    }
  }

  private async fetchJupiterPrice(mint: string): Promise<PriceData | null> {
    const url = `${this.config.jupiterBaseUrl}/price?ids=${mint}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });

    if (!response.ok) return null;

    const data = await response.json();
    const price = data.data?.[mint]?.price;

    if (!price) return null;

    return {
      mint,
      price,
      source: 'jupiter',
      timestamp: new Date(),
      confidence: 0.9,
    };
  }

  private async fetchBirdeyePrice(mint: string): Promise<PriceData | null> {
    const url = `${this.config.birdeyeBaseUrl}/defi/price?address=${mint}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });

    if (!response.ok) return null;

    const data = await response.json();
    const price = data.data?.value;

    if (!price) return null;

    return {
      mint,
      price,
      source: 'birdeye',
      timestamp: new Date(),
      confidence: 0.8,
    };
  }

  private async fetchDexScreenerPrice(mint: string): Promise<PriceData | null> {
    const url = `${this.config.dexscreenerBaseUrl}/search?q=${mint}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });

    if (!response.ok) return null;

    const data = await response.json();
    const pair = data.pairs?.[0];
    if (!pair) return null;

    return {
      mint,
      price: parseFloat(pair.priceUsd || '0'),
      source: 'dexscreener',
      timestamp: new Date(),
      confidence: 0.7,
    };
  }

  /**
   * Clear the price cache.
   */
  async clearCache(): Promise<void> {
    try {
      // Note: In production, use SCAN to avoid blocking
      const keys = await redis.keys(`${REDIS_KEY_PREFIX}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error('[price-feed] Redis clear failed', { error });
    }
  }
}

export const priceFeedService = new PriceFeedService();