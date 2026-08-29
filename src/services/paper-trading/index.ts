/**
 * Paper Trading Service — OSIRIS Phase 6.1
 *
 * Provides isolated paper trading execution that:
 * - Uses a separate canary wallet for paper trades
 * - Does NOT affect real balances or positions
 * - Records all paper trades for PnL analytics
 * - Enforces same limits/safety checks as live trading
 */

import { EventEmitter } from 'events';

export type PaperTradeSide = 'buy' | 'sell';
export type PaperTradeStatus = 'pending' | 'executed' | 'failed' | 'cancelled';

export interface PaperTradeInput {
  walletAddress: string;
  inputMint: string;
  outputMint: string;
  side: PaperTradeSide;
  amount: number;
  slippageBps?: number;
  priorityFee?: number;
  metadata?: Record<string, unknown>;
}

export interface PaperTradeRecord {
  id: number;
  userId: number;
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  outputAmount: number;
  simulatedPrice: number;
  pnl: number;
  createdAt: Date;
}

export interface PaperPosition {
  id: number;
  walletAddress: string;
  tokenMint: string;
  side: PaperTradeSide;
  quantity: string;
  averageEntryPrice: string;
  totalCost: string;
  totalFees: string;
  unrealizedPnl?: string;
  realizedPnl: string;
  openAt: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class PaperTradingService extends EventEmitter {
  private enabled: boolean;

  constructor() {
    super();
    this.enabled = process.env.PAPER_TRADING_ENABLED === 'true';
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async executeTrade(_input: PaperTradeInput): Promise<PaperTradeRecord> {
    if (!this.enabled) {
      throw new Error('Paper trading is disabled');
    }

    // TODO: implement paper trade execution when paper_trades schema is expanded
    throw new Error('Paper trading execution not yet implemented');
  }

  async getTradeHistory(_walletAddress: string, _limit = 100): Promise<PaperTradeRecord[]> {
    // TODO: implement when paper_trades schema is expanded
    return [];
  }

  async getPositions(_walletAddress: string): Promise<PaperPosition[]> {
    // TODO: implement when paper_positions schema is added
    return [];
  }
}

export const paperTradingService = new PaperTradingService();
