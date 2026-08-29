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
  try {
    return NextResponse.json({ payments: [] });
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

  if (action === 'verify' && !signature) {
    return NextResponse.json({ error: 'signature_required' }, { status: 400 });
  }

  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, 0))
    .limit(1);

  const user = userResult[0];
  if (!user) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 401 });
  }

  const context = {
    userId: 0,
    telegramId: parseInt(user.telegramId, 10),
    sessionToken: '',
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
      return NextResponse.json({ error: 'autorenew_requires_session' }, { status: 400 });
    }

    case 'refund': {
      if (!paymentId) {
        return NextResponse.json({ error: 'paymentId_required' }, { status: 400 });
      }
      return NextResponse.json({ error: 'refund_requires_session' }, { status: 400 });
    }

    case 'downgrade': {
      return NextResponse.json({ error: 'downgrade_requires_session' }, { status: 400 });
    }

    default:
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  }
}