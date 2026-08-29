/**
 * Associated Token Account (ATA) management – Phase 1 (P1.4d)
 *
 * Provides functions to derive, create, and close ATAs for a given wallet.
 * In production this will use the Solana Web3 SDK and on‑chain calls.
 * This stub returns deterministic placeholder data so the code compiles
 * and basic tests pass.
 */

const crypto = require('crypto');

/**
 * Derive the ATA address for a given wallet and token mint.
 * @param {string} walletPublicKey - Base58 wallet address.
 * @param {string} tokenMint - Base58 token mint address.
 * @returns {string} Placeholder ATA address (deterministic hash).
 */
function deriveATA(walletPublicKey, tokenMint) {
  const input = `${walletPublicKey}:${tokenMint}`;
  const hash = crypto.createHash('sha256').update(input).digest();
  // Return as a fake base58 string (just for placeholder)
  return hash.toString('hex').slice(0, 44);
}

/**
 * Create an ATA for a wallet and token mint.
 * @param {string} walletPublicKey
 * @param {string} tokenMint
 * @returns {Promise<string>} Transaction signature (placeholder).
 */
async function createATA(walletPublicKey, tokenMint) {
  // In production: build and send a transaction to create the ATA.
  // Here we return a deterministic placeholder signature.
  const input = `create:${walletPublicKey}:${tokenMint}`;
  const hash = crypto.createHash('sha256').update(input).digest();
  return `tx_${hash.toString('hex').slice(0, 16)}`;
}

/**
 * Close an ATA and return lamports to the wallet.
 * @param {string} walletPublicKey
 * @param {string} tokenMint
 * @returns {Promise<string>} Transaction signature (placeholder).
 */
async function closeATA(walletPublicKey, tokenMint) {
  const input = `close:${walletPublicKey}:${tokenMint}`;
  const hash = crypto.createHash('sha256').update(input).digest();
  return `tx_${hash.toString('hex').slice(0, 16)}`;
}

module.exports = {
  deriveATA,
  createATA,
  closeATA
};