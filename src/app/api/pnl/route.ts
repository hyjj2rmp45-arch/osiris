import { NextRequest, NextResponse } from 'next/server';
import { postNtfy } from '@/lib/ntfy';
import { extractRequestContext } from '@/lib/request-context';
import { pnlEngine } from '@/services/safety/pnl-engine';
import { getAuthenticatedUser } from '@/lib/route-auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const pnlQuerySchema = z.object({
  userId: z.coerce.number().int().positive(),
  walletId: z.coerce.number().int().positive().optional(),
  currentPrice: z.coerce.number().nonnegative().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const ctx = extractRequestContext(request);
  try {
    const url = new URL(request.url);
    const query = pnlQuerySchema.parse({
      userId: url.searchParams.get('userId'),
      walletId: url.searchParams.get('walletId'),
      currentPrice: url.searchParams.get('currentPrice'),
    });

    const input: any = { userId: query.userId };
    if (query.walletId != null) input.walletId = query.walletId;
    if (query.currentPrice != null) input.currentPrice = query.currentPrice;

    const result = await pnlEngine.compute(input);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await postNtfy('OSIRIS Error', `PnL error: ${message}`, 'error,pnl', ctx);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}