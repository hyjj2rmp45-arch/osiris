import { logger } from '@/lib/logger';
import { getEnv } from '@/lib/config';

const env = getEnv();

export interface HeartbeatStatus {
  service: string;
  lastBeat: number;
  healthy: boolean;
  metadata: Record<string, unknown>;
}

class HeartbeatEmitter {
  private readonly beats = new Map<string, HeartbeatStatus>();
  private readonly interval = 60_000;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.seedCoreServices();
  }

  private seedCoreServices(): void {
    const services = [
      'database',
      'redis',
      'solana-rpc',
      'helius-webhook',
      'telegram-bot',
      'payment-verify',
      'safety-manager',
    ];

    for (const service of services) {
      this.beats.set(service, {
        service,
        lastBeat: 0,
        healthy: false,
        metadata: {},
      });
    }
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      const now = Date.now();
      for (const [service, status] of this.beats.entries()) {
        if (now - status.lastBeat > this.interval * 2) {
          status.healthy = false;
          logger.warn('heartbeat.missed', { service });
        }
      }
    }, this.interval);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  beat(service: string, healthy: boolean, metadata?: Record<string, unknown>): void {
    const status: HeartbeatStatus = {
      service,
      lastBeat: Date.now(),
      healthy,
      metadata: metadata || {},
    };

    this.beats.set(service, status);
    logger.info('heartbeat', status);
  }

  getStatus(): HeartbeatStatus[] {
    return Array.from(this.beats.values()).sort((a, b) =>
      a.service.localeCompare(b.service)
    );
  }
}

export const heartbeat = new HeartbeatEmitter();
