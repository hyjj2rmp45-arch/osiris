import { db } from '@/lib/db';
import { payments, subscriptions } from '@/lib/schema';
import { eq, and, gt, lt, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { createCorrelationId } from '@/lib/safety-manager';

export interface ReconciliationResult {
  matched: number;
  missing: number;
  excess: number;
  totalAmount: number;
}

export class ReconciliationService {
  async runDaily(): Promise<ReconciliationResult> {
    const correlationId = createCorrelationId();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentPayments = await db
      .select()
      .from(payments)
      .where(gt(payments.createdAt, since));

    const activeSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));

    const paymentMap = new Map<number, typeof recentPayments[0]>();
    const subPaymentMap = new Map<number, typeof recentPayments[0]>();

    for (const payment of recentPayments) {
      paymentMap.set(payment.id, payment);
    }

    for (const sub of activeSubscriptions) {
      const linked = recentPayments.find((p) => p.userId === sub.userId && p.tier === sub.tier);
      if (linked) {
        subPaymentMap.set(sub.id, linked);
      }
    }

    const matched = activeSubscriptions.filter((s) => subPaymentMap.has(s.id)).length;
    const missing = activeSubscriptions.filter((s) => !subPaymentMap.has(s.id)).length;
    const excess = recentPayments.filter((p) => !subPaymentMap.has(p.id)).length;

    const totalAmount = recentPayments.reduce((sum, p) => sum + p.amount, 0);

    logger.info('reconciliation.daily_completed', {
      correlationId,
      matched,
      missing,
      excess,
      totalAmount,
    });

    if (missing > 0) {
      logger.warn('reconciliation.missing_payments', {
        correlationId,
        missing,
      });
    }

    return {
      matched,
      missing,
      excess,
      totalAmount,
    };
  }
}

export const reconciliationService = new ReconciliationService();
