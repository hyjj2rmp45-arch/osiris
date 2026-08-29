import { NextRequest, NextResponse } from 'next/server';
import { getSession, SESSION_COOKIE } from '@/lib/session';
import { logSecurityEvent } from '@/lib/security-logger';
import { createCorrelationId } from '@/lib/safety-manager';

export type AuthenticatedRequest = NextRequest & {
  user: {
    id: number;
    telegramId: number;
    role: string;
    tier: string;
    sessionId: string;
  };
};

/**
 * Handler-level auth wrapper for protected API routes.
 * Use this as the first line of defense in every protected handler.
 * Middleware is the first pass; this is the actual security guarantee.
 */
export async function withAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    const correlationId = createCorrelationId();
    await logSecurityEvent({
      event: 'auth.missing_session',
      level: 'warn',
      correlationId,
      metadata: { path: request.nextUrl.pathname },
    });

    return NextResponse.json(
      { error: 'Unauthorized', correlationId },
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const session = await getSession(sessionToken);
  if (!session) {
    const correlationId = createCorrelationId();
    await logSecurityEvent({
      event: 'auth.invalid_session',
      level: 'warn',
      correlationId,
      metadata: { path: request.nextUrl.pathname },
    });

    return NextResponse.json(
      { error: 'Unauthorized', correlationId },
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Attach user context to request for downstream handlers
  const authenticatedRequest = request as AuthenticatedRequest;
  authenticatedRequest.user = {
    id: session.userId,
    telegramId: (session as any).telegramId ?? 0,
    role: (session as any).role ?? 'user',
    tier: (session as any).tier ?? 'monthly',
    sessionId: session.id,
  };

  return handler(authenticatedRequest);
}

/**
 * Convenience helper to require a specific role.
 */
export function requireRole(...allowedRoles: string[]) {
  return async (
    request: AuthenticatedRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    if (!allowedRoles.includes(request.user.role)) {
      const correlationId = createCorrelationId();
      await logSecurityEvent({
        event: 'auth.insufficient_role',
        level: 'warn',
        correlationId,
        metadata: {
          path: request.nextUrl.pathname,
          requiredRoles: allowedRoles,
          actualRole: request.user.role,
        },
      });

      return NextResponse.json(
        { error: 'Forbidden', correlationId },
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return handler(request);
  };
}
