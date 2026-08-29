import { NextRequest, NextResponse } from 'next/server';
import { getSession, SESSION_COOKIE } from '@/lib/session';
import { logSecurityEvent } from '@/lib/security-logger';
import { createCorrelationId } from '@/lib/request-context';

export async function assertSignedIn(request: NextRequest): Promise<NextResponse | void> {
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

  return;
}

export async function getAuthenticatedUser(request: NextRequest): Promise<{ userId: number; sessionId: string } | NextResponse> {
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

  return { userId: session.userId, sessionId: session.id };
}

