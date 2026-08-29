/**
 * Trading API — OSIRIS Phase 8
 * API endpoints for trading operations
 */

import { apiClient } from './client';

export interface CreateSessionRequest {
  name: string;
  copyPercentage: number;
  maxPositionSize: number;
  minTradeSize: number;
}

export interface CreateSessionResponse {
  id: string;
  name: string;
  copyPercentage: number;
  maxPositionSize: number;
  minTradeSize: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface ExecuteTradeRequest {
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  slippageBps: number;
}

export interface ExecuteTradeResponse {
  signature: string;
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  outputAmount: number;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
}

export const tradingApi = {
  createSession: (data: CreateSessionRequest): Promise<CreateSessionResponse> =>
    apiClient.post('/api/trading/sessions', data),

  executeTrade: (data: ExecuteTradeRequest): Promise<ExecuteTradeResponse> =>
    apiClient.post('/api/trading/execute', data),

  revokeSession: (sessionId: string): Promise<{ success: boolean }> =>
    apiClient.delete(`/api/trading/sessions/${sessionId}`),

  panic: (): Promise<{ success: boolean }> =>
    apiClient.post('/api/trading/panic', {}),
};