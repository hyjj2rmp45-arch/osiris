export default async function handler(req, res) {
  const url = process.env.WORKER_WATCHDOG_URL || 'https://osiris.orkestr.run/health';
  const ntfyTopic = process.env.NTFY_TOPIC || 'OSIRIS';

  try {
    const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      await fetch(`https://ntfy.sh/${ntfyTopic}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', 'Title': '🛑 OSIRIS Worker Down', 'Priority': '5' },
        body: `Worker health check failed: ${response.status} ${response.statusText}\nURL: ${url}\nTime: ${new Date().toISOString()}`,
      });
      return res.status(500).json({ error: 'Worker health check failed' });
    }
    return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    await fetch(`https://ntfy.sh/${ntfyTopic}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'Title': '🛑 OSIRIS Worker Down', 'Priority': '5' },
      body: `Worker health check error: ${err.message}\nURL: ${url}\nTime: ${new Date().toISOString()}`,
    });
    return res.status(500).json({ error: err.message });
  }
}
