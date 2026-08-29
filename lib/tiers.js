/**
 * Tier System – Phase 2 (P2.1)
 *
 * Minimal tier enum and feature‑gating logic.
 * In production this reads the user's tier from the DB and applies limits.
 * This stub provides the API surface and deterministic behavior for tests.
 */

const TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PRO: 'pro',
  WHALE: 'whale'
};

// Feature limits per tier (lamports / per-trade caps, illustrative)
const TIER_LIMITS = {
  [TIERS.FREE]: {
    canTrade: false,
    maxTradeLamports: 0,
    maxDailyVolumeLamports: 0,
    referralCommissionBps: 0
  },
  [TIERS.BASIC]: {
    canTrade: true,
    maxTradeLamports: 100_000_000, // 0.1 SOL
    maxDailyVolumeLamports: 500_000_000, // 0.5 SOL
    referralCommissionBps: 200 // 20%
  },
  [TIERS.PRO]: {
    canTrade: true,
    maxTradeLamports: 1_000_000_000, // 1 SOL
    maxDailyVolumeLamports: 5_000_000_000, // 5 SOL
    referralCommissionBps: 300 // 30%
  },
  [TIERS.WHALE]: {
    canTrade: true,
    maxTradeLamports: Number.MAX_SAFE_INTEGER, // custom (unlimited placeholder)
    maxDailyVolumeLamports: Number.MAX_SAFE_INTEGER,
    referralCommissionBps: 350 // 35%
  }
};

const TIER_ORDER = [TIERS.FREE, TIERS.BASIC, TIERS.PRO, TIERS.WHALE];

/**
 * Returns the feature limits for a given tier.
 * @param {string} tier - one of TIERS
 * @returns {Object} limits
 */
function getLimits(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS[TIERS.FREE];
}

/**
 * Whether a tier is allowed to trade.
 * @param {string} tier
 * @returns {boolean}
 */
function canTrade(tier) {
  return getLimits(tier).canTrade;
}

/**
 * Get the ranking index of a tier (0 = free, 3 = whale).
 * @param {string} tier
 * @returns {number}
 */
function tierRank(tier) {
  const idx = TIER_ORDER.indexOf(tier);
  return idx === -1 ? 0 : idx;
}

/**
 * Upgrade a user's tier to a higher (or equal) one.
 * Returns the new tier. Rejects downgrades.
 * @param {string} current - current tier
 * @param {string} requested - desired tier
 * @returns {string} resulting tier
 */
function upgradeTier(current, requested) {
  if (tierRank(requested) < tierRank(current)) {
    throw new Error(`Cannot downgrade via upgrade: ${current} -> ${requested}`);
  }
  return requested;
}

/**
 * Downgrade a user's tier to a lower (or equal) one.
 * Returns the new tier. Rejects upgrades.
 * @param {string} current - current tier
 * @param {string} requested - desired tier
 * @returns {string} resulting tier
 */
function downgradeTier(current, requested) {
  if (tierRank(requested) > tierRank(current)) {
    throw new Error(`Cannot upgrade via downgrade: ${current} -> ${requested}`);
  }
  return requested;
}

/**
 * Generate a unique referral code for a user (stub).
 * @param {string} userId - stable user identifier
 * @returns {string} referral code
 */
function generateReferralCode(userId) {
  // Deterministic stub code (production would use a unique DB-backed code)
  return `REF-${userId}`;
}

module.exports = {
  TIERS,
  TIER_ORDER,
  getLimits,
  canTrade,
  tierRank,
  upgradeTier,
  downgradeTier,
  generateReferralCode
};