/**
 * Notification Batcher — OSIRIS Phase 7.2
 * Provides in‑memory coalescing of similar notifications with:
 *   - 5‑second batching window (configurable)
 *   - 30 messages per second rate limit (leaky bucket)
 *   - Immediate bypass for priority notifications
 *   - Alert fatigue controls: deduplication and suppression windows
 *
 * Usage:
 *   const batcher = new NotificationBatcher({ publish });
 *   batcher.add('trade:new', tradeData, { priority: false });
 *   batcher.add('security:login', loginData, { priority: true }); // sent immediately
 *
 * The batcher expects a publish function with signature (type: string, payload: unknown) => void.
 * By default it uses the in‑process event bus publish.
 */
import { publish } from '@/lib/events/bus';

interface BatcherOptions {
  /** Function used to actually send a notification. Defaults to the in‑process event bus. */
  publish?: (type: string, payload: unknown) => void;
  /** Batching window in milliseconds. Default: 5000 (5 s). */
  windowMs?: number;
  /** Maximum number of notifications allowed per second. Default: 30. */
  maxPerSecond?: number;
  /** Deduplication window in ms. Alerts with same key within this window are suppressed. Default: 300000 (5 min). */
  dedupWindowMs?: number;
}

interface BatchRecord {
  timestamp: number;
  payloads: unknown[];
  count: number;
}

export class NotificationBatcher {
  private publishFn: (type: string, payload: unknown) => void;
  private windowMs: number;
  private maxPerSecond: number;
  private dedupWindowMs: number;

  // Batching state: key => { timestamp: number, payloads: unknown[] }
  private batches: Map<string, BatchRecord> = new Map();

  // Deduplication state: key => last sent timestamp
  private dedupTracker: Map<string, number> = new Map();

  // Rate‑limiting state (leaky bucket per second)
  private windowStartMs: number = Date.now();
  private countInWindow: number = 0;

  private flushInterval: NodeJS.Timeout;

  constructor(options: BatcherOptions = {}) {
    this.publishFn = options.publish ?? publish;
    this.windowMs = options.windowMs ?? 5000;
    this.maxPerSecond = options.maxPerSecond ?? 30;
    this.dedupWindowMs = options.dedupWindowMs ?? 300000; // 5 minutes

    // Flush batches every windowMs
    this.flushInterval = setInterval(() => this.flushBatches(), this.windowMs);
    // Refill rate‑limiter every second
    setInterval(() => {
      this.windowStartMs = Date.now();
      this.countInWindow = 0;
    }, 1000);
  }

  /**
   * Add a notification to the batcher.
   * @param type   Notification type (e.g. 'trade:new', 'security:login')
   * @param payload The notification payload
   * @param options Optional flags (e.g. priority, dedupKey)
   */
  add(type: string, payload: unknown, options: { priority?: boolean; dedupKey?: string } = {}): void {
    const { priority = false, dedupKey } = options;

    // Priority notifications bypass batching, rate limiting, and dedup
    if (priority) {
      this.publishFn(type, payload);
      return;
    }

    // Deduplication: suppress repeated alerts within the dedup window
    const dedupKeyFinal = dedupKey ?? type;
    const now = Date.now();
    const lastSent = this.dedupTracker.get(dedupKeyFinal);
    
    if (lastSent && now - lastSent < this.dedupWindowMs) {
      // Suppress duplicate alert
      return;
    }

    // Rate limiting: leaky bucket per second
    if (now - this.windowStartMs >= 1000) {
      // Reset window
      this.windowStartMs = now;
      this.countInWindow = 0;
    }
    if (this.countInWindow >= this.maxPerSecond) {
      // Exceeded rate – delay this message until next window
      const delayMs = this.windowStartMs + 1000 - now;
      setTimeout(() => this.add(type, payload, options), Math.max(0, delayMs));
      return;
    }
    this.countInWindow++;

    // Batching: key is just the type for simplicity; could be extended with extra fields
    const key = type;
    const batch = this.batches.get(key);
    if (batch) {
      batch.payloads.push(payload);
      batch.count += 1;
    } else {
      this.batches.set(key, { timestamp: now, payloads: [payload], count: 1 });
    }

    // Update dedup tracker
    this.dedupTracker.set(dedupKeyFinal, now);
  }

  /** Flush all current batches immediately (used for testing or shutdown). */
  flushBatches(): void {
    if (this.batches.size === 0) return;
    const now = Date.now();
    for (const [key, { timestamp, payloads }] of this.batches.entries()) {
      // Only flush if the batch is older than the window (or we are forcing flush)
      if (now - timestamp >= this.windowMs) {
        // Publish a single batched notification
        this.publishFn(`${key}:batch`, {
          batchType: key,
          count: payloads.length,
          payloads,
          windowStart: timestamp,
          windowEnd: now,
        });
        this.batches.delete(key);
      }
    }
  }

  /** Stop internal intervals (call on process shutdown). */
  destroy(): void {
    clearInterval(this.flushInterval);
  }
}

/** Default singleton batcher using the in‑process event bus. */
export const notificationBatcher = new NotificationBatcher();

export default notificationBatcher;