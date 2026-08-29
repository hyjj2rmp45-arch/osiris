import { NextRequest, NextResponse } from 'next/server';
import { postNtfy } from '@/lib/ntfy';
import { extractRequestContext } from '@/lib/request-context';
import { taxLotService } from '@/services/safety/tax-lots';
import { getAuthenticatedUser } from '@/lib/route-auth';
import { checkVelocity } from '@/lib/velocity';
import { taxLotSellSchema } from '@/lib/validation';
import { db } from '@/lib/db';
import { wallets } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const ctx = extractRequestContext(request);
  try {
    const url = new URL(request.url);
    const mint = url.searchParams.get('mint') || undefined;
    const result = await taxLotService.getOpenLots(userId, mint);
    return NextResponse.json({ lots: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await postNtfy('OSIRIS Error', `TaxLots error: ${message}`, 'error,tax-lots', ctx);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const ctx = extractRequestContext(request);
  try {
    const velocity = await checkVelocity(String(userId), 'trade');
    if (!velocity.allowed) {
      return NextResponse.json({ error: 'velocity_limit_exceeded', ...velocity }, { status: 429 });
    }

    const body = await request.json();
    const validated = taxLotSellSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: 'Invalid request', details: validated.error.issues }, { status: 400 });
    }

    const walletResult = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    const userWallet = walletResult[0];
    if (!userWallet) {
      return NextResponse.json({ error: 'wallet_not_registered' }, { status: 400 });
    }

    const result = await taxLotService.sell({
      userId,
      walletId: userWallet.id,
      mint: validated.data.mint,
      sellAmount: validated.data.amount,
      sellPrice: validated.data.price,
      sellTimestamp: new Date(),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await postNtfy('OSIRIS Error', `TaxLots error: ${message}`, 'error,tax-lots', ctx);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}