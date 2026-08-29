import { db } from '@/lib/db';
import { notificationEvents } from '@/lib/schema';
import { sql } from 'drizzle-orm';

export type ReportTimeframe = '24h' | '7d' | '30d' | '90d';

export interface ReportFilters {
  timeframe?: ReportTimeframe;
  source?: string;
  severity?: string;
  channel?: string;
}

export interface ReportSummary {
  total: number;
  bySeverity: Record<string, number>;
  bySource: Record<string, number>;
  byChannel: Record<string, number>;
  timeframe: ReportTimeframe;
  generatedAt: string;
}

const timeframeHours: Record<ReportTimeframe, number> = {
  '24h': 24,
  '7d': 168,
  '30d': 720,
  '90d': 2160,
};

function getTimeframeDate(timeframe: ReportTimeframe): Date {
  const hours = timeframeHours[timeframe] || 24;
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}

export async function getNotificationReport(filters: ReportFilters = {}): Promise<ReportSummary> {
  const timeframe = filters.timeframe || '24h';
  const since = getTimeframeDate(timeframe);

  const rows = await db.execute(sql`
    SELECT
      COALESCE(severity, 'unknown') as severity,
      COALESCE(source, 'unknown') as source,
      COALESCE(channel, 'unknown') as channel,
      COUNT(*) as count
    FROM notification_events
    WHERE created_at >= ${since}
      AND (${filters.source}::text IS NULL OR source = ${filters.source})
      AND (${filters.severity}::text IS NULL OR severity = ${filters.severity})
      AND (${filters.channel}::text IS NULL OR channel = ${filters.channel})
    GROUP BY severity, source, channel
  `);

  const summary: ReportSummary = {
    total: 0,
    bySeverity: {},
    bySource: {},
    byChannel: {},
    timeframe,
    generatedAt: new Date().toISOString(),
  };

  for (const row of rows.rows as any[]) {
    const count = Number(row.count) || 0;
    summary.total += count;
    summary.bySeverity[row.severity] = (summary.bySeverity[row.severity] || 0) + count;
    summary.bySource[row.source] = (summary.bySource[row.source] || 0) + count;
    summary.byChannel[row.channel] = (summary.byChannel[row.channel] || 0) + count;
  }

  return summary;
}

export async function getNotificationTimeSeries(filters: ReportFilters = {}): Promise<Record<string, number>> {
  const timeframe = filters.timeframe || '24h';
  const since = getTimeframeDate(timeframe);

  const rows = await db.execute(sql`
    SELECT
      DATE_TRUNC('hour', created_at) as bucket,
      COUNT(*) as count
    FROM notification_events
    WHERE created_at >= ${since}
      AND (${filters.source}::text IS NULL OR source = ${filters.source})
      AND (${filters.severity}::text IS NULL OR severity = ${filters.severity})
      AND (${filters.channel}::text IS NULL OR channel = ${filters.channel})
    GROUP BY bucket
    ORDER BY bucket ASC
  `);

  const result: Record<string, number> = {};
  for (const row of rows.rows as any[]) {
    result[String(row.bucket)] = Number(row.count) || 0;
  }

  return result;
}
