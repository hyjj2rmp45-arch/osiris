/**
 * Wallet Recovery & Backup UX – Phase 2 (P2.6)
 *
 * Recovery flow implementation:
 *   - Tier 1: Email-based recovery (encrypted fragment)
 *   - Tier 2: Social recovery (2-of-3 contacts)
 *   - Tier 3: Manual seed phrase backup (required for whale tier)
 *   - Recovery audit log (who, when, method)
 *
 * NOTE: Production must use Shamir's Secret Sharing (SSS) to split the seed
 * into shards so no single party can reconstruct it. This stub simulates the
 * API surface and audit logging without implementing real cryptography.
 * A real implementation MUST NOT expose plaintext seed to the server.
 */

// In-memory stores for stub
const shards = new Map();       // userId -> array of shard placeholders
const auditLog = [];            // recovery audit entries

/**
 * Split a seed into N shards (placeholder – not real SSS).
 * @param {string} userId
 * @param {string} seed - the seed phrase (in production, only shards stored)
 * @param {number} nShards - number of shards to produce
 * @returns {Array<string>} array of shard placeholders
 */
function splitSeed(userId, seed, nShards = 3) {
  if (typeof seed !== 'string' || seed.length === 0) throw new Error('Seed required');
  if (nShards < 2) throw new Error('At least 2 shards required');
  // Placeholder: fake shards derived from seed hash (NOT real SSS)
  const crypto = require('crypto');
  const base = crypto.createHash('sha256').update(`${userId}:${seed}`).digest('hex');
  const result = [];
  for (let i = 0; i < nShards; i++) {
    result.push(`SHARD-${i + 1}-${base.slice(0, 12)}`);
  }
  shards.set(userId, result);
  logAudit(userId, 'seed-split', `Split into ${nShards} shards`);
  return result;
}

/**
 * Verify a recovery fragment / shard.
 * Placeholder – in production this verifies the shard against the stored fragment.
 * @param {string} userId
 * @param {string} fragment
 * @returns {boolean}
 */
function verifyFragment(userId, fragment) {
  const userShards = shards.get(userId) || [];
  logAudit(userId, 'fragment-verify', fragment ? 'Fragment submitted' : 'Empty fragment');
  return userShards.includes(fragment);
}

/**
 * Perform a 2-of-3 social recovery: check that >= threshold of provided shards match.
 * @param {string} userId
 * @param {Array<string>} providedShards
 * @param {number} threshold - minimum matching shards required (default 2)
 * @returns {boolean}
 */
function socialRecovery(userId, providedShards, threshold = 2) {
  const userShards = shards.get(userId) || [];
  if (userShards.length === 0) throw new Error('No shards on record for user');
  const matchCount = providedShards.filter(s => userShards.includes(s)).length;
  logAudit(userId, 'social-recovery', `${matchCount}/${userShards.length} shards matched`);
  return matchCount >= threshold;
}

/**
 * Mark manual seed phrase backup as verified (onboarding requirement for whale).
 * @param {string} userId
 * @param {boolean} verified
 * @returns {boolean}
 */
function verifyManualBackup(userId, verified = true) {
  logAudit(userId, 'manual-backup', verified ? 'Backup verified' : 'Backup NOT verified');
  return verified;
}

/**
 * Retrieve the recovery audit log (optionally filtered by user).
 * @param {string} [userId]
 * @returns {Array<Object>}
 */
function getAuditLog(userId) {
  return userId ? auditLog.filter(e => e.userId === userId) : auditLog.slice();
}

/**
 * Internal helper: append an audit entry.
 */
function logAudit(userId, method, detail) {
  auditLog.push({ userId, method, detail, at: new Date().toISOString() });
}

/**
 * Reset all recovery state (test helper).
 */
function resetRecovery() {
  shards.clear();
  auditLog.length = 0;
}

module.exports = {
  splitSeed,
  verifyFragment,
  socialRecovery,
  verifyManualBackup,
  getAuditLog,
  resetRecovery
};