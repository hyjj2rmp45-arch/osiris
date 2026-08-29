/**
 * OSIRIS Always-On Monitor Worker
 *
 * Purpose: keep fallback payment detection and notification dispatch alive
 * on an always-on host like Waifly.
 *
 * This worker intentionally does NOT run the Telegram bot polling loop.
 * The Telegram bot uses webhooks via Vercel (`/api/telegram/webhook`) so it
 * does not need a separate 24/7 polling process.
 */

const TREASURY_ADDRESS = process.env.PHANTOM_SOL_ADDRESS || '3FfRM3fzySeMmKsWNND4vgajS6eKzWtnb5qDbFfbhxUk';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID || '';
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS || 30000);

let lastSignature = '';

async function pollTreasury(): Promise<string | null> {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [TREASURY_ADDRESS, { limit: 5 }],
      }),
    });

    if (!response.ok) {
      console.error('[worker] RPC error:', response.status);
      return null;
    }

    const data = await response.json();
    const signatures = data.result || [];
    if (!signatures.length) {
      return null;
    }

    const newest = signatures[0];
    if (newest.signature === lastSignature) {
      return null;
    }

    lastSignature = newest.signature;
    return newest.signature;
  } catch (err) {
    console.error('[worker] Poll failed:', err);
    return null;
  }
}

async function sendTelegram(chatId: string, text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    console.error('[worker] Telegram send failed:', err);
  }
}

async function checkMonitoringHealth(): Promise<boolean> {
  try {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSlot', params: [] }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return typeof data.result === 'number' && data.result > 0;
  } catch {
    return false;
  }
}

async function main() {
  console.log('[worker] Starting OSIRIS monitor worker...');
  console.log('[worker] Treasury:', TREASURY_ADDRESS);
  console.log('[worker] Poll interval:', POLL_INTERVAL_MS, 'ms');

  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[worker] TELEGRAM_BOT_TOKEN not set; notifications disabled');
  }
  if (!TELEGRAM_ADMIN_ID) {
    console.warn('[worker] TELEGRAM_ADMIN_ID not set; admin notifications disabled');
  }

  const interval = setInterval(async () => {
    try {
      const signature = await pollTreasury();
      if (signature) {
        console.log(`[worker] Payment detected via fallback: ${signature}`);
        await sendTelegram(TELEGRAM_ADMIN_ID, `Payment detected via fallback monitor: ${signature}`);
      }

      const healthy = await checkMonitoringHealth();
      if (!healthy) {
        console.warn('[worker] Monitoring health check failed');
      }
    } catch (err) {
      console.error('[worker] Monitoring error:', err);
    }
  }, POLL_INTERVAL_MS);

  process.on('SIGINT', () => {
    console.log('[worker] Shutting down...');
    clearInterval(interval);
    process.exit(0);
  });

  console.log('[worker] Monitor worker running');
}

main().catch((err) => {
  console.error('[worker] Fatal error:', err);
  process.exit(1);
});
