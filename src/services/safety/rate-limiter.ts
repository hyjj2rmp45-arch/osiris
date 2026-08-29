/**
 * P5.6 — Rate Limiting Service
 *
 * Per-action rate limits with Redis sliding window and fail-open/closed policies.
 */

import redis from '@/lib/redis';
import { db } from '@/lib/db';
import { rateLimits } from '@/lib/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { AdminAlerts } from '@/lib/admin-alerts';

export type RateLimitAction = 'trade' | 'copy' | 'webhook' | 'auth' | 'api';

export interface RateLimitConfig {
  action: RateLimitAction;
  limit: number;
  windowMs: number;
  failOpen?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const DEFAULT_CONFIGS: Record<RateLimitAction, RateLimitConfig> = {
  trade: { action: 'trade', limit: 10, windowMs: 60_000, failOpen: false },
  copy: { action: 'copy', limit: 20, windowMs: 60_000, failOpen: true },
  webhook: { action: 'webhook', limit: 100, windowMs: 60_000, failOpen: true },
  auth: { action: 'auth', limit: 5, windowMs: 60_000, failOpen: false },
  api: { action: 'api', limit: 100, windowMs: 60_000, failOpen: true },
};

export class RateLimiterService {
  async check(identifier: string, action: RateLimitAction): Promise<RateLimitResult> {
    const config = DEFAULT_CONFIGS[action];
    const key = `rate-limit:${action}:${identifier}`;

    try {
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Redis sliding window
      const count = await this.getCount(key, windowStart);

      if (count >= config.limit) {
        // Block in DB as well
        await this.block(identifier, action);
        AdminAlerts.system.rateLimitExceeded(`/${action}`, identifier);
        return {
          allowed: false,
          remaining: 0,
          resetAt: now + config.windowMs,
        };
      }

      // Increment count
      await this.increment(key, now);

      return {
        allowed: true,
        remaining: config.limit - count - 1,
        resetAt: now + config.windowMs,
      };
    } catch (error) {
      // Fail-open or fail-closed based on action policy
      AdminAlerts.high(`Rate limiter failure: ${error instanceof Error ? error.message : error}`, action, 'rate-limiter');
      if (config.failOpen) {
        return { allowed: true, remaining: 0, resetAt: Date.now() + config.windowMs };
      }
      return { allowed: false, remaining: 0, resetAt: Date.now() + config.windowMs };
    }
  }

  private async getCount(key: string, windowStart: number): Promise<number> {
    try {
      await redis.zremrangebyscore(key, 0, windowStart);
      return await redis.zcard(key);
    } catch (err) {
      AdminAlerts.high(`Rate limiter Redis read failed: ${err instanceof Error ? err.message : err}`, key, 'rate-limiter');
      return 0;
    }
  }

  private async increment(key: string, timestamp: number): Promise<void> {
    try {
      await redis.zadd(key, timestamp, `${timestamp}-${Math.random()}`);
      await redis.expire(key, 60);
    } catch (err) {
      AdminAlerts.medium(`Rate limiter Redis write failed: ${err instanceof Error ? err.message : err}`, key, 'rate-limiter');
    }
  }

  private async block(identifier: string, action: RateLimitAction): Promise<void> {
    try {
      await db.insert(rateLimits).values({
        identifier,
        action,
        count: 999,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 60_000),
        isBlocked: true,
      });
    } catch (err) {
      AdminAlerts.high(`Rate limiter DB write failed: ${err instanceof Error ? err.message : err}`, `${action}:${identifier}`, 'rate-limiter');
    }
  }

  async isBlocked(identifier: string, action: RateLimitAction): Promise<boolean> {
    try {
      const [row] = await db.select()
        .from(rateLimits)
        .where(and(
          eq(rateLimits.identifier, identifier),
          eq(rateLimits.action, action),
          eq(rateLimits.isBlocked, true),
          gte(rateLimits.windowEnd, new Date()),
        ))
        .limit(1);

      return !!row;
    } catch (err) {
      AdminAlerts.high(`Rate limiter DB read failed: ${err instanceof Error ? err.message : err}`, `${action}:${identifier}`, 'rate-limiter');
      return false;
    }
  }
}

export const rateLimiterService = new RateLimiterService();
