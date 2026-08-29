import { db } from '@/lib/db';
import { velocityLimits } from '@/lib/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export interface VelocityResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
}

export async function checkVelocity(identifier: string, action: 'trade' | 'copy' | 'api', limit?: number): Promise<VelocityResult> {
  const dailyLimit = limit ?? 10;
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const existing = await db
    .select()
    .from(velocityLimits)
    .where(and(
      eq(velocityLimits.identifier, identifier),
      eq(velocityLimits.action, action),
      gte(velocityLimits.windowDate, windowStart)
    ))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(velocityLimits).values({
      identifier,
      action,
      dailyCount: 1,
      dailyLimit,
      windowDate: now,
    });
    return {
      allowed: true,
      remaining: dailyLimit - 1,
      limit: dailyLimit,
      resetAt: new Date(windowStart.getTime() + 24 * 60 * 60 * 1000),
    };
  }

  const record = existing[0];
  if (!record) {
    await db.insert(velocityLimits).values({
      identifier,
      action,
      dailyCount: 1,
      dailyLimit,
      windowDate: now,
    });
    return {
      allowed: true,
      remaining: dailyLimit - 1,
      limit: dailyLimit,
      resetAt: new Date(windowStart.getTime() + 24 * 60 * 60 * 1000),
    };
  }

  if (record.dailyCount >= dailyLimit) {
    logger.warn('velocity.limit_reached', {
      identifier,
      action,
      dailyCount: record.dailyCount,
      dailyLimit,
    });
    return {
      allowed: false,
      remaining: 0,
      limit: dailyLimit,
      resetAt: new Date(record.windowDate.getTime() + 24 * 60 * 60 * 1000),
    };
  }

  await db
    .update(velocityLimits)
    .set({ dailyCount: record.dailyCount + 1 })
    .where(eq(velocityLimits.id, record.id));

  return {
    allowed: true,
    remaining: dailyLimit - record.dailyCount - 1,
    limit: dailyLimit,
    resetAt: new Date(record.windowDate.getTime() + 24 * 60 * 60 * 1000),
  };
}

export async function resetVelocity(identifier: string, action: 'trade' | 'copy' | 'api'): Promise<void> {
  await db
    .update(velocityLimits)
    .set({ dailyCount: 0 })
    .where(and(
      eq(velocityLimits.identifier, identifier),
      eq(velocityLimits.action, action)
    ));
}
