import * as crypto from 'crypto';
import * as fs from 'fs';

const KEK_ALGO = 'aes-256-gcm';
const ENCRYPTED_KEY_PATH = '/c/Users/kathi/workspace/osiris/packages/keys/kek.enc';

/**
 * Generate a fresh KEK (Key Encryption Key) and persist it to disk.
 * Overwrites any existing KEK file.
 * Returns the raw KEK buffer.
 */
export function generateAndPersistKEK(): Buffer {
  const kek = crypto.randomBytes(32); // 256-bit key
  const kekBase64 = kek.toString('base64');
  fs.writeFileSync(ENCRYPTED_KEY_PATH, kekBase64);
  return kek;
}

/**
 * Load the persisted KEK from disk.
 * Throws if the file does not exist.
 */
export function loadKEK(): Buffer {
  const kekBase64 = fs.readFileSync(ENCRYPTED_KEY_PATH, 'utf8');
  return Buffer.from(kekBase64, 'base64');
}

/**
 * Encrypt a DEK with the KEK using AES-256-GCM.
 * Returns an object containing the encrypted key, iv, and authTag.
 */
export function encryptDEK(kek: Buffer, dek: Buffer): {
  encryptedKey: Buffer;
  iv: Buffer;
  authTag: Buffer;
} {
  const iv = crypto.randomBytes(12); // GCM nonce
  const cipher = crypto.createCipheriv(KEK_ALGO, kek, iv);
  const encryptedKey = Buffer.concat([cipher.update(dek), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { encryptedKey, iv, authTag };
}

/**
 * Decrypt an encrypted DEK.
 * Expects the same shape as returned by encryptDEK.
 */
export function decryptDEK(
  encryptedKey: Buffer,
  iv: Buffer,
  authTag: Buffer,
  kek: Buffer
): Buffer {
  const decipher = crypto.createDecipheriv(KEK_ALGO, kek, iv);
  decipher.setAuthTag(authTag);
  const restored = Buffer.concat([decipher.update(encryptedKey), decipher.final()]);
  return restored;
}

/**
 * Generate an Ed25519 keypair (private & public) for signing only.
 * Returns DER-encoded private and public keys.
 */
export function generateEd25519KeyPair(): { privateKey: Buffer; publicKey: Buffer } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    privateKey: privateKey.export({ type: 'pkcs8', format: 'der' }),
    publicKey: publicKey.export({ type: 'spki', format: 'der' })
  };
}

/**
 * Sign data using the Ed25519 private key.
 * Returns the signature as a Buffer.
 */
export function signData(privateKey: Buffer, data: Buffer): Buffer {
  // @ts-ignore - crypto.sign returns unknown for types below Node 20
  return crypto.sign(null, data, privateKey);
}

/**
 * Verify an Ed25519 signature.
 * Returns true if the signature is valid.
 */
export function verifySignature(publicKey: Buffer, data: Buffer, signature: Buffer): boolean {
  // @ts-ignore - crypto.verify returns unknown for types below Node 20
  return crypto.verify(null, data, publicKey, signature);
}

/**
 * Generate a fresh DEK (Data Encryption Key) – 32 random bytes.
 */
export function generateDEK(): Buffer {
  return crypto.randomBytes(32);
}