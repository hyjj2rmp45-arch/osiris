import { NextRequest, NextResponse } from 'next/server';
import { postNtfy } from '@/lib/ntfy';
import { extractRequestContext } from '@/lib/request-context';
import { db } from '@/lib/db';
import { copyTargets } from '@/lib/schema';
import { copyTargetUpdateSchema } from '@/lib/validation';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { getAuthenticatedUser } from '@/lib/route-auth';
import { checkVelocity } from '@/lib/velocity';

export const dynamic = 'force-dynamic';

function isBuildTime() {
  return process.env.NEXT_PHASE === 'build' || process.env.NEXT_PHASE === 'export';
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  if (isBuildTime()) {
    return NextResponse.json({ error: 'Unavailable during build' }, { status: 503 });
  }

  const ctx = extractRequestContext(request);
  try {
    const velocity = await checkVelocity(String(userId), 'copy');
    if (!velocity.allowed) {
      return NextResponse.json({ error: 'velocity_limit_exceeded', ...velocity }, { status: 429 });
    }

    const body = await request.json();
    const validated = copyTargetUpdateSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: 'Invalid request', details: validated.error.issues }, { status: 400 });
    }

    const data = validated.data;
    const { id } = await params;
    const [target] = await db.update(copyTargets)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(copyTargets.id, parseInt(id)),
        eq(copyTargets.userId, userId)
      ))
      .returning();

    if (!target) {
      return NextResponse.json({ error: 'Copy target not found' }, { status: 404 });
    }

    return NextResponse.json({ target });
  } catch (error: any) {
    logger.error('PUT /api/copy-trading error:', error);
    await postNtfy('OSIRIS Error', `Copy-trading error: ${error.message || 'Internal Server Error'}`, 'error,copy-trading', ctx);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  if (isBuildTime()) {
    return NextResponse.json({ error: 'Unavailable during build' }, { status: 503 });
  }

  const ctx = extractRequestContext(request);
  try {
    const velocity = await checkVelocity(String(userId), 'copy');
    if (!velocity.allowed) {
      return NextResponse.json({ error: 'velocity_limit_exceeded', ...velocity }, { status: 429 });
    }

    const { id } = await params;
    const [target] = await db.delete(copyTargets)
      .where(and(
        eq(copyTargets.id, parseInt(id)),
        eq(copyTargets.userId, userId)
      ))
      .returning();

    if (!target) {
      return NextResponse.json({ error: 'Copy target not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('DELETE /api/copy-trading error:', error);
    await postNtfy('OSIRIS Error', `Copy-trading error: ${error.message || 'Internal Server Error'}`, 'error,copy-trading', ctx);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}