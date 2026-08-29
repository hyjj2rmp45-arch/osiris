import { NextRequest, NextResponse } from 'next/server';
import { postNtfy } from '@/lib/ntfy';
import { extractRequestContext } from '@/lib/request-context';
import { getAuthenticatedUser } from '@/lib/route-auth';
import { priceFeedService } from '@/services/prices/feed';

export const dynamic = 'force-dynamic';

const MAX_STALENESS_MS = 30_000; // 30 seconds
const SOURCE_AGREEMENT_THRESHOLD = 0.005; // 0.5% max spread

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const ctx = extractRequestContext(request);

  try {
    const url = new URL(request.url);
    const mint = url.searchParams.get('mint');

    if (!mint || typeof mint !== 'string' || mint.length < 32 || mint.length > 44) {
      return NextResponse.json({ error: 'invalid_mint' }, { status: 400 });
    }

    const priceData = await priceFeedService.getPrice(mint);

    if (!priceData) {
      return NextResponse.json(
        { error: 'price_unavailable', mint },
        { status: 503 }
      );
    }

    const stalenessMs = Date.now() - priceData.timestamp.getTime();
    if (stalenessMs > MAX_STALENESS_MS) {
      return NextResponse.json(
        {
          error: 'price_stale',
          mint,
          stalenessMs,
          maxStalenessMs: MAX_STALENESS_MS,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      mint: priceData.mint,
      price: priceData.price,
      source: priceData.source,
      confidence: priceData.confidence,
      timestamp: priceData.timestamp.toISOString(),
      stalenessMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await postNtfy('OSIRIS Error', `Prices error: ${message}`, 'error,prices', ctx);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
