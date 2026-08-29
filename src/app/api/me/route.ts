/**
 * OSIRIS `/api/me` endpoint.
 * Returns the current user with tier, role, and subscription info.
 * Replaces localStorage-based tier storage.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/session';
import { logAuditEvent } from '@/lib/audit';
import { db } from '@/lib/db';
import { users, sessions } from '@/lib/schema';
import { eq, and, gt } from 'drizzle-orm';
import { sanitizeUserResponse } from '@/lib/pii';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function GET(req: NextRequest) {
  // Production: read session cookie
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return NextResponse.json(
      { authenticated: false, error: 'no_session' },
      { status: 401 }
    );
  }

  try {
    // Look up session
    const sessionResult = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionToken), gt(sessions.expiresAt, new Date())))
      .limit(1);

    const session = sessionResult[0];
    if (!session) {
      return NextResponse.json(
        { authenticated: false, error: 'session_expired' },
        { status: 401 }
      );
    }

    // Look up user
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const user = userResult[0];
    if (!user) {
      return NextResponse.json(
        { authenticated: false, error: 'user_not_found' },
        { status: 401 }
      );
    }

    // Check if subscription is still valid
    const now = new Date();
    let tier = user.tier as 'monthly' | 'lifetime';
    if (
      user.role !== 'admin' &&
      user.role !== 'tester' &&
      tier === 'monthly' &&
      user.currentPeriodEnd &&
      user.currentPeriodEnd < now
    ) {
      // Expired - downgrade
      tier = 'monthly';
      await logAuditEvent({
        type: 'subscription.expired',
        userId: user.id,
        telegramId: parseInt(user.telegramId, 10),
      });
    }

    const response = {
      authenticated: true,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        tier,
        role: user.role,
        currentPeriodStart: user.currentPeriodStart,
        currentPeriodEnd: user.currentPeriodEnd,
        autoRenew: user.autoRenew,
      },
    };

    // Apply PII redaction before sending response
    return NextResponse.json(sanitizeUserResponse(response));
  } catch (error) {
    return NextResponse.json(
      { authenticated: false, error: 'internal_error' },
      { status: 500 }
    );
  }
}
