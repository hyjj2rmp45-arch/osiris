/**
 * Encrypted storage utilities for OSIRIS Telegram Mini App.
 *
 * Uses Web Crypto API with a session-specific key derived from Telegram initData.
 * Data is encrypted before being stored in localStorage.
 */

const ALGO = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const HASH = 'SHA-256';

/** Derive a cryptographic key from a password and salt using PBKDF2. */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: ITERATIONS,
      hash: HASH,
    },
    keyMaterial,
    { name: ALGO, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Encrypt data for storage in localStorage. */
export async function encryptForStorage(data: unknown, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(data));

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    plaintext
  );

  const combined = new Uint8Array(salt.length + iv.length + new Uint8Array(ciphertext).length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/** Decrypt data from localStorage. */
export async function decryptFromStorage<T>(encryptedData: string, password: string): Promise<T | null> {
  try {
    const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

    const key = await deriveKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    const plaintext = decoder.decode(decrypted);
    return JSON.parse(plaintext) as T;
  } catch {
    return null;
  }
}

/** Secure storage wrapper that encrypts data before storing in localStorage. */
export class SecureStorage {
  private password: string;
  private prefix: string;

  constructor(password: string, prefix = 'osiris_secure_') {
    this.password = password;
    this.prefix = prefix;
  }

  async set(key: string, value: unknown): Promise<void> {
    const encrypted = await encryptForStorage(value, this.password);
    localStorage.setItem(this.prefix + key, encrypted);
  }

  async get<T>(key: string): Promise<T | null> {
    const encrypted = localStorage.getItem(this.prefix + key);
    if (!encrypted) return null;
    return decryptFromStorage<T>(encrypted, this.password);
  }

  remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    }
  }
}
