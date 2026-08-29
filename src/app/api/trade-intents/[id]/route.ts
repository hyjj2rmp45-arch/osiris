import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tradeIntents } from '@/lib/schema';
import { getAuthenticatedUser } from '@/lib/route-auth';
import { eq, and } from 'drizzle-orm';
import { tradeIntentService } from '@/services/trade-intent-service';
import { updateTradeIntentStatusSchema } from '@/lib/validation/trade-intent-validation';

// PATCH /api/trade-intents/[id] — update trade intent status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult as { userId: number };

    const { id } = await params;
    const intentId = parseInt(id, 10);
    if (isNaN(intentId)) {
      return NextResponse.json({ error: 'Invalid trade intent ID' }, { status: 400 });
    }

    const body = await request.json();
    const validated = updateTradeIntentStatusSchema.parse(body);

    const result = await tradeIntentService.updateStatus(
      intentId,
      user.userId,
      validated.status,
      validated.metadata ?? {}
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      intent: result.intent,
    });
  } catch (error) {
    console.error('PATCH /api/trade-intents/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update trade intent status' },
      { status: 500 }
    );
  }
}

// GET /api/trade-intents/[id] — get a specific trade intent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult as { userId: number };

    const { id } = await params;
    const intentId = parseInt(id, 10);
    if (isNaN(intentId)) {
      return NextResponse.json({ error: 'Invalid trade intent ID' }, { status: 400 });
    }

    const intent = await db
      .select()
      .from(tradeIntents)
      .where(and(eq(tradeIntents.id, intentId), eq(tradeIntents.userId, user.userId)))
      .limit(1);

    if (!intent || intent.length === 0) {
      return NextResponse.json({ error: 'Trade intent not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      intent: intent[0],
    });
  } catch (error) {
    console.error('GET /api/trade-intents/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trade intent' },
      { status: 500 }
    );
  }
}