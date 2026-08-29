import { Bot } from 'grammy';
import { sendSms } from '@/lib/smsProvider';
import { postNtfy } from '@/lib/ntfy';

// Lazy bot initialization to allow .env loading first
let bot: Bot | null = null;

function getBot(): Bot {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN not set in environment');
    }
    bot = new Bot(token);
    setupBotHandlers(bot);
  }
  return bot;
}

function setupBotHandlers(bot: Bot) {
  // In-memory admin user IDs
  let adminUserIds: number[] = [];

  /**
   * /start command handler
   * Replies with a welcome message and logs the update source.
   * If user is admin, confirms admin status.
   */
  bot.command('start', (ctx) => {
    const user = ctx.message?.from;
    if (!user) return;

    const username = user.username ?? 'unknown_user';
    const userId = user.id;

    const isAdmin = adminUserIds.includes(userId);
    const adminStatus = isAdmin ? ' (Admin)' : '';

    ctx.reply(`Welcome, @${username}!${adminStatus}`);
    console.log(`[Telegram] /start initiated by @${username} (id: ${userId})${adminStatus}`);
  });

  /**
   * /admin command — register current user as admin alert recipient
   * Only works in private chat for security
   */
  bot.command('admin', (ctx) => {
    const user = ctx.message?.from;
    if (!user) return;

    const chat = ctx.message?.chat;
    if (chat?.type !== 'private') {
      ctx.reply('Admin registration only works in private chat.');
      return;
    }

    const userId = user.id;
    const username = user.username ?? 'unknown_user';

    if (adminUserIds.includes(userId)) {
      ctx.reply(`You are already registered as admin, @${username}.`);
      return;
    }

    adminUserIds.push(userId);
    ctx.reply(`Admin alerts enabled for @${username} (id: ${userId}).\nYou will receive critical system notifications.`);
    console.log(`[Telegram] Admin registered: @${username} (id: ${userId})`);
  });

  /**
   * /unadmin command — remove admin status
   */
  bot.command('unadmin', (ctx) => {
    const user = ctx.message?.from;
    if (!user) return;

    const userId = user.id;
    const username = user.username ?? 'unknown_user';

    if (!adminUserIds.includes(userId)) {
      ctx.reply(`You are not an admin, @${username}.`);
      return;
    }

    adminUserIds = adminUserIds.filter(id => id !== userId);
    ctx.reply(`Admin alerts disabled for @${username}.`);
    console.log(`[Telegram] Admin removed: @${username} (id: ${userId})`);
  });

  /**
   * /status command — show bot and admin status
   */
  bot.command('status', (ctx) => {
    const user = ctx.message?.from;
    if (!user) return;

    const userId = user.id;
    const username = user.username ?? 'unknown_user';
    const isAdmin = adminUserIds.includes(userId);

    ctx.reply(
      `OSIRIS Bot Status\n\n` +
      `You: @${username} (id: ${userId})\n` +
      `Admin: ${isAdmin ? 'Yes' : 'No'}\n` +
      `Admin recipients: ${adminUserIds.length}\n` +
      `${new Date().toISOString()}`,
      { parse_mode: 'HTML' }
    );
  });
}

/**
 * Helper to start the bot (for server.js entry point)
 */
export async function startTelegramBot() {
  try {
    const b = getBot();
    await b.start();
    await postNtfy('OSIRIS Info', `OSIRIS Telegram bot started successfully`, 'info,system');
    console.log('[Telegram] Bot started successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await postNtfy('OSIRIS Error', `Telegram config error: ${message}`, 'error,telegram');
    console.error('[Telegram] Failed to start bot:', err);
  }
}

/**
 * Export the bot instance for webhook integration
 */
export const telegramBot = {
  get api() {
    return getBot().api;
  },
  handleUpdate(update: any) {
    return getBot().handleUpdate(update);
  },
};
