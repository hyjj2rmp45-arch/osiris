/**
 * OSIRIS Payment Verification Endpoint
 * Uses comprehensive payment handler for all scenarios
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/session';
import { db } from '@/lib/db';
import { sessions, payments, users, wallets } from '@/lib/schema';
import { eq, and, gt } from 'drizzle-orm';
import { processPayment, toggleAutoRenewal, processRefundRequest, downgradeSubscription } from '@/lib/payment-handler';
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

    const recentPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.userId, session.userId))
      .orderBy(payments.createdAt)
      .limit(20);

    return NextResponse.json({ payments: recentPayments });
  } catch (err) {
    return NextResponse.json(
      { error: 'db_unavailable', message: err instanceof Error ? err.message : 'Database error' },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: {
    signature?: string;
    token?: 'SOL' | 'USDC';
    tier?: 'monthly' | 'lifetime';
    autoRenew?: boolean;
    action?: 'verify' | 'toggle_autorenew' | 'refund' | 'downgrade';
    paymentId?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const {
    signature,
    token = 'SOL',
    tier = 'monthly',
    autoRenew = false,
    action = 'verify',
    paymentId
  } = body;

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: 'no_session' }, { status: 401 });
  }

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

  const context = {
    userId: session.userId,
    telegramId: parseInt(user.telegramId, 10),
    sessionToken,
  };

  switch (action) {
    case 'verify': {
      if (!signature || typeof signature !== 'string') {
        return NextResponse.json({ error: 'signature_required' }, { status: 400 });
      }

      const result = await processPayment(context, { signature, tier, token, autoRenew });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error, action: result.action },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        ...result,
      });
    }

    case 'toggle_autorenew': {
      const result = await toggleAutoRenewal(session.userId, autoRenew);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        autoRenew: result.autoRenew,
      });
    }

    case 'refund': {
      if (!paymentId) {
        return NextResponse.json({ error: 'paymentId_required' }, { status: 400 });
      }

      const result = await processRefundRequest(context, paymentId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        ...result,
      });
    }

    case 'downgrade': {
      await downgradeSubscription(session.userId);

      return NextResponse.json({
        ok: true,
        action: 'downgraded',
      });
    }

    default:
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  }
}