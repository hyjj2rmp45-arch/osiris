/**
 * Open redirect prevention utilities.
 *
 * Never trust a client-supplied redirect target directly. Always pass it
 * through a whitelist or same-origin check before using it in a Location
 * header, router push, or window.location assignment.
 */

const ALLOWED_PATHS = new Set([
  '/',
  '/dashboard',
  '/dashboard/trading',
  '/dashboard/copy-trading',
  '/dashboard/settings',
  '/dashboard/sessions',
  '/dashboard/alerts',
  '/dashboard/analytics',
  '/select-tier',
  '/upgrade',
  '/pricing',
  '/auth',
  '/login',
  '/telegram',
]);

const DEFAULT_FALLBACK = '/dashboard';

/** Return a safe internal path for redirects. */
export function sanitizeReturnTo(returnTo?: string | null): string {
  if (!returnTo) return DEFAULT_FALLBACK;

  let candidate = returnTo.trim();

  if (!candidate || candidate === '/') return DEFAULT_FALLBACK;

  // Reject protocol-relative or absolute external URLs
  if (candidate.startsWith('//') || /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)) {
    return DEFAULT_FALLBACK;
  }

  // Extract pathname from same-origin absolute URL
  let pathname = candidate;
  try {
    const url = new URL(candidate, 'http://localhost');
    if (url.origin !== 'http://localhost' && url.origin !== 'https://osiris.example.com') {
      return DEFAULT_FALLBACK;
    }
    pathname = url.pathname + url.search;
  } catch {
    // Keep candidate as-is if parsing fails
  }

  // Ensure it starts with /
  if (!pathname || !pathname.startsWith('/')) {
    return DEFAULT_FALLBACK;
  }

  // Strip query and fragment for exact match
    const questionParts = pathname.split('?');
    const beforeHash = questionParts[0] ?? '';
    const hashParts = beforeHash.split('#');
    const basePath = hashParts[0] ?? '';

  if (ALLOWED_PATHS.has(basePath)) {
    return pathname;
  }

  return DEFAULT_FALLBACK;
}

/** Build a safe redirect URL string for use in Location headers or JSON bodies. */
export function buildSafeRedirectUrl(returnTo?: string | null): string {
  const safe = sanitizeReturnTo(returnTo);
  if (!safe) return DEFAULT_FALLBACK;
  return `/${safe.replace(/^\//, '')}`;
}
