import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tradeIntents } from '@/lib/schema';
import { getAuthenticatedUser } from '@/lib/route-auth';
import { tokenomics } from '@/lib/tokenomics';
import { eq, and, desc } from 'drizzle-orm';
import { createTradeIntentSchema } from '@/lib/validation/trade-intent-validation';
import { rateLimitMiddleware } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware(request, 'trade');
  if (rateLimitResponse.status !== 200) {
    return rateLimitResponse;
  }

  try {
    const userOrResponse = await getAuthenticatedUser(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }
    const user = userOrResponse as { userId: number };

    const body = await request.json();
    const validated = createTradeIntentSchema.parse(body);

    const payoutResult = tokenomics.calculatePayout(validated.inputAmount);

    const [intent] = await db
      .insert(tradeIntents)
      .values({
        userId: user.userId,
        walletId: validated.walletId,
        inputMint: validated.inputMint,
        outputMint: validated.outputMint,
        inputAmount: validated.inputAmount,
        slippageBps: validated.slippageBps,
        priorityFeeLamports: validated.priorityFeeLamports,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        intent,
        fees: payoutResult.fees,
        netAmount: payoutResult.netAmount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/trade-intents error:', error);
    return NextResponse.json(
      { error: 'Failed to create trade intent' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await getAuthenticatedUser(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }
    const user = userOrResponse as { userId: number };

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

    const intents = status
      ? await db
          .select()
          .from(tradeIntents)
          .where(
            and(eq(tradeIntents.userId, user.userId), eq(tradeIntents.status, status))
          )
          .orderBy(desc(tradeIntents.createdAt))
          .limit(limit)
      : await db
          .select()
          .from(tradeIntents)
          .where(eq(tradeIntents.userId, user.userId))
          .orderBy(desc(tradeIntents.createdAt))
          .limit(limit);

    return NextResponse.json({ success: true, intents });
  } catch (error) {
    console.error('GET /api/trade-intents error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trade intents' },
      { status: 500 }
    );
  }
}
