/**
 * OSIRIS Always-On Monitor Worker
 *
 * Purpose: keep fallback payment detection and notification dispatch alive
 * on an always-on host like Waifly.
 *
 * This worker intentionally does NOT run the Telegram bot polling loop.
 * The Telegram bot uses webhooks via Vercel (`/api/telegram/webhook`) so it
 * does not need a separate 24/7 polling process.
 *
 * NOTE: orkestr.eu deploy watchdog expects an HTTP listener to be running.
 * This worker starts a minimal HTTP server on the PORT env var (defaults to
 * 3000) just to pass the health check, then continues its polling loop.
 */

const http = require('http');
const TREASURY_ADDRESS = process.env.PHANTOM_SOL_ADDRESS || '3FfRM3fzySeMmKsWNND4vgajS6eKzWtnb5qDbFfbhxUk';
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'OSIRIS';
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS || 30000);
const HTTP_PORT = Number(process.env.PORT || process.env.WORKER_HTTP_PORT || 3000);
const SELF_HEALTH_CHECK_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

let lastSignature = '';
let lastSelfHealthAlert = 0;

// ── HTTP server for orkestr.eu health check ──────────────────────────────────

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`[worker] HTTP health listener on 0.0.0.0:${HTTP_PORT}`);
});

// ── Solana polling ─────────────────────────────────────────────────────────────

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

// ── Notifications ──────────────────────────────────────────────────────────────

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

// ── Health check ─────────────────────────────────────────────────────────────

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

// ── Self health check ────────────────────────────────────────────────────────

async function checkSelfHealth() {
  try {
    const response = await fetch(`http://localhost:${HTTP_PORT}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (err) {
    console.error('[worker] Self health check error:', err);
    return false;
  }
}

// ── Main loop ────────────────────────────────────────────────────────────────

async function main() {
  console.log('[worker] Starting OSIRIS monitor worker...');
  console.log('[worker] Treasury:', TREASURY_ADDRESS);
  console.log('[worker] Poll interval:', POLL_INTERVAL_MS, 'ms');
  console.log('[worker] ntfy topic:', NTFY_TOPIC);
  console.log('[worker] HTTP health port:', HTTP_PORT);

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

      // Self health check
      const selfHealthy = await checkSelfHealth();
      if (!selfHealthy) {
        const now = Date.now();
        if (now - lastSelfHealthAlert > SELF_HEALTH_CHECK_COOLDOWN_MS) {
          console.warn('[worker] Self health check failed');
          await sendNtfy('OSIRIS Self Health Check Failed', `Worker at localhost:${HTTP_PORT} is not responding`, 'high');
          lastSelfHealthAlert = now;
        }
      }
    } catch (err) {
      console.error('[worker] Monitoring error:', err);
      await sendNtfy('OSIRIS Monitor Error', String(err), 'urgent');
    }
  }, POLL_INTERVAL_MS);

  process.on('SIGINT', () => {
    console.log('[worker] Shutting down...');
    clearInterval(interval);
    server.close(() => {
      console.log('[worker] HTTP server closed');
      process.exit(0);
    });
  });

  console.log('[worker] Monitor worker running');
}

main().catch((err) => {
  console.error('[worker] Fatal error:', err);
  process.exit(1);
});