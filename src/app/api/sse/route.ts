import { NextRequest, NextResponse } from 'next/server';
import { eventBus } from '@/lib/events/bus';
import { postNtfy } from '@/lib/ntfy';
import { extractRequestContext } from '@/lib/request-context';
import { getAuthenticatedUser } from '@/lib/route-auth';
import { z } from 'zod';

const sseQuerySchema = z.object({
  types: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const ctx = extractRequestContext(request);
  try {
    const url = new URL(request.url);
    const query = sseQuerySchema.parse({
      types: url.searchParams.get('types'),
    });

    const requestedTypes = (query.types || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const activeTypes = requestedTypes.length > 0 ? requestedTypes : ['*'];

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
          } catch {
            clearInterval(keepAlive);
          }
        }, 15_000);

        controller.enqueue(encoder.encode(`retry: 3000\n\n`));

        const unsubscribe = eventBus.subscribe(activeTypes, (evt) => {
          const out = `event: ${evt.type}\ndata: ${JSON.stringify(evt)}\n\n`;
          try {
            controller.enqueue(encoder.encode(out));
          } catch {
            clearInterval(keepAlive);
            unsubscribe();
          }
        });

        (request as unknown as Request & { signal?: AbortSignal }).signal?.addEventListener?.(
          'abort',
          () => {
            clearInterval(keepAlive);
            unsubscribe();
            controller.close();
          }
        );
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await postNtfy('OSIRIS Error', `SSE error: ${message}`, 'error,sse', ctx);
    throw error;
  }
}