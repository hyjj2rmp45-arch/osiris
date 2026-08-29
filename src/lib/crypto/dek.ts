import crypto from 'crypto';
import { kekService } from './kek';

export interface DekRecord {
  id: string;
  wrappedDek: string;
  iv: string;
  salt: string;
  authTag: string;
  createdAt: Date;
  rotatedAt?: Date;
}

export class DekService {
  private readonly deks = new Map<string, { dek: Buffer; record: DekRecord }>();

  async getDek(dekId: string): Promise<Buffer | null> {
    if (this.deks.has(dekId)) {
      return this.deks.get(dekId)!.dek;
    }

    // In production, load from database
    return null;
  }

  createDek(): { dek: Buffer; record: DekRecord } {
    const dek = crypto.randomBytes(32);
    const wrapped = kekService.wrapDek(dek);
    const record: DekRecord = {
      id: crypto.randomUUID(),
      wrappedDek: wrapped.wrapped,
      iv: wrapped.iv,
      salt: wrapped.salt,
      authTag: wrapped.authTag,
      createdAt: new Date(),
    };

    this.deks.set(record.id, { dek, record });
    return { dek: dek, record };
  }

  rotateDek(oldDekId: string): { dek: Buffer; record: DekRecord } {
    const oldDek = this.deks.get(oldDekId);
    if (!oldDek) {
      throw new Error(`DEK ${oldDekId} not found`);
    }

    const newDek = crypto.randomBytes(32);
    const wrapped = kekService.wrapDek(newDek);
    const record: DekRecord = {
      id: crypto.randomUUID(),
      wrappedDek: wrapped.wrapped,
      iv: wrapped.iv,
      salt: wrapped.salt,
      authTag: wrapped.authTag,
      createdAt: new Date(),
      rotatedAt: new Date(),
    };

    this.deks.set(record.id, { dek: newDek, record });
    return { dek: newDek, record };
  }

  async encrypt(dekId: string, plaintext: string): Promise<string> {
    const dek = await this.getDek(dekId);
    if (!dek) {
      throw new Error(`DEK ${dekId} not found`);
    }
    return kekService.encrypt(plaintext);
  }

  async decrypt(dekId: string, ciphertext: string): Promise<string> {
    const dek = await this.getDek(dekId);
    if (!dek) {
      throw new Error(`DEK ${dekId} not found`);
    }
    return kekService.decrypt(ciphertext);
  }
}

export const dekService = new DekService();
