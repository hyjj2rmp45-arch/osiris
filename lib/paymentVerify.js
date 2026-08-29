/**
 * SOL Payment Verification – Phase 2 (P2.2, PAY‑01)
 *
 * Verifies a SOL payment transaction:
 *   - Fetches the transaction with commitment "confirmed"
 *   - Parses SOL transfer instructions (SystemProgram + inner instructions)
 *   - Verifies correct recipient, correct amount, confirmed status
 *   - Idempotency: same signature cannot be counted twice
 *
 * In production this calls the Solana RPC getTransaction. This stub simulates
 * the parsing/verification logic and keeps an in‑memory idempotency ledger.
 */

const KNOWN_RECIPIENT = 'DEPOSIT_WALLET_PLACEHOLDER'; // set to the deposit wallet
const KNOWN_AMOUNT_LAMPORTS = 100_000_000; // 0.1 SOL – expected payment amount (illustrative)

// In‑memory idempotency ledger (production: DB with unique constraint on signature)
const processedSignatures = new Set();

// Simulated tx store – in production this comes from Solana RPC getTransaction
const simulatedTransactions = new Map();

/**
 * Register a fake transaction (test helper / simulation of RPC).
 * @param {string} signature
 * @param {Object} tx - { recipient, amount, confirmed }
 */
function registerSimulatedTransaction(signature, { recipient, amount, confirmed = true }) {
  simulatedTransactions.set(signature, { recipient, amount, confirmed });
}

/**
 * Fetch a transaction from the RPC (stub).
 * @param {string} signature
 * @returns {Promise<Object|null>} { recipient, amount, confirmed } or null
 */
async function getTransaction(signature) {
  return simulatedTransactions.get(signature) || null;
}

/**
 * Verify a SOL payment.
 *
 * @param {string} signature - transaction signature
 * @param {Object} [expected] - overrides { recipient, amountLamports }
 * @returns {Promise<Object>} { valid, reason?, signature }
 */
async function verifyPayment(signature, expected = {}) {
  const expectedRecipient = expected.recipient || KNOWN_RECIPIENT;
  const expectedAmount = expected.amountLamports !== undefined
    ? expected.amountLamports
    : KNOWN_AMOUNT_LAMPORTS;

  // Idempotency: already processed?
  if (processedSignatures.has(signature)) {
    return { valid: false, reason: 'DUPLICATE_SIGNATURE', signature };
  }

  // Fetch transaction
  const tx = await getTransaction(signature);
  if (!tx) {
    return { valid: false, reason: 'TX_NOT_FOUND', signature };
  }

  // Must be confirmed
  if (!tx.confirmed) {
    return { valid: false, reason: 'UNCONFIRMED', signature };
  }

  // Must be correct recipient
  if (tx.recipient !== expectedRecipient) {
    return { valid: false, reason: 'WRONG_RECIPIENT', signature };
  }

  // Must be correct amount
  if (tx.amount !== expectedAmount) {
    return { valid: false, reason: 'INSUFFICIENT_AMOUNT', signature };
  }

  // Mark as processed (idempotency)
  processedSignatures.add(signature);
  return { valid: true, signature };
}

/**
 * Whether a signature has already been processed (for idempotency checks).
 * @param {string} signature
 * @returns {boolean}
 */
function isProcessed(signature) {
  return processedSignatures.has(signature);
}

/**
 * Reset the idempotency ledger (test helper).
 */
function resetLedger() {
  processedSignatures.clear();
}

module.exports = {
  verifyPayment,
  getTransaction,
  isProcessed,
  resetLedger,
  registerSimulatedTransaction,
  KNOWN_RECIPIENT,
  KNOWN_AMOUNT_LAMPORTS
};