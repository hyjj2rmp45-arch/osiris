import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tradeIntents } from '@/lib/schema';
import { type TradeIntent, canTransition, type TradeIntentStatus } from '@/lib/trade-intent-state-machine';
import { AdminAlerts } from '@/lib/admin-alerts';

export class TradeIntentService {
  async getById(id: number, userId: number): Promise<TradeIntent | null> {
    const [intent] = await db
      .select()
      .from(tradeIntents)
      .where(and(eq(tradeIntents.id, id), eq(tradeIntents.userId, userId)));
    return intent ? (intent as unknown as TradeIntent) : null;
  }

  async updateStatus(
    id: number,
    userId: number,
    newStatus: TradeIntentStatus,
    metadata: Record<string, unknown> = {}
  ): Promise<{ success: boolean; intent?: TradeIntent; error?: string }> {
    const intent = await this.getById(id, userId);
    if (!intent) {
      return { success: false, error: 'Trade intent not found' };
    }

    if (!canTransition(intent.status, newStatus)) {
      return {
        success: false,
        error: `Invalid transition from ${intent.status} to ${newStatus}`,
      };
    }

    // Only require signature for confirmed state
    if (newStatus === 'confirmed' && !intent.txSignature && !metadata.signature) {
      return { success: false, error: 'Confirmed state requires transaction signature' };
    }

    const [updated] = await db
      .update(tradeIntents)
      .set({
        status: newStatus,
        updatedAt: new Date(),
        ...(metadata.error ? { error: metadata.error as string } : {}),
        ...(metadata.signature ? { txSignature: metadata.signature as string } : {}),
      })
      .where(and(eq(tradeIntents.id, id), eq(tradeIntents.userId, userId)))
      .returning();

    // Emit event for state machine
    if (newStatus === 'failed') {
      AdminAlerts.system.configError('trade', `Trade failed: ${metadata.error}`);
    }

    return { success: true, intent: updated as unknown as TradeIntent };
  }

  async listByUser(
    userId: number,
    options: { status?: TradeIntentStatus; limit?: number } = {}
  ): Promise<TradeIntent[]> {
    const limit = Math.min(options.limit || 50, 200);

    if (options.status) {
      const intents = await db
        .select()
        .from(tradeIntents)
        .where(
          and(
            eq(tradeIntents.userId, userId),
            eq(tradeIntents.status, options.status)
          )
        )
        .limit(limit);
      return intents as unknown as TradeIntent[];
    }

    const intents = await db
      .select()
      .from(tradeIntents)
      .where(eq(tradeIntents.userId, userId))
      .limit(limit);

    return intents as unknown as TradeIntent[];
  }

  async cancel(id: number, userId: number): Promise<{ success: boolean; error?: string }> {
    const intent = await this.getById(id, userId);
    if (!intent) {
      return { success: false, error: 'Trade intent not found' };
    }

    if (!canTransition(intent.status, 'canceled')) {
      return { success: false, error: `Cannot cancel from status: ${intent.status}` };
    }

    await db
      .update(tradeIntents)
      .set({ status: 'canceled', updatedAt: new Date() })
      .where(and(eq(tradeIntents.id, id), eq(tradeIntents.userId, userId)));

    return { success: true };
  }
}

export const tradeIntentService = new TradeIntentService();
