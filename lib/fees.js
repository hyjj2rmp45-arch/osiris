/**
 * Fee calculator – Phase 1 (P1.4b) dynamic fees
 *
 * Reads FEE_PERCENT and FEE_MAX_LAMPORTS from the environment (`.env`).
 * Exports `calculateFee(tradeAmount, slippageBps?, config?)`
 *
 * - Default: 0.25 % of the trade amount (configurable via env)
 * - Cap: max FEE_MAX_LAMPORTS (default 1 000 000 lamports ≈ 0.001 SOL)
 * - If trade amount is 0 → fee is 0
 */

const crypto = require('crypto');

/** Default fee percentage (bps) – 0.25 % = 25 bps */
const DEFAULT_FEE_BPS = 25;

/** Default maximum fee in lamports (≈ 0.001 SOL) */
const DEFAULT_FEE_MAX_LAMPORTS = 1_000_000;

/** Parse env safely – falls back to defaults */
function parseEnv() {
  const percentBps = Number(process.env.FEE_PERCENT_BPS) || DEFAULT_FEE_BPS;
  const maxLamports = Number(process.env.FEE_MAX_LAMPORTS) || DEFAULT_FEE_MAX_LAMPORTS;
  return { feeBps: percentBps, maxLamports };
}

const { feeBps, maxLamports } = parseEnv();

/**
 * Calculate the fee for a trade.
 *
 * @param {number} tradeAmount – amount in lamports (base units) being traded
 * @param {number} [slippageBps=0] – optional slippage adjustment (bps)
 * @param {Object} [config] – optional overrides { feeBps?, maxLamports? }
 * @returns {number} fee in lamports (rounded down to integer)
 */
function calculateFee(tradeAmount, slippageBps = 0, config = {}) {
  // Apply any per‑call overrides
  const effectiveBps = config.feeBps !== undefined ? config.feeBps : feeBps;
  const effectiveMax = config.maxLamports !== undefined ? config.maxLamports : maxLamports;

  if (tradeAmount <= 0) return 0;

  // Compute raw fee: amount * (bps/10000)
  const rawFee = Math.floor((tradeAmount * effectiveBps) / 10_000);

  // Add slippage adjustment (simple linear addition – can be refined later)
  const adjustedFee = rawFee + Math.floor((tradeAmount * slippageBps) / 10_000);

  // Enforce cap
  return Math.min(adjustedFee, effectiveMax);
}

module.exports = {
  calculateFee,
  // expose constants for tests / env inspection
  DEFAULT_FEE_BPS,
  DEFAULT_FEE_MAX_LAMPORTS,
};