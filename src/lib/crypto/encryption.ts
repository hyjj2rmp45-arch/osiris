import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

export function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

export function encrypt(plaintext: Buffer, key: Buffer): { ciphertext: Buffer; iv: Buffer; authTag: Buffer; salt: Buffer } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derivedKey = deriveKey(key.toString('hex'), salt);
  
  const cipher = crypto.createCipheriv(ALGO, derivedKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return { ciphertext, iv, authTag, salt };
}

export function decrypt(ciphertext: Buffer, key: Buffer, iv: Buffer, authTag: Buffer, salt: Buffer): Buffer {
  const derivedKey = deriveKey(key.toString('hex'), salt);
  
  const decipher = crypto.createDecipheriv(ALGO, derivedKey, iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function encryptString(plaintext: string, key: Buffer): string {
  const result = encrypt(Buffer.from(plaintext, 'utf8'), key);
  const combined = Buffer.concat([result.salt, result.iv, result.authTag, result.ciphertext]);
  return combined.toString('base64');
}

export function decryptString(encrypted: string, key: Buffer): string {
  const combined = Buffer.from(encrypted, 'base64');
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decrypted = decrypt(ciphertext, key, iv, authTag, salt);
  return decrypted.toString('utf8');
}
