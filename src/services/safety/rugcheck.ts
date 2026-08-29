/**
 * P5.5 — RugCheck Integration
 *
 * Risk score caching and trade blocking for high-risk tokens.
 */

import redis from '@/lib/redis';
import { db } from '@/lib/db';
import { tokenMetadata } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { AdminAlerts } from '@/lib/admin-alerts';

export interface RugCheckReport {
  mint: string;
  riskScore: number;
  risks: string[];
  passed: boolean;
}

export class RugCheckService {
  private readonly apiBase = 'https://api.rugcheck.xyz/v1';
  private readonly cacheTtl = 60 * 60;

  async check(mint: string): Promise<RugCheckReport> {
    const cacheKey = `rugcheck:${mint}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as RugCheckReport;
          if (parsed && parsed.mint) {
            return parsed;
          }
        } catch {
          // ignore corrupt cache
        }
      }
    } catch (err) {
      AdminAlerts.high(`RugCheck cache read failed: ${err instanceof Error ? err.message : err}`, mint, 'rugcheck');
    }

    let report: RugCheckReport;
    try {
      report = await this.fetchReport(mint);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      AdminAlerts.critical(`RugCheck fetch failed: ${message}`, mint, 'rugcheck');
      report = {
        mint,
        riskScore: 100,
        risks: [`RugCheck fetch failed: ${message}`],
        passed: false,
      };
    }

    try {
      await redis.setex(cacheKey, this.cacheTtl, JSON.stringify(report));
    } catch {
      // ignore cache errors
    }

    if (report.riskScore > 50) {
      try {
        await db.update(tokenMetadata)
          .set({ riskScore: report.riskScore, updatedAt: new Date() })
          .where(eq(tokenMetadata.mint, mint));
      } catch (err) {
        AdminAlerts.high(`RugCheck DB update failed: ${err instanceof Error ? err.message : err}`, mint, 'rugcheck');
      }
    }

    return report;
  }

  private async fetchReport(mint: string): Promise<RugCheckReport> {
    const response = await fetch(`${this.apiBase}/tokens/${mint}`, {
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`RugCheck HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      score?: number;
      risks?: Array<{ name?: string }>;
    };

    const riskScore = Number(data.score ?? 100);
    const risks = (data.risks ?? []).map(r => r.name ?? 'unknown').filter(Boolean);

    return {
      mint,
      riskScore,
      risks,
      passed: riskScore <= 50,
    };
  }
}

export const rugCheckService = new RugCheckService();
