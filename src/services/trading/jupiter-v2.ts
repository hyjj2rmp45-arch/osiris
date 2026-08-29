/**
 * Jupiter Limit Order V2 integration — OSIRIS
 *
 * Handles:
 * - TP/SL/OCO order placement
 * - Order monitoring and cancellation
 * - JWT-authenticated keeper requests
 */

import { Connection, VersionedTransaction } from '@solana/web3.js';
import { logger } from '@/lib/logger';
import { getEnv } from '@/lib/config';

const env = getEnv();

export interface JupiterOrder {
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  outputAmount: number;
  slippageBps: number;
  expiredAt: number; // unix timestamp ms
}

export interface JupiterClientOptions {
  rpcUrl?: string;
  apiKey?: string;
}

export class JupiterV2Client {
  private readonly connection: Connection;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.jup.ag/limit/v2';

  constructor(options: JupiterClientOptions = {}) {
    const apiKey = options.apiKey || env.JUPITER_API_KEY || '';
    if (!apiKey) {
      throw new Error('Jupiter API key not configured');
    }

    const rpcUrl = options.rpcUrl || env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.apiKey = apiKey;
  }

  async createOrder(order: JupiterOrder): Promise<{ id: string; tx: VersionedTransaction }> {
    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        inputMint: order.inputMint,
        outputMint: order.outputMint,
        inputAmount: order.inputAmount,
        outputAmount: order.outputAmount,
        slippageBps: order.slippageBps,
        expiredAt: order.expiredAt,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Jupiter order creation failed: ${response.status} ${text}`);
    }

    const data = await response.json();
    const txBuffer = Buffer.from(data.transaction, 'base64');
    const transaction = VersionedTransaction.deserialize(txBuffer);
    return {
      id: data.id,
      tx: transaction,
    };
  }

  async cancelOrder(orderId: string): Promise<void> {
    await fetch(`${this.baseUrl}/orders/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
  }

  async getOrder(orderId: string): Promise<{ status: string; filledAmount?: number }> {
    const response = await fetch(`${this.baseUrl}/orders/${orderId}`);

    if (!response.ok) {
      throw new Error(`Jupiter order fetch failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      status: data.status,
      filledAmount: data.filledAmount,
    };
  }

  async createOCOOrders(
    tpOrder: JupiterOrder,
    slOrder: JupiterOrder
  ): Promise<{ tpId: string; slId: string }> {
    const [tp, sl] = await Promise.all([
      this.createOrder(tpOrder),
      this.createOrder(slOrder),
    ]);

    return { tpId: tp.id, slId: sl.id };
  }
}

export const jupiterV2Client = new JupiterV2Client();
