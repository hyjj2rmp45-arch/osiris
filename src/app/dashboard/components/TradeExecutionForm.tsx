'use client';

import { useState } from 'react';
import { useTrustTier } from '@/lib/hooks/use-trust-tier';

export const TradeExecutionForm = () => {
  const [inputMint, setInputMint] = useState('SOL');
  const [outputMint, setOutputMint] = useState('USDC');
  const [inputAmount, setInputAmount] = useState('');
  const [slippageBps, setSlippageBps] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const { canTrade, requiresReauthForTrading } = useTrustTier();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canTrade || !inputAmount) return;

    setIsLoading(true);
    try {
      // In real app, this would call the trading API
      console.log('Executing trade:', { 
        inputMint, 
        outputMint, 
        inputAmount: parseFloat(inputAmount),
        slippageBps 
      });
      
      // Mock success
      alert('Trade executed successfully!');
    } catch (error) {
      console.error('Trade failed:', error);
      alert('Trade failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-surface-elevated border border-border rounded-sm">
      <h2 className="text-xl font-semibold mb-4">Execute Trade</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="input-token" className="block text-sm font-medium mb-1">
            From Token
          </label>
          <select
            id="input-token"
            value={inputMint}
            onChange={(e) => setInputMint(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:ring-primary/50"
            disabled={!canTrade}
          >
            <option value="SOL">SOL</option>
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="output-token" className="block text-sm font-medium mb-1">
            To Token
          </label>
          <select
            id="output-token"
            value={outputMint}
            onChange={(e) => setOutputMint(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:ring-primary/50"
            disabled={!canTrade}
          >
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
            <option value="SOL">SOL</option>
          </select>
        </div>
      </div>
      
      <div>
        <label htmlFor="input-amount" className="block text-sm font-medium mb-1">
          Amount
        </label>
        <input
          id="input-amount"
          type="number"
          step="0.001"
          min="0.001"
          value={inputAmount}
          onChange={(e) => setInputAmount(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md focus:ring-primary/50"
          placeholder="e.g., 1.5"
          disabled={!canTrade}
        />
      </div>
      
      <div>
        <label htmlFor="slippage" className="block text-sm font-medium mb-1">
          Slippage Tolerance ({slippageBps} bps)
        </label>
        <input
          id="slippage"
          type="range"
          min="10"
          max="500"
          value={slippageBps}
          onChange={(e) => setSlippageBps(Number(e.target.value))}
          className="w-full h-6"
          disabled={!canTrade}
        />
        <div className="flex justify-between mt-1 text-xs">
          <span>0.1%</span>
          <span>{slippageBps} bps</span>
          <span>5%</span>
        </div>
      </div>
      
      {requiresReauthForTrading && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-yellow-400 text-sm">
          ⚠️ Re-authentication required for trading operations
        </div>
      )}
      
      <div className="flex justify-end mt-6">
        <button
          type="submit"
          className="w-full px-6 py-2 bg-primary text-surface rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!canTrade || isLoading || !inputAmount}
        >
          {isLoading ? 'Executing...' : 'Execute Trade'}
        </button>
      </div>
    </form>
  );
};