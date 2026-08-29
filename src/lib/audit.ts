/**
 * Immutable audit trail — OSIRIS
 *
 * Append-only audit events with SHA-256 chain hashing.
 * Events are written to the audit_log table via Drizzle ORM.
 */

import { db } from '@/lib/db';
import { auditLog } from '@/lib/schema';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

export type AuditEventType =
  | 'auth.telegram.initdata.valid'
  | 'auth.telegram.initdata.invalid'
  | 'auth.telegram.session.created'
  | 'auth.telegram.session.revoked'
  | 'auth.dev.mock.used'
  | 'tier.check.denied'
  | 'tier.check.granted'
  | 'tier.updated'
  | 'subscription.expired'
  | 'subscription.auto_renew.toggled'
  | 'session.expired'
  | 'tp.sl.triggered'
  | 'audit.chain.verified'
  | 'audit.chain.mismatch';

export interface AuditEvent {
  type: AuditEventType;
  telegramId?: number;
  userId?: number;
  ip?: string;
  userAgent?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export type LooseAuditEvent = Omit<AuditEvent, 'userAgent' | 'reason'> & {
  userAgent?: string | undefined;
  reason?: string | undefined;
};

export interface AuditTrailEntry {
  id: number;
  eventType: string;
  telegramId: number | null;
  userId: number | null;
  ip: string | null;
  userAgent: string | null;
  reason: string | null;
  metadata: unknown;
  previousHash: string | null;
  entryHash: string | null;
  createdAt: Date;
}

let chainHeadHash = '0'.repeat(64);

function computeEntryHash(
  event: LooseAuditEvent,
  previousHash: string,
  createdAt: Date
): string {
  const payload = JSON.stringify({
    type: event.type,
    telegramId: event.telegramId ?? undefined,
    userId: event.userId ?? undefined,
    ip: event.ip ?? undefined,
    userAgent: event.userAgent ?? undefined,
    reason: event.reason ?? undefined,
    metadata: event.metadata ?? undefined,
    previousHash,
    createdAt: createdAt.toISOString(),
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export async function logAuditEvent(event: LooseAuditEvent): Promise<void> {
  const now = new Date();
  const previousHash = chainHeadHash;
  const entryHash = computeEntryHash(event, previousHash, now);
  chainHeadHash = entryHash;

  try {
    await db.execute(sql`
      INSERT INTO audit_log (
        event_type, telegram_id, user_id, ip, user_agent, reason,
        metadata, previous_hash, entry_hash, created_at
      ) VALUES (
        ${event.type},
        ${event.telegramId ?? null},
        ${event.userId ?? null},
        ${event.ip ?? null},
        ${event.userAgent ?? null},
        ${event.reason ?? null},
        ${event.metadata ?? null}::jsonb,
        ${previousHash},
        ${entryHash},
        ${now}
      )
    `);
  } catch (error) {
    logger.error('[audit] failed to write to audit_log', { error });
  }

  const log = {
    timestamp: now.toISOString(),
    type: event.type,
    telegramId: event.telegramId,
    userId: event.userId,
    ip: event.ip,
    userAgent: event.userAgent,
    reason: event.reason,
    metadata: event.metadata,
    entryHash,
    previousHash,
  };
  console.error(`[AUDIT] ${JSON.stringify(log)}`);
}

export async function verifyAuditChain(
  fromId?: number
): Promise<{ valid: boolean; mismatchAt?: number }> {
  const whereClause = fromId !== undefined
    ? sql`${auditLog.id} >= ${fromId}`
    : sql`${auditLog.id} > 0`;

  const entries: AuditTrailEntry[] = await db
    .select({
      id: auditLog.id,
      eventType: auditLog.eventType,
      telegramId: auditLog.telegramId,
      userId: auditLog.userId,
      ip: auditLog.ip,
      userAgent: auditLog.userAgent,
      reason: auditLog.reason,
      metadata: auditLog.metadata,
      previousHash: auditLog.previousHash,
      entryHash: auditLog.entryHash,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(whereClause)
    .orderBy(auditLog.id)
    .execute();

  let previousHash = '0'.repeat(64);
  for (const entry of entries) {
    const computed = computeEntryHash(
      {
        type: entry.eventType as AuditEventType,
        telegramId: entry.telegramId ?? undefined,
        userId: entry.userId ?? undefined,
        ip: entry.ip ?? undefined,
        userAgent: entry.userAgent ?? undefined,
        reason: entry.reason ?? undefined,
        metadata: (entry.metadata ?? {}) as Record<string, unknown>,
      },
      previousHash,
      entry.createdAt
    );

    if (computed !== entry.entryHash) {
      return { valid: false, mismatchAt: entry.id };
    }
    previousHash = entry.entryHash;
  }

  return { valid: true };
}

export async function getAuditTrail(
  limit = 100,
  offset = 0
): Promise<AuditTrailEntry[]> {
  return db
    .select({
      id: auditLog.id,
      eventType: auditLog.eventType,
      telegramId: auditLog.telegramId,
      userId: auditLog.userId,
      ip: auditLog.ip,
      userAgent: auditLog.userAgent,
      reason: auditLog.reason,
      metadata: auditLog.metadata,
      previousHash: auditLog.previousHash,
      entryHash: auditLog.entryHash,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .orderBy(auditLog.id)
    .limit(limit)
    .offset(offset)
    .execute();
}
