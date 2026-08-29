/**
 * Honeypot Detection – Phase 1 (P1.5c)
 *
 * Minimal placeholder implementation for detecting honeypot tokens.
 * In production this would query on‑chain data (e.g., token metadata, liquidity
 * pools) to determine if a token is a honeypot.  Here we provide a simple heuristic
 * based on the token name and a configurable “risky” flag.
 *
 * The API:
 *   - isHoneypot(address): returns true if the token is considered a honeypot.
 *   - isRugPull(address): returns true if the token is considered a rug‑pull (same
 *     detection logic as honeypot for simplicity).
 */
const KNOWN_HONEY_POT_KEYWORDS = [
  'honeypot',
  'rug',
  'scam',
  'fraud',
  'danger',
  'warning',
  'alert'
];

/**
 * Determine if a token is a honeypot.
 * Very simple heuristic: if the token name (or any token metadata we could
 * inspect) contains any of the known risky keywords, we consider it a honeypot.
 *
 * @param {string} address - Token contract address (for completeness; not used now).
 * @param {string} name - Token name (optional; if omitted we assume a placeholder).
 * @returns {boolean} True if the token is considered a honeypot.
 */
function isHoneypot(address, name = '') {
  // Normalise name to lower case for case‑insensitive matching
  const lowerName = (name || '').toLowerCase();
  return KNOWN_HONEY_POT_KEYWORDS.some(kw => lowerName.includes(kw));
}

/**
 * Detect a rug‑pull.  For this placeholder we treat a rug‑pull the same as
 * a honeypot – i.e., any token flagged as a honeypot is also considered a rug‑pull.
 *
 * @param {string} address - Token contract address.
 * @param {string} [name] - Optional token name (if you have it).
 * @returns {boolean} True if the token is considered a rug‑pull.
 */
function isRugPull(address, name = '') {
  return isHoneypot(address, name);
}

module.exports = {
  isHoneypot,
  isRugPull
};