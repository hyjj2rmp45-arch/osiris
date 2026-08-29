/**
 * Referral System – Phase 2 (P2.4)
 *
 * Referral code generation, tracking (who referred whom), commission
 * calculation on trade fees, and distribution to the referrer.
 *
 * In production these are DB‑backed. This stub provides the API surface
 * and an in‑memory store for tests.
 */

const crypto = require('crypto');

// In‑memory store: referralCode -> userId, userId -> { referrer, commissionAccrued }
const codeToUser = new Map();
const userToReferrer = new Map();
const userCommission = new Map(); // userId -> lamports accrued

/**
 * Generate a unique referral code for a user.
 * @param {string} userId
 * @returns {string} unique referral code
 */
function generateReferralCode(userId) {
  if ([...codeToUser.values()].includes(userId)) {
    // already has a code, return existing
    return [...codeToUser.entries()].find(([, u]) => u === userId)[0];
  }
  const code = `REF-${userId}-${crypto.randomBytes(2).toString('hex')}`;
  codeToUser.set(code, userId);
  return code;
}

/**
 * Get a user's referral code.
 * @param {string} userId
 * @returns {string}
 */
function getReferralCode(userId) {
  const existing = [...codeToUser.entries()].find(([, u]) => u === userId);
  return existing ? existing[0] : generateReferralCode(userId);
}

/**
 * Register that `newUserId` was referred by `referrerCode`.
 * @param {string} newUserId
 * @param {string} referrerCode
 * @returns {boolean} true if referral registered
 */
function registerReferral(newUserId, referrerCode) {
  const referrerId = codeToUser.get(referrerCode);
  if (!referrerId || referrerId === newUserId) return false;
  if (userToReferrer.has(newUserId)) return false; // already referred
  userToReferrer.set(newUserId, referrerId);
  return true;
}

/**
 * Calculate commission on a trade fee and accrue it to the referrer.
 *
 * @param {string} userId - the trader
 * @param {number} feeLamports - the trade fee (in lamports)
 * @param {number} commissionBps - commission basis points (e.g. 200 = 20%)
 * @returns {Object} { referrerId, commissionLamports } or { referrerId: null }
 */
function calculateCommission(userId, feeLamports, commissionBps = 200) {
  const referrerId = userToReferrer.get(userId);
  if (!referrerId) return { referrerId: null, commissionLamports: 0 };
  const commission = Math.floor((feeLamports * commissionBps) / 10000);
  const current = userCommission.get(referrerId) || 0;
  userCommission.set(referrerId, current + commission);
  return { referrerId, commissionLamports: commission };
}

/**
 * Get total accrued commission for a user.
 * @param {string} userId
 * @returns {number}
 */
function getAccruedCommission(userId) {
  return userCommission.get(userId) || 0;
}

/**
 * Reset referral store (test helper).
 */
function resetReferrals() {
  codeToUser.clear();
  userToReferrer.clear();
  userCommission.clear();
}

module.exports = {
  generateReferralCode,
  getReferralCode,
  registerReferral,
  calculateCommission,
  getAccruedCommission,
  resetReferrals
};