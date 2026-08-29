'use client';

import { useState, useEffect, useCallback } from 'react';

interface SSEState<T> {
  data: T | null;
  error: Event | null;
  loading: boolean;
}

/**
 * Subscribe to the OSIRIS SSE event stream (`/api/sse?type=<eventType>`).
 * Returns the latest parsed payload for the given event type.
 */
export function useSSE<T = any>(eventType: string) {
  const [state, setState] = useState<SSEState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    // Server-Sent Events are only available in the browser.
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    const source = new EventSource(`/api/sse?type=${encodeURIComponent(eventType)}`);
    let disposed = false;

    const handleMessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as T;
        if (!disposed) {
          setState({ data: parsed, error: null, loading: false });
        }
      } catch {
        if (!disposed) {
          setState({ data: null, error: null, loading: false });
        }
      }
    };

    const handleError = (err: Event) => {
      if (!disposed) {
        setState({ data: null, error: err, loading: false });
      }
      // EventSource auto-reconnects; we leave the connection open.
    };

    source.addEventListener('message', handleMessage);
    source.addEventListener('error', handleError);

    return () => {
      disposed = true;
      source.removeEventListener('message', handleMessage);
      source.removeEventListener('error', handleError);
      source.close();
    };
  }, [eventType]);

  return state;
}

/** Convenience wrapper around useSSE for typed event payloads. */
export function useSSEType<T>(eventType: string) {
  return useSSE<T>(eventType);
}