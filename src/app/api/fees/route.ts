import { NextRequest, NextResponse } from 'next/server';
import { postNtfy } from '@/lib/ntfy';
import { extractRequestContext } from '@/lib/request-context';
import { feeStrategyService } from '@/services/fees/strategy';
import { assertSignedIn } from '@/lib/route-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const unauthorized = assertSignedIn(request);
  if (unauthorized) return unauthorized;
  const ctx = extractRequestContext(request);
  try {
    const body = await request.json();
    const result = await feeStrategyService.compute(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await postNtfy('OSIRIS Error', `Fees error: ${message}`, 'error,fees', ctx);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}