/**
 * OSIRIS Subscription Enforcement Proxy
 * Lightweight route guard for dashboard pages.
 * Checks for session cookie and redirects expired users to /select-tier.
 */
import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = [
  '/dashboard',
  '/dashboard/trading',
  '/dashboard/copy-trading',
  '/dashboard/settings',
  '/dashboard/sessions',
  '/dashboard/alerts',
  '/dashboard/analytics',
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'));
}

export async function proxy(req: NextRequest): Promise<NextResponse | null> {
  const pathname = req.nextUrl.pathname;

  if (!isProtectedPath(pathname)) {
    return null;
  }

  const sessionToken = req.cookies.get('osiris_session')?.value;
  if (!sessionToken) {
    const returnTo = encodeURIComponent(pathname + req.nextUrl.search);
    const redirectUrl = `/select-tier?returnTo=${returnTo}`;

    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          error: 'subscription_required',
          message: 'Active subscription required',
          redirectUrl,
        },
        { status: 401 }
      );
    }

    const response = NextResponse.redirect(new URL(redirectUrl, req.url));
    applySecurityHeaders(response);
    return response;
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

function applySecurityHeaders(response: NextResponse): void {
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('x-xss-protection', '1; mode=block');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'permissions-policy',
    'geolocation=(), microphone=(), camera=()'
  );
  response.headers.set(
    'content-security-policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.mainnet-beta.solana.com https://*.helius-rpc.com https://ntfy.sh; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  response.headers.set('cross-origin-embedder-policy', 'require-corp');
  response.headers.set('cross-origin-opener-policy', 'same-origin');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/subscription/auto-renew',
  ],
};
