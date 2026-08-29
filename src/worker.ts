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

import { startContinuousMonitoring, checkMonitoringHealth, DEFAULT_CONFIG } from './payment-monitoring';
import { sendAdminAlert } from './notifications';

async function main() {
  console.log('[worker] Starting OSIRIS monitor worker...');

  const interval = startContinuousMonitoring(
    async (signature) => {
      console.log(`[worker] Payment detected via fallback: ${signature}`);
      try {
        await sendAdminAlert(`Payment detected via fallback monitor: ${signature}`);
      } catch (err) {
        console.error('[worker] Notification dispatch failed:', err);
      }
    },
    DEFAULT_CONFIG.pollingIntervalMs
  );

  setInterval(async () => {
    try {
      const health = await checkMonitoringHealth();
      console.log('[worker] Monitoring health:', JSON.stringify(health));
    } catch (err) {
      console.error('[worker] Health check failed:', err);
    }
  }, 5 * 60 * 1000);

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
