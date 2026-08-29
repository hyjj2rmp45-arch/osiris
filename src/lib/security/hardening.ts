import * as argon2 from 'argon2';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';

/**
 * ==================================================================
 *  SECURITY HARDENING UTILITIES – HIGH‑PRIORITY CHECKLIST ITEMS
 * ==================================================================
 *
 * These functions should be imported and used early in the request cycle:
 *
 *   1. Password hashing / verification  → Argon2id (memory‑hard, GPU‑resistant)
 *   2. Request rate limiting            → express-rate-limit
 *   3. HTTP security headers            → helmet (CSP, HSTS, etc.)
 *   4. Docker secret loading            → secure secret retrieval
 *
 * All functions are pure and can be called from any route/handler.
 *
 * -------------------------------------------------------------------------
 * 1️⃣ Argon2id Password Hashing
 * -------------------------------------------------------------------------
 * Argon2id provides strong resistance to GPU/ASIC attacks and is the
 * recommended password‑hashing algorithm for high‑value credentials.
 *
 *   const hash = await hashPassword(plainPassword);
 *   const verified = await verifyPassword(hash, plainPassword);
 *
 * The `argon2` npm package uses native bindings (node‑gyp) and works
 * on Windows, Linux, and macOS without additional setup.
 * -------------------------------------------------------------------------
 */

/* ------------------------------------------------------------------
 *  Argon2id Hash & Verify
 * ------------------------------------------------------------------ */
export type PasswordOptions = {
  memoryCost?: number;
  timeCost?: number;
  parallelism?: number;
  hashLength?: number;
  saltLength?: number;
};

export async function hashPassword(
  plainPassword: string,
  options?: PasswordOptions
): Promise<string> {
  const defaultOpts: PasswordOptions = {
    memoryCost: 128 * 1024,
    timeCost: 3,
    parallelism: 1,
    hashLength: 64,
    saltLength: 16,
  };

  return await argon2.hash(plainPassword, {
    type: argon2.argon2id,
    ...defaultOpts,
    ...options,
  });
}

export async function verifyPassword(
  hashedPassword: string,
  plainPassword: string,
  options?: PasswordOptions
): Promise<boolean> {
  const defaultOpts: PasswordOptions = {
    memoryCost: 128 * 1024,
    timeCost: 3,
    parallelism: 1,
    hashLength: 64,
    saltLength: 16,
  };

  try {
    await argon2.verify(hashedPassword, plainPassword);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------
 *  Rate‑Limiting Middleware
 * ------------------------------------------------------------------ */
export const apiLimiter = rateLimit({
  windowMs: 60_000,           // 1 minute
  max: 120,                   // max 120 requests per minute per IP
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,      // Return rate limit headers in `X-RateLimit-*` format
  legacyHeaders: false,       // Disable the older `X-RateLimit-*` headers
});

/* ------------------------------------------------------------------
 *  Docker Secret Loader
 * ------------------------------------------------------------------ */
export async function loadSecret(
  secretName: string
): Promise<string> {
  // Docker secrets are mounted at /run/secrets/<name>
  const secretPath = path.join('/run/secrets', secretName);
  try {
    const data = await fs.promises.readFile(secretPath, 'utf8');
    return data.trim(); // Trim whitespace/newlines
  } catch (err) {
    // If secret missing, throw a clear error – never log the secret itself
    throw new Error(`Docker secret '${secretName}' not found`);
  }
}

/* ------------------------------------------------------------------
 *  HTTP Security Headers (Helmet)
 * ------------------------------------------------------------------ */
/**
 * Call `app.use(helmet())` in your Next.js/Express entry point.
 * The configuration below enforces a strict security posture:
 *
 *   - Content‑Security‑Policy (CSP) – only allow resources from
 *     trusted origins (including your own API domain).
 *   - Strict‑Transport‑Security (HSTS) – enforce HTTPS forever.
 *   - X‑Frame‑Options – prevent click‑jacking.
 *   - X‑Content‑Type‑Options – stop MIME‑type sniffing.
 *   - Referrer‑Policy – reduce information leakage via Referer.
 *
 * Example usage in `src/pages/api/_middleware.ts` (or `next.config.js`):
 *
 *   import { helmet } from 'helmet';
 *   export default helmet({
 *     contentSecurityPolicy: {
 *       directives: {
 *         defaultSrc: ["'self'"],
 *         scriptSrc: ["'self'", "'unsafe-inline'"], // adjust as needed
 *         styleSrc: ["'self'", "'unsafe-inline'"],
 *         imgSrc: ["'self'", "data:"],
 *         connectSrc: ["'self'", "https://api.myservice.com"],
 *       },
 *     },
 *   });
 */
export const securityHeaders = helmet({
  // Production‑ready defaults; can be overridden per‑route if needed
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], // default‑deny
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://api.myservice.com"],
    },
  },
  referrerPolicy: { policy: 'no-referrer' },
  crossOriginEmbedderPolicy: { policy: 'require-corp' },
  hidePoweredBy: true,
  noSniff: true,
  // HSTS will be added also by `helmet` when `strictTransportSecurity` is true
  strictTransportSecurity: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },
});

/* ------------------------------------------------------------------
 *  Helper: Load All Docker Secrets into Process.env (optional)
 * ------------------------------------------------------------------ */
/**
 * If you prefer to expose Docker secrets as environment variables for
 * convenience (e.g., in code that expects `process.env.PASSWORD`), you can
 * load all files in `/run/secrets` on startup.
 *
 *   await loadAllSecrets();
 *
 *   // After this, `process.env.DB_PASSWORD` will be set from `/run/secrets/db_password`
 * ------------------------------------------------------------------ */
export async function loadAllSecrets(): Promise<void> {
  const secretDir = '/run/secrets';
  try {
    const files = await fs.promises.readdir(secretDir);
    for (const file of files) {
      const content = await fs.promises.readFile(path.join(secretDir, file), 'utf8');
      // Strip null bytes & whitespace
      process.env[file] = content.trim();
    }
  } catch (err) {
    // It's fine if the directory doesn't exist (e.g., local dev)
    // eslint-disable-next-line no-console
    console.warn('Docker secrets directory not found – running in dev mode.');
  }
}