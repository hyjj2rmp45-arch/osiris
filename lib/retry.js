/**
 * Retry / Backoff utility – Phase 1 (P1.5b)
 *
 * Provides a generic async retry wrapper with exponential backoff.
 * Useful for external API calls (Jupiter, PumpPortal, etc.).
 *
 * Usage:
 *   const result = await withRetry(async () => fetch(...), { retries: 3, baseDelay: 200 });
 */

/**
 * Default options for retry.
 */
const DEFAULT_OPTIONS = {
  retries: 3,
  baseDelay: 200,        // ms
  maxDelay: 5000,        // ms
  jitter: true,          // add random jitter to delay
  onRetry: null,         // optional callback (err, attempt)
};

/**
 * Sleep helper.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Add jitter to delay (±25%).
 */
function addJitter(delay) {
  if (delay <= 0) return 0;
  const jitter = delay * 0.25;
  return delay - jitter + Math.random() * (jitter * 2);
}

/**
 * Execute an async function with retry and exponential backoff.
 *
 * @param {Function} fn - async function to execute
 * @param {Object} [options] - retry options
 * @returns {Promise<any>} result of fn()
 * @throws {Error} if all retries fail
 */
async function withRetry(fn, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError;

  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === opts.retries) break;

      // Calculate delay: baseDelay * 2^attempt
      let delay = opts.baseDelay * Math.pow(2, attempt);
      if (opts.jitter) delay = addJitter(delay);
      delay = Math.min(delay, opts.maxDelay);

      if (opts.onRetry) {
        try {
          opts.onRetry(err, attempt + 1);
        } catch (e) {
          // ignore callback errors
        }
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a retry‑wrapped version of a function.
 * @param {Function} fn - async function
 * @param {Object} [options] - retry options
 * @returns {Function} wrapped function
 */
function createRetryWrapper(fn, options = {}) {
  return async (...args) => {
    return withRetry(() => fn(...args), options);
  };
}

module.exports = {
  withRetry,
  createRetryWrapper,
  DEFAULT_OPTIONS
};