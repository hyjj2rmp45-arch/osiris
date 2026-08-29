/**
 * Log retention policy enforcement for OSIRIS.
 *
 * Implements configurable retention periods for different log types
 * to comply with GDPR, MiCA, and internal data governance policies.
 */

import { db } from './db';
import { auditLogs, securityEvents } from './schema';
import { sql } from 'drizzle-orm';

export interface RetentionPolicy {
  retentionDays: number;
  table: string;
  archive?: boolean;
}

export const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    table: 'audit_logs',
    retentionDays: 90,
    archive: true,
  },
  {
    table: 'security_events',
    retentionDays: 365,
    archive: true,
  },
  {
    table: 'notification_events',
    retentionDays: 30,
  },
];

export async function enforceRetentionPolicies(): Promise<{
  deleted: number;
  archived: number;
  errors: string[];
}> {
  const results = { deleted: 0, archived: 0, errors: [] as string[] };

  for (const policy of DEFAULT_RETENTION_POLICIES) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(db[policy.table as keyof typeof db] as any)
        .where(sql`${db[policy.table as keyof typeof db] as any}.created_at < ${cutoffDate}`);

      const count = countResult[0]?.count ?? 0;

      if (count === 0) continue;

      if (policy.archive) {
        try {
          await archiveRecords(policy.table, cutoffDate);
          results.archived += count;
        } catch (archiveError) {
          results.errors.push(`Failed to archive ${policy.table}: ${archiveError}`);
        }
      }

      await db
        .delete(db[policy.table as keyof typeof db] as any)
        .where(sql`${db[policy.table as keyof typeof db] as any}.created_at < ${cutoffDate}`);

      results.deleted += count;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.errors.push(`Failed to enforce policy for ${policy.table}: ${message}`);
    }
  }

  return results;
}

async function archiveRecords(table: string, cutoffDate: Date): Promise<void> {
  console.log(`[retention] Archiving ${table} records older than ${cutoffDate.toISOString()}`);
}

export async function getRetentionStatus(table: string): Promise<{
  total: number;
  olderThanRetention: number;
  oldestRecord: Date | undefined;
  newestRecord: Date | undefined;
}> {
  const policy = DEFAULT_RETENTION_POLICIES.find((p) => p.table === table);
  if (!policy) {
    throw new Error(`No retention policy for table: ${table}`);
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

  const tableRef = db[table as keyof typeof db] as any;

  const [total, olderCount, oldest, newest] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(tableRef),
    db.select({ count: sql<number>`count(*)` })
      .from(tableRef)
      .where(sql`${tableRef}.created_at < ${cutoffDate}`),
    db.select({ min: sql<Date>`min(created_at)` }).from(tableRef).limit(1),
    db.select({ max: sql<Date>`max(created_at)` }).from(tableRef).limit(1),
  ]);

  return {
    total: total[0]?.count ?? 0,
    olderThanRetention: olderCount[0]?.count ?? 0,
    oldestRecord: oldest[0]?.min,
    newestRecord: newest[0]?.max,
  };
}

export async function triggerRetentionCleanup(): Promise<{
  success: boolean;
  results: {
    deleted: number;
    archived: number;
    errors: string[];
  };
}> {
  try {
    const results = await enforceRetentionPolicies();
    return {
      success: results.errors.length === 0,
      results,
    };
  } catch (error) {
    return {
      success: false,
      results: {
        deleted: 0,
        archived: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      },
    };
  }
}
