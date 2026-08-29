import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNotificationReport, getNotificationTimeSeries } from '@/lib/reports';

const mockExecute = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    execute: (...args: any[]) => mockExecute(...args),
  },
}));

describe('reports', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns empty report when no rows match', async () => {
    mockExecute.mockResolvedValue({ rows: [] });

    const report = await getNotificationReport({ timeframe: '24h' });

    expect(report.total).toBe(0);
    expect(report.bySeverity).toEqual({});
    expect(report.bySource).toEqual({});
    expect(report.byChannel).toEqual({});
    expect(report.timeframe).toBe('24h');
  });

  it('aggregates notification counts by severity, source, and channel', async () => {
    mockExecute.mockResolvedValue({
      rows: [
        { severity: 'critical', source: 'system', channel: 'ntfy', count: 3 },
        { severity: 'high', source: 'circuit-breaker', channel: 'telegram', count: 2 },
      ],
    });

    const report = await getNotificationReport({ timeframe: '24h' });

    expect(report.total).toBe(5);
    expect(report.bySeverity).toEqual({ critical: 3, high: 2 });
    expect(report.bySource).toEqual({ system: 3, 'circuit-breaker': 2 });
    expect(report.byChannel).toEqual({ ntfy: 3, telegram: 2 });
  });

  it('returns empty time series when no rows match', async () => {
    mockExecute.mockResolvedValue({ rows: [] });

    const series = await getNotificationTimeSeries({ timeframe: '24h' });

    expect(series).toEqual({});
  });

  it('returns hourly time series counts', async () => {
    mockExecute.mockResolvedValue({
      rows: [
        { bucket: '2025-01-01T00:00:00.000Z', count: 4 },
        { bucket: '2025-01-01T01:00:00.000Z', count: 2 },
      ],
    });

    const series = await getNotificationTimeSeries({ timeframe: '24h' });

    expect(series['2025-01-01T00:00:00.000Z']).toBe(4);
    expect(series['2025-01-01T01:00:00.000Z']).toBe(2);
  });
});
