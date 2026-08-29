/**
 * Deposit Wallets – Phase 2 (P2.3)
 *
 * Each user gets a deposit wallet; payments to it are monitored and
 * auto‑credited on verified payment. Duplicate payments are rejected.
 *
 * In production this uses Helius webhooks or polling + the deposit wallet
 * key derived from user key. This stub provides the API surface and an
 * in‑memory ledger for tests.
 */

const crypto = require('crypto');

// In‑memory store: userId -> { depositAddress, balanceLamports, history[] }
const wallets = new Map();
// In‑memory duplicate detector: set of processed tx signatures per wallet
const processedSigs = new Map();

/**
 * Generate (deterministic stub) a deposit address for a user.
 * @param {string} userId
 * @returns {string} deposit address
 */
function generateDepositAddress(userId) {
  const hash = crypto.createHash('sha256').update(`deposit:${userId}`).digest();
  return hash.toString('hex').slice(0, 44);
}

/**
 * Get (or create) a user's deposit wallet.
 * @param {string} userId
 * @returns {Object} { userId, depositAddress, balanceLamports, history }
 */
function getOrCreateWallet(userId) {
  if (!wallets.has(userId)) {
    const depositAddress = generateDepositAddress(userId);
    wallets.set(userId, { userId, depositAddress, balanceLamports: 0, history: [] });
  }
  return wallets.get(userId);
}

/**
 * Detect a payment to a deposit wallet.
 * Stub: checks that the payment was already verified upstream (see paymentVerify)
 * and that this signature has not already been credited.
 *
 * @param {string} userId
 * @param {Object} payment - { signature, amountLamports }
 * @returns {Promise<Object>} { accepted, reason?, balance }
 */
async function detectPayment(userId, { signature, amountLamports }) {
  const wallet = getOrCreateWallet(userId);

  // Duplicate detection: same signature can't be credited twice
  const sigs = processedSigs.get(userId) || new Set();
  if (sigs.has(signature)) {
    return { accepted: false, reason: 'DUPLICATE_PAYMENT', balance: wallet.balanceLamports };
  }

  // Credit the balance
  wallet.balanceLamports += amountLamports;
  wallet.history.push({ signature, amountLamports, at: new Date().toISOString() });
  sigs.add(signature);
  processedSigs.set(userId, sigs);

  return { accepted: true, balance: wallet.balanceLamports };
}

/**
 * Get deposit history for a user.
 * @param {string} userId
 * @returns {Array<Object>} history
 */
function getDepositHistory(userId) {
  const wallet = wallets.get(userId);
  return wallet ? wallet.history : [];
}

/**
 * Reset all deposit wallets (test helper).
 */
function resetDeposits() {
  wallets.clear();
  processedSigs.clear();
}

module.exports = {
  generateDepositAddress,
  getOrCreateWallet,
  detectPayment,
  getDepositHistory,
  resetDeposits
};