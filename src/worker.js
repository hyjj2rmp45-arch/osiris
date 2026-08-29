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
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'OSIRIS';
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS || 30000);

let lastSignature = '';

async function pollTreasury() {
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

async function sendNtfy(title, message, priority) {
  if (!NTFY_TOPIC) {
    return;
  }

  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Title': title,
        'Priority': String(priority === 'urgent' ? 5 : priority === 'high' ? 4 : 3),
      },
      body: message,
    });
  } catch (err) {
    console.error('[worker] ntfy send failed:', err);
  }
}

async function checkMonitoringHealth() {
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
  console.log('[worker] ntfy topic:', NTFY_TOPIC);

  if (!NTFY_TOPIC) {
    console.warn('[worker] NTFY_TOPIC not set; notifications disabled');
  }

  await sendNtfy('OSIRIS Worker', 'Monitor worker started', 'high');

  const interval = setInterval(async () => {
    try {
      const signature = await pollTreasury();
      if (signature) {
        console.log(`[worker] Payment detected via fallback: ${signature}`);
        await sendNtfy('Payment Detected', `Signature: ${signature}`, 'high');
      }

      const healthy = await checkMonitoringHealth();
      if (!healthy) {
        console.warn('[worker] Monitoring health check failed');
        await sendNtfy('OSIRIS Monitor', 'Health check failed', 'default');
      }
    } catch (err) {
      console.error('[worker] Monitoring error:', err);
      await sendNtfy('OSIRIS Monitor Error', String(err), 'urgent');
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