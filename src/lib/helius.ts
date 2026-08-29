/**
 * OSIRIS Helius RPC + Sender — wraps Helius for RPC calls and user-custody transaction execution.
 * 
 * The rpc module handles direct Helius RPC calls (getSlot, getAccountInfo, etc.).
 * The sender module handles transaction building, signing, sending, and confirmation
 * from the user's wallet (not OSIRIS custody).
 */

import { Connection, VersionedTransaction } from '@solana/web3.js';
import { getEnv } from '@/lib/config';
import { logger } from '@/lib/logger';
import {
  HeliusSender,
  SendTransactionOptions,
  SimulationResult,
  SendResult,
  sendHeliusTransaction,
} from '@/services/helius/sender';

// =============================================================================
// RPC Module
// =============================================================================

const env = getEnv();

const RPC_URL = env.HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`
  : env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export const rpc = new Connection(RPC_URL, 'confirmed');

/**
 * Verify Helius RPC connection by fetching current slot.
 */
export async function getSlot(): Promise<number> {
  try {
    return await rpc.getSlot();
  } catch (err) {
    logger.error('[helius/rpc] getSlot failed', { error: err });
    throw new Error(`Failed to get slot from Helius: ${err instanceof Error ? err.message : err}`);
  }
}

// =============================================================================
// Sender Module — re-exports from @/services/helius/sender
// =============================================================================

export { HeliusSender, sendHeliusTransaction };
export type { SendTransactionOptions, SimulationResult, SendResult };
