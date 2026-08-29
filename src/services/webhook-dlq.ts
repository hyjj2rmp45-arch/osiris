/**
 * Webhook Dead Letter Queue — OSIRIS
 * Handles failed webhook events with retry/discard/getStats
 * Uses raw SQL since webhook_dlq is not in the Drizzle schema
 */
import { sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { randomUUID } from 'crypto';

const DLQ_TABLE = 'webhook_dlq';

export async function addFailedEvent(params: {
  eventType: string;
  source: string;
  payload: Record<string, unknown>;
  error: string;
}): Promise<void> {
  await db.execute(sql`
    INSERT INTO ${sql.identifier(DLQ_TABLE)}
      (id, event_type, source, payload, error, retry_count, max_retries, status, created_at, updated_at)
    VALUES (${randomUUID()}, ${params.eventType}, ${params.source},
      ${JSON.stringify(params.payload)}, ${params.error},
      0, 3, 'pending', NOW(), NOW())
  `);
}

export async function retryDlqItem(id: string): Promise<boolean> {
  await db.execute(sql`
    UPDATE ${sql.identifier(DLQ_TABLE)}
    SET retry_count = retry_count + 1, status = 'retrying', updated_at = NOW()
    WHERE id = ${id} AND status = 'pending' AND retry_count < max_retries
  `);
  return true;
}

export async function discardDlqItem(id: string): Promise<void> {
  await db.execute(sql`
    UPDATE ${sql.identifier(DLQ_TABLE)}
    SET status = 'discarded', updated_at = NOW()
    WHERE id = ${id} AND status = 'pending'
  `);
}

export async function getDlqStats(): Promise<{ status: string; count: string }[]> {
  const result = await db.execute(sql`
    SELECT status, COUNT(*) as count FROM ${sql.identifier(DLQ_TABLE)} GROUP BY status
  `);
  return (result.rows ?? []) as { status: string; count: string }[];
}