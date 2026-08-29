import { NextRequest, NextResponse } from 'next/server';
import { postNtfy } from '@/lib/ntfy';
import { extractRequestContext } from '@/lib/request-context';
import { rateLimiterService, type RateLimitAction } from '@/services/safety/rate-limiter';
import { logger } from '@/lib/logger';
import { getAuthenticatedUser } from '@/lib/route-auth';
import { rateLimitOverrideSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const ctx = extractRequestContext(request);
  try {
    const url = new URL(request.url);
    const identifier = url.searchParams.get('identifier') || 'global';
    const action = (url.searchParams.get('action') as RateLimitAction) || 'trade';

    const status = await rateLimiterService.check(identifier, action);
    return NextResponse.json(status);
  } catch (error) {
    logger.error('[RateLimits API] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    await postNtfy('OSIRIS Error', `RateLimits error: ${message}`, 'error,rate-limits', ctx);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const ctx = extractRequestContext(request);
  try {
    const body = await request.json();
    const validated = rateLimitOverrideSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: 'Invalid request', details: validated.error.issues }, { status: 400 });
    }

    const { identifier, action } = validated.data;
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
  } catch (error) {
    logger.error('[RateLimits API] Error configuring limit:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    await postNtfy('OSIRIS Error', `RateLimits error: ${message}`, 'error,rate-limits', ctx);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}