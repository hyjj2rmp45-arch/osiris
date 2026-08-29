/**
 * In-process event bus for OSIRIS real-time events.
 * SSE endpoints subscribe here; business logic (trade flow, session machine)
 * publishes here. Note: in-memory, so for multi-instance horizontal scaling
 * this should be swapped for Redis pub/sub (see events/redis-bus note).
 */

type Listener = (event: BusEvent) => void;

export interface BusEvent {
  type: string;
  payload: unknown;
  timestamp: number;
}

class EventBus {
  private listeners = new Map<string, Set<Listener>>();

  subscribe(types: string[], listener: Listener): () => void {
    for (const type of types) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type)!.add(listener);
    }
    return () => {
      for (const type of types) {
        this.listeners.get(type)?.delete(listener);
      }
    };
  }

  publish(type: string, payload: unknown): void {
    const event: BusEvent = { type, payload, timestamp: Date.now() };
    this.listeners.get(type)?.forEach((l) => {
      try {
        l(event);
      } catch (err) {
        console.error('[events] listener error:', err);
      }
    });
  }
}

export const eventBus = new EventBus();

// Convenience exporters
export const publish = eventBus.publish.bind(eventBus);
export const subscribe = eventBus.subscribe.bind(eventBus);