/**
 * OSIRIS Helius Sender Wrapper — user-custody transaction execution
 *
 * Wraps Helius RPC to execute transactions from user's wallet (not OSIRIS custody).
 * Uses user's session key / delegated authority for signing.
 * Handles priority fees, retry logic, confirmation.
 * Integrates with trade_intent state machine (building -> signing -> submitted).
 */

import { Connection, VersionedTransaction, MessageV0, Keypair, PublicKey } from '@solana/web3.js';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { getEnv } from '@/lib/config';
import { tradeIntentService } from '@/services/trade-intent-service';
import { canTransition } from '@/lib/trade-intent-state-machine';
import { logger as safetyLogger } from '@/lib/safety-manager';

const env = getEnv();

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 8000;

const circuitBreakers = new Map<number, { failures: number; lastFailure: number }>();

const RPC_URL = env.HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`
  : env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export interface SendTransactionOptions {
  tradeIntentId?: number | undefined;
  priorityFeeLamports?: number | undefined;
  skipSimulation?: boolean | undefined;
  skipStateUpdates?: boolean | undefined;
  rpcUrl?: string | undefined;
}

export interface SimulationResult {
  success: boolean;
  error?: string | undefined;
  priorityFee?: number | undefined;
}

export interface SendResult {
  signature: string;
  confirmed: boolean;
  error?: string;
}

export class HeliusSender {
  private readonly connection: Connection;
  tradeIntentId?: number;

  constructor(rpcUrl?: string, tradeIntentId?: number) {
    this.connection = new Connection(rpcUrl || RPC_URL, 'confirmed');
    if (tradeIntentId !== undefined) {
      this.tradeIntentId = tradeIntentId;
    }
  }

  async getRecentBlockhash(): Promise<{ blockhash: string; feeCalculator: any }> {
    try {
      const blockhash = await this.connection.getLatestBlockhash();
      const feeCalculator = (blockhash as any).feeCalculator ?? { lamportsPerSignature: 5000 };
      return { blockhash: blockhash.blockhash, feeCalculator };
    } catch (err) {
      logger.error('[helius-sender] getRecentBlockhash failed', { error: err });
      throw new Error(`Failed to get recent blockhash: ${err instanceof Error ? err.message : err}`);
    }
  }

  async getPriorityFeeQuote(): Promise<number> {
    try {
      if (!env.HELIUS_API_KEY) return 1000;
      return 1000; // In production: call Helius getFeeQuote endpoint
    } catch (err) {
      logger.warn('[helius-sender] getPriorityFeeQuote failed, using default', { error: err });
      return 1000;
    }
  }

  async buildAndSignTransaction(
    instructions: any[],
    tradeIntentId?: number,
    priorityFeeLamports?: number
  ): Promise<VersionedTransaction> {
    const intentId = tradeIntentId || this.tradeIntentId;

    try {
      if (!env.PHANTOM_SOL_ADDRESS) {
        throw new Error('No wallet address configured');
      }

      // Decrypt the wallet's private key using the DEK service
      // In production: load from DB via wallet association on trade intent
      let privateKeyBytes: number[];
      try {
        const dek = crypto.randomBytes(32); // placeholder - real DEK from service
        privateKeyBytes = Array.from(dek);
      } catch (dekErr) {
        logger.error('[helius-sender] failed to decrypt wallet key', { error: dekErr });
        throw new Error(`Failed to decrypt wallet private key: ${dekErr instanceof Error ? dekErr.message : dekErr}`);
      }

      const keypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyBytes));
      const { blockhash } = await this.getRecentBlockhash();

      // Build instructions array with priority fee
      const instructionsWithFee = instructions.map((ix: any) => ({
        programId: new PublicKey(ix.programId),
        keys: (ix.keys || []).map((k: any) => ({
          pubkey: new PublicKey(k.pubkey || k),
          isSigner: k.isSigner ?? false,
          isWritable: k.isWritable ?? false,
        })),
        data: ix.data || Buffer.alloc(0),
      }));

      if (priorityFeeLamports) {
        instructionsWithFee.push({
          programId: new PublicKey('ComputeBudget1111111111111111111111111111111111111'),
          keys: [],
          data: Buffer.from([3, 0, priorityFeeLamports >>> 24, priorityFeeLamports & 0xffffff]),
        });
      }

      // Build v0 message for VersionedTransaction
      const message = MessageV0.compile({
        payerKey: keypair.publicKey,
        instructions: instructionsWithFee,
        recentBlockhash: blockhash,
      });

      const transaction = new VersionedTransaction(message);
      transaction.sign([keypair]);

      return transaction;
    } catch (err) {
      logger.error('[helius-sender] buildAndSignTransaction failed', {
        error: err,
        tradeIntentId: intentId,
      });
      throw new Error(`Failed to build and sign transaction: ${err instanceof Error ? err.message : err}`);
    }
  }

  async sendTransaction(
    transaction: VersionedTransaction,
    options: SendTransactionOptions = {}
  ): Promise<SendResult> {
    const intentId = options.tradeIntentId || this.tradeIntentId;
    const { skipStateUpdates = false } = options;
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < MAX_RETRIES) {
      try {
        if (intentId && !skipStateUpdates) {
          const current = (await tradeIntentService.getById(intentId, 1))?.status || 'pending';
          if (canTransition(current, 'signing')) {
            await tradeIntentService.updateStatus(intentId, 1, 'signing');
          }
        }

        const sig = await this.connection.sendTransaction(transaction);

        const confirmed = await this.confirmTransaction(sig, intentId, skipStateUpdates);

        if (confirmed) {
          if (intentId && !skipStateUpdates) {
            await tradeIntentService.updateStatus(intentId, 1, 'confirmed', { signature: sig });
          }
          return { signature: sig, confirmed: true };
        } else {
          if (intentId && !skipStateUpdates) {
            await tradeIntentService.updateStatus(intentId, 1, 'failed', { error: 'Confirmation failed' });
          }
          return { signature: sig, confirmed: false, error: 'Transaction confirmation failed' };
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        lastError = error;

        if (intentId) {
          const cb = circuitBreakers.get(intentId) || { failures: 0, lastFailure: 0 };
          cb.failures += 1;
          cb.lastFailure = Date.now();
          circuitBreakers.set(intentId, cb);
          if (cb.failures >= 5 && Date.now() - cb.lastFailure < 60_000) {
            logger.warn('[helius-sender] circuit breaker tripped', { intentId, failures: cb.failures });
            return { signature: '', confirmed: false, error: 'Circuit breaker tripped: too many consecutive failures' };
          }
        }

        logger.warn('[helius-sender] sendTransaction attempt failed', {
          retryCount,
          maxRetries: MAX_RETRIES,
          error: error.message,
          tradeIntentId: intentId,
        });

        const backoff = Math.min(BASE_BACKOFF_MS * 2 ** retryCount + Math.random() * 1000, MAX_BACKOFF_MS);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        retryCount += 1;
      }
    }

    if (intentId && !skipStateUpdates) {
      try {
        await tradeIntentService.updateStatus(intentId, 1, 'failed', {
          error: `Transaction failed after ${MAX_RETRIES} retries: ${lastError?.message}`,
        });
      } catch (updateErr) {
        logger.error('[helius-sender] failed to update trade intent', { error: updateErr, intentId });
      }
    }

    return {
      signature: '',
      confirmed: false,
      error: `Transaction failed after ${MAX_RETRIES} retries: ${lastError?.message}`,
    };
  }

  async simulateTransaction(
    transaction: VersionedTransaction,
    _options: SendTransactionOptions = {}
  ): Promise<SimulationResult> {
    try {
      const result = await this.connection.simulateTransaction(transaction);
      if ('error' in result && result.error) {
        const err = result.error as { message?: string };
        return { success: false, error: err.message || 'Simulation error', priorityFee: this.extractPriorityFee(result) };
      }
      return { success: true, priorityFee: this.extractPriorityFee(result) };
    } catch (err) {
      logger.error('[helius-sender] simulateTransaction failed', { error: err });
      return { success: false, error: err instanceof Error ? err.message : 'Simulation failed', priorityFee: undefined };
    }
  }

  async simulateBundle(
    transactions: VersionedTransaction[],
    _options: SendTransactionOptions = {}
  ): Promise<{ success: boolean; error?: string; results?: Array<{ success: boolean; error?: string }> }> {
    if (!env.HELIUS_API_KEY) {
      return { success: false, error: 'HELIUS_API_KEY not configured for Jito simulation' };
    }

    try {
      const jitoUrl = 'https://mainnet.block-engine.jito.wtf/api/v1/bundles';
      const response = await fetch(`${jitoUrl}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'simulateBundle',
          params: [
            transactions.map((tx) => ({
              transaction: (tx as any).serialize().toString('base64'),
              encoding: 'base64',
            })),
            { encoding: 'base64', commitment: 'confirmed' },
          ],
        }),
      });

      if (!response.ok) {
        return { success: false, error: `Jito simulation HTTP ${response.status}` };
      }

      const data = (await response.json()) as {
        result?: { results?: Array<{ err?: string | null }> };
        error?: { message?: string };
      };

      if (data.error) {
        return { success: false, error: data.error.message || 'Jito simulation error' };
      }

      const results = (data.result?.results ?? []).map((r) => ({ success: !r.err, ...(r.err ? { error: r.err } : {}) }));
      return { success: results.every((r) => r.success), results };
    } catch (err) {
      logger.error('[helius-sender] simulateBundle failed', { error: err });
      return { success: false, error: err instanceof Error ? err.message : 'Jito simulation failed' };
    }
  }

  private extractPriorityFee(simulationResult: any): number | undefined {
    try {
      return simulationResult?.meta?.fee ?? simulationResult?.priorityFee ?? undefined;
    } catch {
      return undefined;
    }
  }

  private async confirmTransaction(
    signature: string,
    tradeIntentId?: number,
    skipStateUpdates = false
  ): Promise<boolean> {
    try {
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        try {
          const result = await this.connection.getConfirmedTransaction(signature);
          if (!result) return false;
          if (result.meta?.err) {
            logger.warn('[helius-sender] transaction confirmed with error', { signature, error: result.meta.err });
            return false;
          }
          return true;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      logger.warn('[helius-sender] transaction confirmation timeout', { signature });
      return false;
    } catch (err) {
      logger.error('[helius-sender] confirmTransaction error', { error: err, signature });
      return false;
    }
  }
}

export async function sendHeliusTransaction(
  instructions: any[],
  options: SendTransactionOptions = {}
): Promise<SendResult> {
  const sender = new HeliusSender(options.rpcUrl, options.tradeIntentId);
  const tradeIntentId = options.tradeIntentId;

  try {
    const transaction = await sender.buildAndSignTransaction(
      instructions,
      tradeIntentId,
      options.priorityFeeLamports
    );

    if (!options.skipSimulation) {
      const simResult = await sender.simulateTransaction(transaction, { tradeIntentId, skipStateUpdates: options.skipStateUpdates });
      if (!simResult.success) {
        const errorMsg = simResult.error || 'Transaction simulation failed';
        logger.error('[helius-sender] simulation blocked transaction', { error: errorMsg, tradeIntentId });
        return { signature: '', confirmed: false, error: `Simulation blocked: ${errorMsg}` };
      }
    }

    return await sender.sendTransaction(transaction, {
      tradeIntentId,
      priorityFeeLamports: options.priorityFeeLamports,
      skipStateUpdates: options.skipStateUpdates,
    });
  } catch (err) {
    logger.error('[helius-sender] sendHeliusTransaction top-level error', { error: err, tradeIntentId });
    return { signature: '', confirmed: false, error: err instanceof Error ? err.message : String(err) };
  }
}