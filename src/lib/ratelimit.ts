import { redis } from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';

const WINDOW_MS = 60_000;
const LIMITS = {
  auth: { max: 10, key: (ip: string) => `rl:auth:${ip}` },
  api: { max: 60, key: (ip: string) => `rl:api:${ip}` },
  trade: { max: 10, key: (ip: string) => `rl:trade:${ip}` },
} as const;

type LimitKey = keyof typeof LIMITS;

async function checkRateLimit(ip: string, limitKey: LimitKey): Promise<{ allowed: boolean; remaining: number }> {
  const { max, key } = LIMITS[limitKey];
  const redisKey = key(ip);

  try {
    const current = await redis.incr(redisKey);
    if (current === 1) {
      await redis.pexpire(redisKey, WINDOW_MS);
    }
    const remaining = Math.max(0, max - current);
    return { allowed: current <= max, remaining };
  } catch {
    return { allowed: true, remaining: max };
  }
}

export async function rateLimitMiddleware(request: NextRequest, limitKey: LimitKey = 'api') {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown';

  const { allowed, remaining } = await checkRateLimit(ip, limitKey);

  const response = allowed
    ? NextResponse.next()
    : NextResponse.json(
        { error: 'rate_limited', message: 'Too many requests' },
        { status: 429 }
      );

  response.headers.set('X-RateLimit-Limit', String(LIMITS[limitKey].max));
  response.headers.set('X-RateLimit-Remaining', String(remaining));

  return response;
}
