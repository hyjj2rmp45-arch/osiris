import { db } from '@/lib/db';
import { subscriptions } from '@/lib/schema';
import { eq, and, lt } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { postNtfy } from '@/lib/ntfy';
import { createCorrelationId } from '@/lib/safety-manager';

const DUNNING_WINDOW_DAYS = 7;
const MAX_DUNNING_STEPS = 3;

type DunningStep = 'warning' | 'suspension' | 'final_notice';

interface DunningState {
  step: DunningStep;
  retryCount: number;
  lastNotifiedAt: Date;
  suspendedAt?: Date;
}

export class DunningService {
  async processExpiredSubscriptions(): Promise<void> {
    const now = new Date();
    const expired = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          lt(subscriptions.currentPeriodEnd, now),
          eq(subscriptions.status, 'active')
        )
      );

    for (const sub of expired) {
      await this.runDunningFlow(sub);
    }
  }

  private async runDunningFlow(sub: typeof subscriptions.$inferSelect): Promise<void> {
    if (!sub.currentPeriodEnd) {
      return;
    }

    const correlationId = createCorrelationId();
    const daysExpired = Math.floor(
      (Date.now() - new Date(sub.currentPeriodEnd).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysExpired > DUNNING_WINDOW_DAYS) {
      await this.suspendSubscription(sub.id);
      await this.notify(sub, 'final_notice', correlationId);
      return;
    }

    if (daysExpired >= 3) {
      await db.update(subscriptions)
        .set({ status: 'suspended' as any })
        .where(eq(subscriptions.id, sub.id));
      await this.notify(sub, 'suspension', correlationId);
      return;
    }

    await this.notify(sub, 'warning', correlationId);
  }

  private async suspendSubscription(subscriptionId: number): Promise<void> {
    await db.update(subscriptions)
      .set({ status: 'cancelled' as any })
      .where(eq(subscriptions.id, subscriptionId));
  }

  private async notify(
    sub: typeof subscriptions.$inferSelect,
    step: DunningStep,
    correlationId: string,
  ): Promise<void> {
    const messages: Record<DunningStep, string> = {
      warning: 'Subscription expired. Renew to restore access.',
      suspension: 'Subscription suspended for non-payment.',
      final_notice: 'Subscription terminated after grace period.',
    };

    const title = `OSIRIS ${step.replace('_', ' ')}`;
    const message = messages[step];

    await postNtfy(title, `${message}\ncorrelationId: ${correlationId}`, 'subscription,dunning');
    logger.info('dunning.notification_sent', {
      subscriptionId: sub.id,
      step,
      correlationId,
    });
  }
}

export const dunningService = new DunningService();
