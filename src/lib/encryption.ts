/**
 * Encryption at rest utilities — OSIRIS
 *
 * AES-256-GCM field-level encryption for sensitive data.
 * Used for API keys, private keys, and session tokens stored in Redis.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard
const AUTH_TAG_LENGTH = 16;

const keyEnv = process.env.ENCRYPTION_KEY;

if (!keyEnv) {
  console.warn('[encryption] ENCRYPTION_KEY not set — encryption disabled');
}

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  if (!keyEnv) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  // Derive 32-byte key from env var (must be 64 hex chars)
  if (keyEnv.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters');
  }

  cachedKey = Buffer.from(keyEnv, 'hex');
  return cachedKey;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all hex)
  const parts = [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ];

  return parts.join(':');
}

export function decrypt(encrypted: string): string {
  const key = getKey();
  const parts = encrypted.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex as string, 'hex');
  const authTag = Buffer.from(authTagHex as string, 'hex');
  const ciphertext = Buffer.from(ciphertextHex as string, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}

export function maskSensitive(data: string, visibleChars = 4): string {
  if (data.length <= visibleChars + 4) {
    return '*'.repeat(data.length);
  }
  return data.substring(0, visibleChars) + '*'.repeat(data.length - visibleChars - 4) + data.substring(data.length - 4);
}