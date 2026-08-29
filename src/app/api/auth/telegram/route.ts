/**
 * OSIRIS Telegram Mini App authentication endpoint.
 * Per master plan: initData HMAC-SHA256 verification using HMAC_SHA256("WebAppData", bot_token).
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  validateInitData,
  determineUserRole,
} from '@/lib/telegram-auth';
import {
  generateSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE,
} from '@/lib/session';
import { logAuditEvent } from '@/lib/audit';
import { db } from '@/lib/db';
import { users, sessions } from '@/lib/schema';
import { eq, and, gt } from 'drizzle-orm';
import { redis } from '@/lib/redis';
import { logSecurityEvent } from '@/lib/security-logger';
import { AdminAlerts } from '@/lib/admin-alerts';
import { extractRequestContext } from '@/lib/request-context';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests' },
      { status: 429 }
    );
  }

  let body: { initData?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_request', message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const initData = body.initData;
  if (!initData || typeof initData !== 'string') {
    return NextResponse.json(
      { error: 'invalid_request', message: 'initData is required' },
      { status: 400 }
    );
  }

  if (!BOT_TOKEN) {
    return NextResponse.json(
      { error: 'server_misconfigured', message: 'Telegram bot token not set' },
      { status: 500 }
    );
  }

  const validation = validateInitData(initData, BOT_TOKEN);
  if (!validation.valid) {
    await logAuditEvent({
      type: 'auth.telegram.initdata.invalid',
      ip,
      userAgent: req.headers.get('user-agent') || undefined,
      reason: validation.error,
    });
    return NextResponse.json(
      { error: 'unauthorized', message: validation.error || 'Invalid initData' },
      { status: 401 }
    );
  }

  if (!validation.user) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'No user in initData' },
      { status: 401 }
    );
  }

  const telegramUser = validation.user;
  await logAuditEvent({
    type: 'auth.telegram.initdata.valid',
    telegramId: telegramUser.id,
    ip,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  // Determine user role (admin/tester/user)
  const role = determineUserRole(telegramUser.id);

  // Ensure user record exists and role is up to date
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, String(telegramUser.id)))
    .limit(1);

  let userId: number;
  if (userResult.length === 0) {
    const inserted = await db
      .insert(users)
      .values({
        telegramId: String(telegramUser.id),
        firstName: telegramUser.first_name || '',
        lastName: telegramUser.last_name || null,
        username: telegramUser.username || null,
        role,
        tier: 'monthly',
        autoRenew: false,
      })
      .returning();
    const created = inserted[0];
    if (!created) {
      throw new Error('Failed to create user');
    }
    userId = created.id;
  } else {
    const existing = userResult[0];
    if (!existing) {
      throw new Error('User not found after existence check');
    }
    userId = existing.id;

    // Check for privilege escalation (role change)
    const previousRole = existing.role;
    const roleChanged = previousRole !== role;

    // Update role if changed
    if (roleChanged) {
      await db
        .update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, userId));

      // Rotate all active sessions on privilege escalation
      if (role === 'admin' || role === 'tester') {
        const ctx = extractRequestContext(req);
        const correlationId = ctx.requestId;

        // Get all active sessions for the user
        const activeSessions = await db
          .select({ id: sessions.id })
          .from(sessions)
          .where(
            and(
              eq(sessions.userId, userId),
              eq(sessions.revoked, false),
              gt(sessions.expiresAt, new Date()),
              gt(sessions.idleExpiry, new Date())
            )
          );

        // Revoke all active sessions
        const sessionIds = activeSessions.map(s => s.id);
        if (sessionIds.length > 0) {
          await db
            .update(sessions)
            .set({ revoked: true, lastRotatedAt: new Date() })
            .where(eq(sessions.userId, userId));
        }

        // Log the privilege escalation event
        await logSecurityEvent({
          event: 'privilege_escalation',
          level: 'critical',
          userId,
          correlationId,
          metadata: {
            previousRole,
            newRole: role,
            sessionsRevoked: sessionIds.length,
            ip: ctx.ip,
          },
        });

        // Send admin alert
        AdminAlerts.security.privilegeEscalation(String(userId), previousRole, role);
      }
    } else {
      // Update timestamp even if role didn't change
      await db
        .update(users)
        .set({ updatedAt: new Date() })
        .where(eq(users.id, userId));
    }
  }

  // Generate session token
  const sessionToken = generateSessionToken();

  // Build response
  const response = NextResponse.json({
    ok: true,
    user: {
      telegramId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      role,
    },
    sessionToken, // In production, only set via cookie
  });

  // Set httpOnly session cookie
  const cookieOptions = getSessionCookieOptions(process.env.NODE_ENV === 'production');
  response.cookies.set(SESSION_COOKIE, sessionToken, cookieOptions);

  await logAuditEvent({
    type: 'auth.telegram.session.created',
    telegramId: telegramUser.id,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  return response;
}

export async function DELETE() {
  // Logout: clear session cookie
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
