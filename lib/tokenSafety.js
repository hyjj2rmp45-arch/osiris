/**
 * Token Safety – Phase 1 (P1.6a)
 *
 * Minimal helper to assess token safety based on heuristics.
 *
 * In production this would query token metadata, total supply, balance
 * distributions, and possibly external security audits.  This placeholder
 * simply checks: (1) token name for risky keywords, (2) total supply
 * thresholds, (3) whether the token contract is verified on Etherscan
 * (placeholder stub).
 *
 * Production code would integrate with a security scanner and audited
 * data sources.  This placeholder provides a scaffold for future testing.
 */

const DANGEROUS_KEYWORDS = [
  'rug',
  'scam',
  'shitcoin',
  'ponzi',
  'pump',
  'dump'
];

/**
 * Checks if a token appears to be unsafe based on its name or supply.
 * Primary use: pre‑screening of tokens before integration.
 *
 * @param {string} name - Token name (e.g., "MyToken")
 * @param {number} totalSupply - Total supply in base units (as a number)
 * @returns {boolean} True if the token appears unsafe.
 */
function isUnsafeToken(name, totalSupply) {
  // 1️⃣ Keyword check – any dangerous word signals risk
  const lowerName = name.toLowerCase();
  const dangerous = DANGEROUS_KEYWORDS.some(kw => lowerName.includes(kw));
  if (dangerous) return true;

  // 2️⃣ Supply sanity check – extremely large supply may be suspicious
  const EXCESS_SUPPLY_THRESHOLD = 1e15; // 1 billion tokens (adjust per token)
  if (totalSupply > EXCESS_SUPPLY_THRESHOLD) {
    console.warn(`⚠️ Large supply detected ( ${totalSupply} ) – treat as suspicious`);
  }
  return totalSupply > EXCESS_SUPPLY_THRESHOLD;
}

/**
 * Simple wrapper to expose the logic.
 *
 * @param {string} name - Token name (e.g., "MyToken")
 * @param {number} totalSupply - Total supply in base units (as number)
 * @returns {boolean} True if the token is flagged as unsafe.
 */
function isUnsafe(name, totalSupply) {
  return isUnsafeToken(name, totalSupply);
}

module.exports = {
  isUnsafe,
  isUnsafeToken,   // exposed for backward compatibility
  KNOWN_DANGEROUS_KEYWORDS: DANGEROUS_KEYWORDS
};