/**
 * SSE dashboard client — browser-side EventSource wrapper for OSIRIS.
 * Auto-reconnects with exponential backoff and routes named events to handlers.
 *
 * Usage:
 *   const client = createRealtimeClient({ types: ['trade:*', 'session:*'] });
 *   client.on('trade:new', (payload) => { ... });
 *   client.open();
 */

export interface RealtimeEvent {
  type: string;
  payload: unknown;
  timestamp: number;
}

type Handler = (payload: unknown, event: RealtimeEvent) => void;

export interface RealtimeClientOptions {
  url?: string; // default '/api/sse'
  types?: string[];
  onStatusChange?: (status: 'connecting' | 'open' | 'closed' | 'reconnecting') => void;
}

export function createRealtimeClient(opts: RealtimeClientOptions = {}) {
  const types = opts.types ?? ['trade:*', 'session:*'];
  const typesQuery = encodeURIComponent(types.join(','));
  const url = `${opts.url ?? '/api/sse'}?types=${typesQuery}`;

  const handlers = new Map<string, Set<Handler>>();
  let es: EventSource | null = null;
  let closedByUser = false;
  let retry = 3000;
  const MAX_RETRY = 30_000;

  function dispatch(name: string, event: Event) {
    const data = (event as MessageEvent<string>).data;
    try {
      const parsed: RealtimeEvent = JSON.parse(data);
      handlers.get(parsed.type)?.forEach((h) => h(parsed.payload, parsed));
      // allow wildcard match on event type suffix
      handlers.get('*')?.forEach((h) => h(parsed.payload, parsed));
    } catch {
      // ignore keep-alive / malformed frames
    }
  }

  const client = {
    on(type: string, handler: Handler) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type)!.add(handler);
      return client;
    },
    off(type: string, handler: Handler) {
      handlers.get(type)?.delete(handler);
      return client;
    },
    open() {
      closedByUser = false;
      opts.onStatusChange?.('connecting');
      es = new EventSource(url);

      // Named SSE events arrive as `event: X` frames -> es.addEventListener(X)
      // Our server emits `event:` matching type; generic `message` fallback below.
      es.addEventListener('trade:new', (e) => dispatch('trade:new', e));
      es.addEventListener('trade:failed', (e) => dispatch('trade:failed', e));
      es.addEventListener('session:started', (e) => dispatch('session:started', e));
      es.addEventListener('session:paused', (e) => dispatch('session:paused', e));
      es.addEventListener('session:resumed', (e) => dispatch('session:resumed', e));
      es.addEventListener('session:revoked', (e) => dispatch('session:revoked', e));
      es.onmessage = (e) => dispatch('message', e);

      es.onopen = () => {
        retry = 3000; // reset backoff
        opts.onStatusChange?.('open');
      };

      es.onerror = () => {
        opts.onStatusChange?.('reconnecting');
        if (!closedByUser) {
          es?.close();
          setTimeout(() => {
            retry = Math.min(retry * 2, MAX_RETRY);
            client.open();
          }, retry);
        } else {
          opts.onStatusChange?.('closed');
        }
      };
      return client;
    },
    close() {
      closedByUser = true;
      es?.close();
      es = null;
      opts.onStatusChange?.('closed');
      return client;
    },
  };

  return client;
}