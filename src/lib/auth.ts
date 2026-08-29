/**
 * OSIRIS auth configuration.
 *
 * Per master plan: Telegram Mini App initData verification using HMAC-SHA256
 * with key = HMAC_SHA256("WebAppData", bot_token). We do NOT use a generic
 * auth framework — we validate initData directly per Telegram docs.
 */
import { users, sessions } from '@/lib/schema';
import { db } from '@/lib/db';
import { eq, and, gt } from 'drizzle-orm';

export interface OsirisSession {
  userId: number;
  telegramId: number;
  role: 'user' | 'tester' | 'admin' | 'support';
  tier: 'monthly' | 'lifetime';
  currentPeriodEnd: Date | null;
  autoRenew: boolean;
}

export async function createSessionForUser(
  telegramId: number,
  firstName: string,
  lastName?: string,
  username?: string,
): Promise<{ sessionId: string; user: OsirisSession }> {
  // Ensure user record exists
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, String(telegramId)))
    .limit(1);

  let userRow;
  if (existing.length === 0) {
    const inserted = await db
      .insert(users)
      .values({
        telegramId: String(telegramId),
        firstName: firstName || '',
        lastName: lastName || null,
        username: username || null,
        role: 'user' as const,
        tier: 'monthly',
        autoRenew: false,
      })
      .returning();
    userRow = inserted[0];
  } else {
    userRow = existing[0];
  }

  if (!userRow) {
    throw new Error('Failed to create or find user');
  }

  return {
    sessionId: '', // will be set by caller
    user: {
      userId: userRow.id,
      telegramId,
      role: userRow.role as OsirisSession['role'],
      tier: userRow.tier as 'monthly' | 'lifetime',
      currentPeriodEnd: userRow.currentPeriodEnd,
      autoRenew: userRow.autoRenew,
    },
  };
}
