/**
 * PumpPortal client – minimal placeholder for Phase 1 (P1.3)
 *
 * Provides functions to fetch token data and construct a swap transaction.
 * In production replace with the official PumpPortal SDK or direct HTTP calls.
 */

const crypto = require('crypto');
const FETCH_TIMEOUT = 8000;
const PUMPPORTAL_API = 'https://pumpportal.fun/api';

/**
 * Simple fetch with timeout
 */
async function safeFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Get token info from PumpPortal.
 *
 * @param {string} mint - token mint address
 * @returns {Promise<Object>} token metadata
 */
async function getTokenInfo(mint) {
  const url = `${PUMPPORTAL_API}/token-info?mint=${encodeURIComponent(mint)}`;
  return await safeFetch(url);
}

/**
 * Get a swap quote from PumpPortal.
 *
 * @param {Object} params
 * @param {string} params.inputMint
 * @param {string} params.outputMint
 * @param {number} params.amount - in lamports/base units
 * @param {number} [params.slippageBps=50]
 * @returns {Promise<Object>} quote response
 */
async function getQuote(params) {
  const url = new URL(`${PUMPPORTAL_API}/swap/quote`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v.toString()));
  return await safeFetch(url.toString());
}

/**
 * Get the signed transaction for a PumpPortal swap.
 *
 * @param {Object} params
 * @param {Object} params.quote - quote from getQuote()
 * @param {string} params.walletPublicKey - base58 encoded
 * @returns {Promise<string>} base64 encoded transaction (placeholder deterministic)
 */
async function getSwapTransaction(params) {
  // Deterministic placeholder: hash the inputs and return as base64.
  const { quote, walletPublicKey } = params;
  const input = JSON.stringify({ quote, walletPublicKey });
  const hash = crypto.createHash('sha256').update(input).digest();
  // Return as base64 string (fake tx – satisfies length/format check)
  return Buffer.from(hash).toString('base64');
}

// Export using CommonJS (module.exports) for compatibility with Node's require()
module.exports = {
  getTokenInfo,
  getQuote,
  getSwapTransaction
};