/**
 * OSIRIS Payment Monitoring - Fallback monitoring services
 * Provides multiple layers of payment detection with fallback options
 */
import { Connection, PublicKey } from '@solana/web3.js';
import { rpcFailover } from './solana-rpc';

const TREASURY_ADDRESS = process.env.PHANTOM_SOL_ADDRESS || '3FfRM3fzySeMmKsWNND4vgajS6eKzWtnb5qDbFfbhxUk';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

/**
 * Monitoring Service Configuration
 */
export interface MonitoringConfig {
  heliusEnabled: boolean;
  heliusApiKey?: string | undefined;
  heliusWebhookUrl?: string | undefined;
  fallbackPollingEnabled: boolean;
  pollingIntervalMs: number;
  maxPollAttempts: number;
  solscanEnabled: boolean;
  solscanApiKey?: string | undefined;
  alchemyEnabled: boolean;
  alchemyApiKey?: string | undefined;
  quickNodeEnabled: boolean;
  quickNodeApiKey?: string | undefined;
}

const DEFAULT_CONFIG: MonitoringConfig = {
  heliusEnabled: true,
  heliusApiKey: process.env.HELIUS_API_KEY,
  heliusWebhookUrl: process.env.HELIUS_WEBHOOK_URL,
  fallbackPollingEnabled: true,
  pollingIntervalMs: 30000,
  maxPollAttempts: 60,
  solscanEnabled: true,
  solscanApiKey: process.env.SOLSCAN_API_KEY,
  alchemyEnabled: true,
  alchemyApiKey: process.env.ALCHEMY_API_KEY,
  quickNodeEnabled: true,
  quickNodeApiKey: process.env.QUICKNODE_API_KEY,
};

/**
 * Poll for transactions to treasury wallet using Solana RPC
 */
export async function pollTreasuryTransactions(
  config: MonitoringConfig = DEFAULT_CONFIG,
  sinceSlot?: number
): Promise<any[]> {
  try {
    const connection = rpcFailover.getConnection();
    const recipient = new PublicKey(TREASURY_ADDRESS);

    const signatures = await connection.getSignaturesForAddress(recipient, {
      limit: 50,
    });

    return signatures.map(sig => ({
      signature: sig.signature,
      slot: sig.slot,
      blockTime: sig.blockTime,
    }));
  } catch (err) {
    console.error('[pollTreasury] Failed:', err);
    return [];
  }
}

/**
 * Check if a signature has been confirmed
 */
export async function checkSignatureConfirmation(signature: string): Promise<boolean> {
  try {
    const connection = rpcFailover.getConnection();
    const tx = await connection.getTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0,
    });
    return !!tx && !tx.meta?.err;
  } catch (err) {
    console.error('[checkSignature] Failed:', err);
    return false;
  }
}

/**
 * Fallback monitoring via Solscan API
 */
export async function pollSolscanApi(
  apiKey: string,
  treasuryAddress: string = TREASURY_ADDRESS
): Promise<any[]> {
  try {
    const response = await fetch(
      `https://api.solscan.io/v2/account/${treasuryAddress}/transactions?limit=50`,
      {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      }
    );

    if (!response.ok) {
      console.error('[Solscan] API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (err) {
    console.error('[Solscan] Failed:', err);
    return [];
  }
}

/**
 * Fallback monitoring via Alchemy
 */
export async function pollAlchemyApi(
  apiKey: string,
  treasuryAddress: string = TREASURY_ADDRESS
): Promise<any[]> {
  try {
    const response = await fetch(
      `https://solana-mainnet.g.alchemy.com/v2/${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getConfirmedSignaturesForAddress',
          params: [treasuryAddress, { limit: 50 }],
        }),
      }
    );

    if (!response.ok) {
      console.error('[Alchemy] API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.result || [];
  } catch (err) {
    console.error('[Alchemy] Failed:', err);
    return [];
  }
}

/**
 * Fallback monitoring via QuickNode
 */
export async function pollQuickNodeApi(
  apiKey: string,
  endpoint: string,
  treasuryAddress: string = TREASURY_ADDRESS
): Promise<any[]> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getConfirmedSignaturesForAddress',
        params: [treasuryAddress, { limit: 50 }],
      }),
    });

    if (!response.ok) {
      console.error('[QuickNode] API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.result || [];
  } catch (err) {
    console.error('[QuickNode] Failed:', err);
    return [];
  }
}

/**
 * Comprehensive fallback monitoring - tries all available services
 */
export async function monitorWithFallback(): Promise<any[]> {
  const config = DEFAULT_CONFIG;
  const allTransactions: any[] = [];

  // Try Solscan
  if (config.solscanEnabled && config.solscanApiKey) {
    const solscanTxs = await pollSolscanApi(config.solscanApiKey);
    allTransactions.push(...solscanTxs);
  }

  // Try Alchemy
  if (config.alchemyEnabled && config.alchemyApiKey) {
    const alchemyTxs = await pollAlchemyApi(config.alchemyApiKey);
    allTransactions.push(...alchemyTxs);
  }

  // Try QuickNode
  if (config.quickNodeEnabled && config.quickNodeApiKey && process.env.QUICKNODE_ENDPOINT) {
    const quicknodeTxs = await pollQuickNodeApi(
      config.quickNodeApiKey,
      process.env.QUICKNODE_ENDPOINT
    );
    allTransactions.push(...quicknodeTxs);
  }

  // Always include RPC polling as final fallback
  const rpcTxs = await pollTreasuryTransactions(config);
  allTransactions.push(...rpcTxs);

  return allTransactions;
}

/**
 * Start continuous monitoring with fallback
 */
export function startContinuousMonitoring(
  onPaymentDetected: (signature: string) => Promise<void>,
  intervalMs: number = 30000
): NodeJS.Timeout {
  let lastSlot = 0;

  return setInterval(async () => {
    try {
      const transactions = await monitorWithFallback();
      
      for (const tx of transactions) {
        if (tx.slot && tx.slot > lastSlot) {
          lastSlot = tx.slot;
          await onPaymentDetected(tx.signature);
        }
      }
    } catch (err) {
      console.error('[monitoring] Continuous monitoring error:', err);
    }
  }, intervalMs);
}

/**
 * Verify monitoring services are healthy
 */
export async function checkMonitoringHealth(): Promise<{
  helius: boolean;
  solscan: boolean;
  alchemy: boolean;
  quicknode: boolean;
  rpc: boolean;
}> {
  const results = {
    helius: false,
    solscan: false,
    alchemy: false,
    quicknode: false,
    rpc: false,
  };

  // Check RPC
  try {
    const connection = rpcFailover.getConnection();
    const slot = await connection.getSlot('confirmed');
    results.rpc = slot > 0;
  } catch (err) {
    console.error('[health] RPC check failed:', err);
  }

  // Check Solscan
  if (DEFAULT_CONFIG.solscanApiKey) {
    try {
      const response = await fetch(
        `https://api.solscan.io/v2/account/${TREASURY_ADDRESS}`,
        { method: 'HEAD' }
      );
      results.solscan = response.ok;
    } catch (err) {
      console.error('[health] Solscan check failed:', err);
    }
  }

  // Check Alchemy
  if (DEFAULT_CONFIG.alchemyApiKey) {
    try {
      const response = await fetch(
        `https://solana-mainnet.g.alchemy.com/v2/${DEFAULT_CONFIG.alchemyApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSlot', params: [] }),
        }
      );
      const data = await response.json();
      results.alchemy = typeof data.result === 'number' && data.result > 0;
    } catch (err) {
      console.error('[health] Alchemy check failed:', err);
    }
  }

  return results;
}

export default {
  pollTreasuryTransactions,
  checkSignatureConfirmation,
  pollSolscanApi,
  pollAlchemyApi,
  pollQuickNodeApi,
  monitorWithFallback,
  startContinuousMonitoring,
  checkMonitoringHealth,
  DEFAULT_CONFIG,
};