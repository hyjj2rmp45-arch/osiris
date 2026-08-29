/**
 * Subscription enforcement middleware.
 * Checks if user subscription is valid and redirects expired users.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/session';
import { db } from '@/lib/db';
import { users, sessions } from '@/lib/schema';
import { eq, and, gt } from 'drizzle-orm';

const SUBSCRIPTION_TIERS = ['monthly', 'lifetime'] as const;
type SubscriptionTier = typeof SUBSCRIPTION_TIERS[number];

export interface SubscriptionCheckResult {
  valid: boolean;
  tier: SubscriptionTier;
  expired: boolean;
  currentPeriodEnd: Date | null;
  autoRenew: boolean;
}

/**
 * Check if current user has valid subscription.
 * Returns subscription status for gating decisions.
 */
export async function checkSubscription(req: NextRequest): Promise<SubscriptionCheckResult> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return {
      valid: false,
      tier: 'monthly',
      expired: true,
      currentPeriodEnd: null,
      autoRenew: false,
    };
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
      return {
        valid: false,
        tier: 'monthly',
        expired: true,
        currentPeriodEnd: null,
        autoRenew: false,
      };
    }

    // Look up user
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const user = userResult[0];
    if (!user) {
      return {
        valid: false,
        tier: 'monthly',
        expired: true,
        currentPeriodEnd: null,
        autoRenew: false,
      };
    }

    // Admin and tester roles have unlimited access
    if (user.role === 'admin' || user.role === 'tester') {
      return {
        valid: true,
        tier: 'lifetime',
        expired: false,
        currentPeriodEnd: null,
        autoRenew: false,
      };
    }

    const tier = user.tier as SubscriptionTier;
    const now = new Date();

    // Lifetime tier never expires
    if (tier === 'lifetime') {
      return {
        valid: true,
        tier: 'lifetime',
        expired: false,
        currentPeriodEnd: null,
        autoRenew: user.autoRenew,
      };
    }

    // Monthly tier: check if current period has ended
    const hasValidPeriod =
      user.currentPeriodEnd !== null && user.currentPeriodEnd > now;

    return {
      valid: hasValidPeriod,
      tier: 'monthly',
      expired: !hasValidPeriod,
      currentPeriodEnd: user.currentPeriodEnd,
      autoRenew: user.autoRenew,
    };
  } catch (err) {
    console.error('[subscription] Check failed:', err);
    return {
      valid: false,
      tier: 'monthly',
      expired: true,
      currentPeriodEnd: null,
      autoRenew: false,
    };
  }
}

/**
 * Middleware helper: returns 401 with redirect info if subscription is invalid.
 */
export async function requireSubscription(req: NextRequest): Promise<NextResponse | null> {
  const result = await checkSubscription(req);

  if (!result.valid) {
    const returnTo = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search);
    const redirectUrl = `/select-tier?returnTo=${returnTo}`;

    return NextResponse.json(
      {
        error: 'subscription_required',
        message: 'Active subscription required',
        redirectUrl,
        expired: result.expired,
      },
      { status: 401 }
    );
  }

  return null;
}
