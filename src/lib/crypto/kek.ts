import crypto from 'crypto';
import { encryptString, decryptString } from './encryption';

export interface WrappedDek {
  wrapped: string;
  iv: string;
  salt: string;
  authTag: string;
}

export class KeKService {
  private readonly key: Buffer | null = null;

  constructor() {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (keyHex) {
      this.key = Buffer.from(keyHex, 'hex');
    }
  }

  isReady(): boolean {
    return this.key !== null;
  }

  wrapDek(plainDek: Buffer): WrappedDek {
    if (!this.key) {
      throw new Error('KEK not initialized: ENCRYPTION_KEY missing');
    }

    const iv = crypto.randomBytes(12);
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(this.key, salt, 100000, 32, 'sha256');
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plainDek), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      wrapped: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      salt: salt.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  unwrapDek(wrapped: WrappedDek): Buffer {
    if (!this.key) {
      throw new Error('KEK not initialized: ENCRYPTION_KEY missing');
    }

    const salt = Buffer.from(wrapped.salt, 'base64');
    const iv = Buffer.from(wrapped.iv, 'base64');
    const authTag = Buffer.from(wrapped.authTag, 'base64');
    const ciphertext = Buffer.from(wrapped.wrapped, 'base64');

    const key = crypto.pbkdf2Sync(this.key, salt, 100000, 32, 'sha256');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  encrypt(plaintext: string): string {
    if (!this.key) {
      throw new Error('KEK not initialized: ENCRYPTION_KEY missing');
    }
    return encryptString(plaintext, this.key);
  }

  decrypt(ciphertext: string): string {
    if (!this.key) {
      throw new Error('KEK not initialized: ENCRYPTION_KEY missing');
    }
    return decryptString(ciphertext, this.key);
  }
}

export const kekService = new KeKService();
