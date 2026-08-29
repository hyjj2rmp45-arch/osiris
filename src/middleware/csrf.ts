import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent } from '@/lib/security-logger';
import { createCorrelationId } from '@/lib/safety-manager';

const CSRF_HEADER = 'x-csrf-token';
const COOKIE_NAME = 'osiris_csrf';

function methodRequiresCsrf(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

export async function validateCsrf(request: NextRequest): Promise<NextResponse | null> {
  if (!methodRequiresCsrf(request.method)) {
    return null;
  }

  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    const correlationId = createCorrelationId();
    await logSecurityEvent({
      event: 'csrf_token_mismatch',
      level: 'warn',
      correlationId,
      metadata: {
        path: request.nextUrl.pathname,
        method: request.method,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json(
      { error: 'csrf_token_mismatch', correlationId },
      { status: 403 }
    );
  }

  return null;
}

export async function csrfMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (methodRequiresCsrf(request.method)) {
    const host = request.headers.get('host');
    const appOrigin = origin || referer || '';

    if (!appOrigin.includes(host || '') && !appOrigin.includes('localhost')) {
      const correlationId = createCorrelationId();
      await logSecurityEvent({
        event: 'csrf_origin_mismatch',
        level: 'error',
        correlationId,
        metadata: {
          path: request.nextUrl.pathname,
          method: request.method,
          origin,
          referer,
        },
      });

      return NextResponse.json(
        { error: 'invalid_origin', correlationId },
        { status: 403 }
      );
    }
  }

  return validateCsrf(request);
}
