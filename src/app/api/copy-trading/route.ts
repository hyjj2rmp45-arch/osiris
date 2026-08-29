import { NextRequest, NextResponse } from 'next/server';
import { postNtfy } from '@/lib/ntfy';
import { extractRequestContext } from '@/lib/request-context';
import { db } from '@/lib/db';
import { copyTargets, copyTrades } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { copyTargetCreateSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { getAuthenticatedUser } from '@/lib/route-auth';
import { checkVelocity } from '@/lib/velocity';

export const dynamic = 'force-dynamic';

function isBuildTime() {
  return process.env.NEXT_PHASE === 'build' || process.env.NEXT_PHASE === 'export';
}

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const ctx = extractRequestContext(request);
  if (isBuildTime()) {
    return NextResponse.json({ targets: [], _buildGuard: true });
  }

  try {
    const velocity = await checkVelocity(String(userId), 'copy');
    if (!velocity.allowed) {
      return NextResponse.json({ error: 'velocity_limit_exceeded', ...velocity }, { status: 429 });
    }

    const result = await db
      .select()
      .from(copyTargets)
      .where(eq(copyTargets.userId, userId));

    return NextResponse.json({ targets: result });
  } catch (error: any) {
    logger.error('GET /api/copy-trading error:', error);
    const message = error?.message || 'Internal Server Error';
    await postNtfy('OSIRIS Error', `Copy-trading error: ${message}`, 'error,copy-trading', ctx);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const ctx = extractRequestContext(request);
  if (isBuildTime()) {
    return NextResponse.json({ error: 'Unavailable during build' }, { status: 503 });
  }

  try {
    const velocity = await checkVelocity(String(userId), 'copy');
    if (!velocity.allowed) {
      return NextResponse.json({ error: 'velocity_limit_exceeded', ...velocity }, { status: 429 });
    }

    const body = await request.json();
    const validated = copyTargetCreateSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: 'Invalid request', details: validated.error.issues }, { status: 400 });
    }

    const data = validated.data;
    const [target] = await db.insert(copyTargets).values({
      userId,
      targetAddress: data.targetAddress,
      label: data.label ?? null,
      copyPercentage: data.copyPercentage,
      maxPositionSize: data.maxPositionSize,
      minTradeSize: data.minTradeSize,
      isActive: true,
    }).returning();

    return NextResponse.json({ target }, { status: 201 });
  } catch (error: any) {
    logger.error('POST /api/copy-trading error:', error);
    await postNtfy('OSIRIS Error', `Copy-trading error: ${error.message || 'Internal Server Error'}`, 'error,copy-trading', ctx);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}