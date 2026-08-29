import { logger } from '@/lib/logger';
import { getEnv } from '@/lib/config';
import { Connection } from '@solana/web3.js';

const env = getEnv();

export interface RpcEndpoint {
  url: string;
  label: string;
  healthy: boolean;
  latencyMs: number;
  failures: number;
  lastChecked: number;
}

const MAX_FAILURES = 3;
const CHECK_INTERVAL_MS = 30_000;
const STALE_THRESHOLD_MS = 2 * 60_000;

class SolanaRpcFailover {
  private readonly endpoints: RpcEndpoint[] = [];
  private currentIndex = 0;
  private checkTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.buildEndpoints();
  }

  private buildEndpoints(): void {
    const primary = env.SOLANA_RPC_URL;
    const fallbacks = [
      { url: 'https://api.mainnet-beta.solana.com', label: 'public-mainnet' },
      { url: 'https://solana-api.projectserum.com', label: 'serum' },
    ];

    const candidates = primary ? [{ url: primary, label: 'primary' }, ...fallbacks] : fallbacks;

    for (const candidate of candidates) {
      this.endpoints.push({
        url: candidate.url,
        label: candidate.label,
        healthy: true,
        latencyMs: 0,
        failures: 0,
        lastChecked: 0,
      });
    }
  }

  start(): void {
    if (this.checkTimer) return;
    this.checkTimer = setInterval(() => this.checkAll(), CHECK_INTERVAL_MS);
    this.checkAll();
  }

  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  getEndpoint(): RpcEndpoint {
    const now = Date.now();
    const fresh = this.endpoints.filter(
      (ep) =>
        ep.healthy &&
        now - ep.lastChecked < STALE_THRESHOLD_MS
    );

    const pool = fresh.length > 0 ? fresh : this.endpoints;
    const endpoint = pool[this.currentIndex % pool.length];
    this.currentIndex = (this.currentIndex + 1) % pool.length;
    return endpoint!;
  }

  getConnection(): Connection {
    const endpoint = this.getEndpoint();
    if (!endpoint) {
      throw new Error('No healthy RPC endpoints available');
    }
    return new Connection(endpoint.url, 'confirmed');
  }

  recordFailure(endpoint: RpcEndpoint): void {
    endpoint.failures += 1;
    if (endpoint.failures >= MAX_FAILURES) {
      endpoint.healthy = false;
      logger.warn('rpc.endpoint_marked_unhealthy', {
        url: endpoint.url,
        label: endpoint.label,
        failures: endpoint.failures,
      });
    }
  }

  recordSuccess(endpoint: RpcEndpoint, latencyMs: number): void {
    endpoint.latencyMs = latencyMs;
    endpoint.lastChecked = Date.now();
    endpoint.failures = Math.max(0, endpoint.failures - 1);
    if (!endpoint.healthy && endpoint.failures === 0) {
      endpoint.healthy = true;
      logger.info('rpc.endpoint_recovered', {
        url: endpoint.url,
        label: endpoint.label,
      });
    }
  }

  private async checkAll(): Promise<void> {
    const checks = this.endpoints.map((ep) => this.ping(ep));
    await Promise.allSettled(checks);
  }

  async runCheckAll(): Promise<void> {
    await this.checkAll();
  }

  private async ping(endpoint: RpcEndpoint): Promise<void> {
    const start = Date.now();
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth',
          params: [],
        }),
        signal: AbortSignal.timeout(3000),
      });

      const latencyMs = Date.now() - start;
      if (response.ok) {
        this.recordSuccess(endpoint, latencyMs);
      } else {
        this.recordFailure(endpoint);
      }
    } catch {
      this.recordFailure(endpoint);
    }
  }
}

export const rpcFailover = new SolanaRpcFailover();
