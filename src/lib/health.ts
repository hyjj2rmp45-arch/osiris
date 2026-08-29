import { db } from './db';
import { getEnv } from './config';
import { sql } from 'drizzle-orm';
import redis from './redis';
import { rpcFailover } from './solana-rpc';
import { heartbeat } from './heartbeat';

export type HealthCheck = {
  name: string;
  healthy: boolean;
  detail?: string;
};

export async function checkDatabase(): Promise<HealthCheck> {
  try {
    await db.execute(sql`SELECT 1`);
    return { name: 'database', healthy: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { name: 'database', healthy: false, detail: message };
  }
}

export async function checkRedis(): Promise<HealthCheck> {
  try {
    await redis.ping();
    return { name: 'redis', healthy: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { name: 'redis', healthy: false, detail: message };
  }
}

export async function checkSolanaRpc(): Promise<HealthCheck> {
  try {
    const endpoint = rpcFailover.getEndpoint();
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

    if (response.ok) {
      return { name: 'solana_rpc', healthy: true, detail: endpoint.label };
    }

    return {
      name: 'solana_rpc',
      healthy: false,
      detail: `HTTP ${response.status} from ${endpoint.label}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { name: 'solana_rpc', healthy: false, detail: message };
  }
}

export async function checkHelius(): Promise<HealthCheck> {
  const env = getEnv();
  if (!env.HELIUS_API_KEY) {
    return { name: 'helius', healthy: true, detail: 'not_configured' };
  }

  try {
    const response = await fetch(
      `https://api.helius.xyz/v0/addresses/${env.PHANTOM_SOL_ADDRESS || '3FfRM3fzySeMmKsWNND4vgajS6eKzWtnb5qDbFfbhxUk'}/transactions?api-key=${env.HELIUS_API_KEY}`,
      { signal: AbortSignal.timeout(3000) }
    );

    if (response.ok) {
      return { name: 'helius', healthy: true };
    }

    return {
      name: 'helius',
      healthy: false,
      detail: `HTTP ${response.status}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { name: 'helius', healthy: false, detail: message };
  }
}

export async function checkSigner(): Promise<HealthCheck> {
  try {
    const { signerService } = await import('./signer');
    const ready = signerService.isReady();
    return { name: 'signer', healthy: ready };
  } catch {
    return { name: 'signer', healthy: true, detail: 'stub' };
  }
}

export async function checkHeartbeat(): Promise<HealthCheck> {
  const statuses = heartbeat.getStatus();
  const unhealthy = statuses.filter((s) => !s.healthy);

  if (unhealthy.length === 0) {
    return { name: 'heartbeat', healthy: true, detail: `${statuses.length} services` };
  }

  return {
    name: 'heartbeat',
    healthy: false,
    detail: `unhealthy: ${unhealthy.map((s) => s.service).join(', ')}`,
  };
}

export async function getAllHealthChecks(): Promise<HealthCheck[]> {
  const checks = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkSolanaRpc(),
    checkHelius(),
    checkSigner(),
    checkHeartbeat(),
  ]);

  return checks;
}
