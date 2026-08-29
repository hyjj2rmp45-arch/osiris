import { NextRequest, NextResponse } from 'next/server';
import { postNtfy } from '@/lib/ntfy';
import { extractRequestContext } from '@/lib/request-context';
import { register } from '@/lib/metrics';
import { logger } from '@/lib/logger';
import { getAuthenticatedUser } from '@/lib/route-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const ctx = extractRequestContext(request);
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format');

    if (format === 'json') {
      const json = await register.getMetricsAsJSON();
      return NextResponse.json(json);
    }

    const metrics = await register.metrics();
    return new NextResponse(metrics, {
      status: 200,
      headers: { 'Content-Type': register.contentType },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await postNtfy('OSIRIS Error', `Metrics error: ${message}`, 'error,metrics', ctx);
    logger.error('[metrics] failed to collect:', err);
    return new NextResponse('# ERROR collecting metrics\n', { status: 500 });
  }
}