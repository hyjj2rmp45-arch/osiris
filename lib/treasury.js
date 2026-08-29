/**
 * Revenue Model, Fee Structure & Treasury – Phase 2 (P2.7)
 *
 * Fee structure per tier:
 *   Free (0%), Basic (1.0%), Pro (0.75%), Whale (0.5%)
 * Fee distribution:
 *   40% treasury, 30% referrer, 20% Jito tip, 10% insurance
 * Referral commission tiers: 20%-35% based on volume
 * Treasury withdrawal: 2-of-3 multi-sig, 48-hour timelock
 *
 * In production these are enforced on every trade and DB-backed.
 * This stub provides the calculation logic and a treasury withdrawal
 * placeholder with multi-sig + timelock semantics.
 */

const FEE_BPS = {
  free: 0,
  basic: 100,   // 1.0%
  pro: 75,      // 0.75%
  whale: 50     // 0.5%
};

const DISTRIBUTION = {
  treasury: 0.40,
  referrer: 0.30,
  jitoTip: 0.20,
  insurance: 0.10
};

const TIMELOCK_MS = 48 * 60 * 60 * 1000; // 48 hours

// Treasury state
const treasury = {
  balanceLamports: 0,
  pendingWithdrawals: [] // { id, amount, signatures[], requestedAt }
};
let withdrawalCounter = 0;

/**
 * Calculate the fee (in lamports) for a trade based on the user's tier.
 * @param {string} tier
 * @param {number} amountLamports
 * @returns {number} fee in lamports
 */
function calculateTierFee(tier, amountLamports) {
  const bps = FEE_BPS[tier] !== undefined ? FEE_BPS[tier] : FEE_BPS.free;
  return Math.floor((amountLamports * bps) / 10000);
}

/**
 * Distribute a collected fee across treasury, referrer, Jito tip, and insurance.
 * @param {number} feeLamports
 * @param {number} [referrerShareBps] - referral commission bps (20-35%)
 * @returns {Object} distribution breakdown in lamports
 */
function distributeFee(feeLamports, referrerShareBps = 300) {
  if (referrerShareBps < 2000 || referrerShareBps > 3500) {
    throw new Error('Referrer share must be 2000-3500 bps (20%-35%)');
  }
  const referrerLamports = Math.floor((feeLamports * referrerShareBps) / 10000);
  const remaining = feeLamports - referrerLamports;
  const treasuryLamports = Math.floor(remaining * DISTRIBUTION.treasury);
  const jitoLamports = Math.floor(remaining * DISTRIBUTION.jitoTip);
  const insuranceLamports = Math.floor(remaining * DISTRIBUTION.insurance);
  // remaining after rounding goes to treasury
  const accounted = referrerLamports + treasuryLamports + jitoLamports + insuranceLamports;
  const treasuryAdj = treasuryLamports + (feeLamports - accounted);

  treasury.balanceLamports += treasuryAdj;

  return {
    referrer: referrerLamports,
    treasury: treasuryAdj,
    jitoTip: jitoLamports,
    insurance: insuranceLamports
  };
}

/**
 * Get current treasury balance.
 * @returns {number}
 */
function getTreasuryBalance() {
  return treasury.balanceLamports;
}

/**
 * Request a treasury withdrawal (2-of-3 multi-sig, 48h timelock).
 * @param {number} amountLamports
 * @param {string} requestedBy
 * @returns {Object} withdrawal request
 */
function requestWithdrawal(amountLamports, requestedBy) {
  if (amountLamports <= 0) throw new Error('Amount must be positive');
  if (amountLamports > treasury.balanceLamports) throw new Error('Insufficient treasury balance');
  const id = `WD-${++withdrawalCounter}`;
  const request = {
    id,
    amountLamports,
    requestedBy,
    signatures: [requestedBy],
    requestedAt: Date.now(),
    approved: false
  };
  treasury.pendingWithdrawals.push(request);
  return request;
}

/**
 * Add a signature to a pending withdrawal (2-of-3 requirement).
 * @param {string} withdrawalId
 * @param {string} signer
 * @returns {Object} updated withdrawal request
 */
function signWithdrawal(withdrawalId, signer) {
  const wd = treasury.pendingWithdrawals.find(w => w.id === withdrawalId);
  if (!wd) throw new Error('Withdrawal not found');
  if (!wd.signatures.includes(signer)) wd.signatures.push(signer);
  // 2-of-3: approved if >= 2 signatures and timelock elapsed
  const hasSignatures = wd.signatures.length >= 2;
  const timelockElapsed = (Date.now() - wd.requestedAt) >= TIMELOCK_MS;
  wd.approved = hasSignatures && timelockElapsed;
  return wd;
}

/**
 * Execute an approved withdrawal (2-of-3 + timelock), debiting treasury.
 * @param {string} withdrawalId
 * @returns {Object} execution result
 */
function executeWithdrawal(withdrawalId) {
  const wd = treasury.pendingWithdrawals.find(w => w.id === withdrawalId);
  if (!wd) throw new Error('Withdrawal not found');
  if (!wd.approved) throw new Error('Withdrawal not approved (need 2-of-3 signatures + 48h timelock)');
  treasury.balanceLamports -= wd.amountLamports;
  return { id: wd.id, amountLamports: wd.amountLamports, executed: true, newBalance: treasury.balanceLamports };
}

/**
 * Reset treasury state (test helper).
 */
function resetTreasury() {
  treasury.balanceLamports = 0;
  treasury.pendingWithdrawals = [];
  withdrawalCounter = 0;
}

module.exports = {
  FEE_BPS,
  DISTRIBUTION,
  TIMELOCK_MS,
  calculateTierFee,
  distributeFee,
  getTreasuryBalance,
  requestWithdrawal,
  signWithdrawal,
  executeWithdrawal,
  resetTreasury
};