export const maxDuration = 10;

export async function GET(req) {
  const url = process.env.WORKER_WATCHDOG2_URL || 'https://osiris.orkestr.run/health';
  const ntfyTopic = process.env.NTFY_TOPIC || 'OSIRIS';

  try {
    const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      await fetch(`https://ntfy.sh/${ntfyTopic}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Title': '🛑 OSIRIS Worker Down (watchdog2)',
          'Priority': '5'
        },
        body: `Health check failed: ${response.status} ${response.statusText}\nURL: ${url}\nTime: ${new Date().toISOString()}`,
      });
      return new Response(JSON.stringify({ error: 'Worker health check failed' }), { status: 500 });
    }
    return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), { status: 200 });
  } catch (err) {
    await fetch(`https://ntfy.sh/${ntfyTopic}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'Title': '🛑 OSIRIS Worker Down (watchdog2)', 'Priority': '5' },
      body: `Worker health check error: ${err.message}\nURL: ${url}\nTime: ${new Date().toISOString()}`,
    });
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}