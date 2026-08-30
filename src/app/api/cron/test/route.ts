export const maxDuration = 10;

export async function GET() {
  return new Response(JSON.stringify({ ok: true, route: 'api/cron/test', rerun: Date.now() }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
