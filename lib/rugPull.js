/**
 * Rug Pull Detection – Phase 1 (P1.6b)
 *
 * Minimal placeholder for detecting potential rug‑pull patterns.
 * In production this would analyse on‑chain data: liquidity lock status,
 * token contract ownership, transfer tax mechanisms, whale concentration,
 * and historical price manipulation.  This stub provides a simple heuristic
 * based on token name and a configurable “risky” flag.
 *
 * The API:
 *   - isRugPull(address, name): returns true if the token is considered a rug‑pull.
 *   - riskScore(address, name): returns a numeric risk score (0–100).
 */

const RUG_PULL_KEYWORDS = [
  'rugpull',
  'rug',
  'pull',
  'exit',
  'scam',
  'honeypot',
  'ponzi',
  'pump',
  'dump'
];

/**
 * Compute a simple risk score based on keyword presence.
 * @param {string} name - Token name
 * @returns {number} Score 0–100
 */
function riskScore(name) {
  const lower = name.toLowerCase();
  let score = 0;
  for (const kw of RUG_PULL_KEYWORDS) {
    if (lower.includes(kw)) score += 20;
  }
  return Math.min(score, 100);
}

/**
 * Determine if a token is likely a rug‑pull.
 * Returns true if riskScore >= 50.
 *
 * @param {string} address - Token contract address (not used in stub)
 * @param {string} name - Token name
 * @returns {boolean}
 */
function isRugPull(address, name) {
  // A token is flagged as potential rug pull if riskScore >= 20
  // (any single risky keyword in the name triggers detection)
  return riskScore(name) >= 20;
}

/**
 * Get the list of keywords used for detection.
 */
function getKeywords() {
  return RUG_PULL_KEYWORDS.slice();
}

module.exports = {
  isRugPull,
  riskScore,
  getKeywords
};