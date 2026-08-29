/**
 * Session token utility for OSIRIS.
 * Generates and validates session tokens.
 */
import { randomBytes } from 'crypto';
import { db } from './db';
import { sessions } from './schema';
import { eq, and, gt, lt } from 'drizzle-orm';
import { logSecurityEvent } from './security-logger';
import { createCorrelationId } from './request-context';

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function generateSessionId(): string {
  return randomBytes(16).toString('hex');
}

/** Session expiry in seconds. 30 days absolute. */
export const SESSION_EXPIRY_SECONDS = 30 * 24 * 60 * 60;
/** Idle timeout in seconds. 7 days. */
export const SESSION_IDLE_SECONDS = 7 * 24 * 60 * 60;

export const SESSION_COOKIE = 'osiris_session';

export interface SessionCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  maxAge: number;
  path: string;
}

export function getSessionCookieOptions(isProduction: boolean): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: SESSION_EXPIRY_SECONDS,
    path: '/',
  };
}

export async function createSession(userId: number): Promise<string> {
  const token = generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_SECONDS * 1000);
  const idleExpiry = new Date(now.getTime() + SESSION_IDLE_SECONDS * 1000);

  // Enforce concurrent session limit: max 5 active sessions per user
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

  const MAX_CONCURRENT_SESSIONS = 5;
  if (activeSessions.length >= MAX_CONCURRENT_SESSIONS) {
    // Revoke oldest sessions to enforce limit
    const toRevoke = activeSessions
      .slice(0, activeSessions.length - MAX_CONCURRENT_SESSIONS + 1)
      .map((s) => s.id);

    if (toRevoke[0]) {
      await db
        .update(sessions)
        .set({ revoked: true })
        .where(eq(sessions.id, toRevoke[0]));
    }
  }

  await db.insert(sessions).values({
    id: token,
    userId,
    expiresAt,
    idleExpiry,
    revoked: false,
  });

  return token;
}

export async function getSession(token: string) {
  const result = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.id, token),
        eq(sessions.revoked, false),
        gt(sessions.expiresAt, new Date()),
        gt(sessions.idleExpiry, new Date())
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function rotateSession(oldToken: string): Promise<string | null> {
  const session = await getSession(oldToken);
  if (!session) return null;

  const newToken = generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_SECONDS * 1000);
  const idleExpiry = new Date(now.getTime() + SESSION_IDLE_SECONDS * 1000);

  await db
    .update(sessions)
    .set({ revoked: true, rotatedFrom: newToken, lastRotatedAt: now })
    .where(eq(sessions.id, oldToken));

  await db.insert(sessions).values({
    id: newToken,
    userId: session.userId,
    expiresAt,
    idleExpiry,
    revoked: false,
    rotatedFrom: oldToken,
    lastRotatedAt: now,
  });

  const correlationId = createCorrelationId();
  await logSecurityEvent({
    event: 'session_rotated',
    level: 'info',
    userId: session.userId,
    correlationId,
    metadata: { oldToken, newToken },
  });

  return newToken;
}

export async function revokeSession(token: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revoked: true })
    .where(eq(sessions.id, token));
}

export async function revokeAllUserSessions(userId: number): Promise<void> {
  await db.update(sessions).set({ revoked: true }).where(eq(sessions.userId, userId));
}
