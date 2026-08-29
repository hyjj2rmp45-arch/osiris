/**
 * OSIRIS Auto-Renewal Endpoint
 * Allows users to toggle auto-renewal for their subscription.
 * When enabled, the backend will automatically extend subscription
 * when a new payment is detected on-chain.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/session';
import { db } from '@/lib/db';
import { users, sessions } from '@/lib/schema';
import { eq, and, gt } from 'drizzle-orm';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: 'no_session' }, { status: 401 });
  }

  try {
    const sessionResult = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionToken), gt(sessions.expiresAt, new Date())))
      .limit(1);

    const session = sessionResult[0];
    if (!session) {
      return NextResponse.json({ error: 'session_expired' }, { status: 401 });
    }

    const userResult = await db
      .select({
        autoRenew: users.autoRenew,
        tier: users.tier,
        currentPeriodEnd: users.currentPeriodEnd,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const user = userResult[0];
    if (!user) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 401 });
    }

    return NextResponse.json({
      autoRenew: user.autoRenew,
      tier: user.tier,
      currentPeriodEnd: user.currentPeriodEnd?.toISOString() || null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'db_unavailable', message: err instanceof Error ? err.message : 'Database error' },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: { enabled: boolean };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const { enabled } = body;

  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'invalid_enabled_value' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: 'no_session' }, { status: 401 });
  }

  try {
    const sessionResult = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionToken), gt(sessions.expiresAt, new Date())))
      .limit(1);

    const session = sessionResult[0];
    if (!session) {
      return NextResponse.json({ error: 'session_expired' }, { status: 401 });
    }

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const user = userResult[0];
    if (!user) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 401 });
    }

    // Update auto-renewal setting
    await db
      .update(users)
      .set({ autoRenew: enabled, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    await logAuditEvent({
      type: 'subscription.auto_renew.toggled',
      userId: user.id,
      telegramId: parseInt(user.telegramId, 10),
      metadata: { enabled, previousValue: user.autoRenew },
    });

    return NextResponse.json({
      ok: true,
      autoRenew: enabled,
      tier: user.tier,
      currentPeriodEnd: user.currentPeriodEnd?.toISOString() || null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'server_error', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
