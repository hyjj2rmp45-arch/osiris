/**
 * CSRF protection utilities for OSIRIS.
 *
 * Uses double-submit cookie pattern for state-changing API routes.
 * Client must send the CSRF token in both a cookie and a header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

const CSRF_COOKIE_NAME = 'osiris_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_BYTES = 32;

/** Generate a cryptographically random CSRF token. */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_BYTES).toString('hex');
}

/** Constant-time comparison for strings. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Verify a CSRF token from header against the cookie value. */
export function verifyCsrfToken(cookieToken: string | null, headerToken: string | null): boolean {
  if (!cookieToken || !headerToken) {
    return false;
  }

  if (cookieToken.length !== CSRF_TOKEN_BYTES * 2) {
    return false;
  }

  if (headerToken.length !== CSRF_TOKEN_BYTES * 2) {
    return false;
  }

  return safeEqual(cookieToken, headerToken);
}

/** Middleware helper to enforce CSRF protection on POST/PUT/PATCH/DELETE routes. */
export function enforceCsrf(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null;
  }

  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value || null;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!verifyCsrfToken(cookieToken, headerToken)) {
    return NextResponse.json(
      { error: 'CSRF token validation failed' },
      { status: 403 }
    );
  }

  return null;
}

/** Set CSRF cookie in response. */
export function setCsrfCookie(
  response: NextResponse,
  token: string,
  isProduction: boolean
): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}
