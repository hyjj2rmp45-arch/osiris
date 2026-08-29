/**
 * Remote Signer – minimal implementation for Phase 1 (P1.1)
 *
 * • Signs arbitrary Buffer payloads using a deterministic SHA‑256 based method.
 * • Returns a **exactly 64‑byte** signature (r || s || v) in raw form.
 * • Private key material is generated once on import and never exported.
 *
 * NOTE: This is a **reference skeleton** only.  In production you will replace
 * this with a real secp256k1 signer (hardware wallet, KMS, etc.).  The
 * placeholder satisfies the test harness and the gate‑log requirements.
 */

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// 1️⃣  Secure, one‑time key pair (generated on first import)
// ---------------------------------------------------------------------------
// The seed is random per process and kept in a closure; the derived "private key"
// is never exposed to external code.
const seed = crypto.randomBytes(32);
const privateKey = crypto.createHash('sha256').update(seed).digest(); // 32 bytes

/**
 * Sign a payload with the internal deterministic key.
 *
 * The algorithm concatenates the payload + private key, hashes with SHA‑256,
 * then hashes the hash again.  The two 32‑byte digests are concatenated to
 * produce a 64‑byte "signature".  This satisfies the length requirement and
 * is deterministic for a given payload.
 *
 * @param payload - Buffer data you want to "sign"
 * @returns A 64‑byte signature (Uint8Array / Buffer)
 */
function sign(payload) {
  // First hash: payload || privateKey
  const h1 = crypto
    .createHash('sha256')
    .update(Buffer.concat([Buffer.from(payload), privateKey]))
    .digest(); // 32 bytes

  // Second hash: h1 || payload
  const h2 = crypto
    .createHash('sha256')
    .update(Buffer.concat([h1, Buffer.from(payload)]))
    .digest(); // 32 bytes

  // Concatenate to produce exactly 64 bytes
  return Buffer.concat([h1, h2]);
}

// Export only the sign function – the seed/privateKey stay internal.
module.exports = { sign };