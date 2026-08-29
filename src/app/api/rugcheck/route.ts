import { NextRequest, NextResponse } from 'next/server';
import { postNtfy } from '@/lib/ntfy';
import { extractRequestContext } from '@/lib/request-context';
import { rugCheckService } from '@/services/safety/rugcheck';
import { logger } from '@/lib/logger';
import { getAuthenticatedUser } from '@/lib/route-auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const rugcheckQuerySchema = z.object({
  mint: z.string().min(32),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const ctx = extractRequestContext(request);
  try {
    const url = new URL(request.url);
    const query = rugcheckQuerySchema.parse({
      mint: url.searchParams.get('mint'),
    });

    const report = await rugCheckService.check(query.mint);
    return NextResponse.json(report);
  } catch (error) {
    logger.error('[RugCheck API] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    await postNtfy('OSIRIS Error', `RugCheck error: ${message}`, 'error,rugcheck', ctx);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}