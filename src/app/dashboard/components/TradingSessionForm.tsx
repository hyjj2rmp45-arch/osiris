'use client';

import { useState } from 'react';

export const TradingSessionForm = () => {
  const [name, setName] = useState('');
  const [copyPercentage, setCopyPercentage] = useState(50);
  const [maxPositionSize, setMaxPositionSize] = useState(10000);
  const [minTradeSize, setMinTradeSize] = useState(100);

  // Simple validation
  const isValid = name.trim() !== '' && minTradeSize <= maxPositionSize;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    // Store session data (in real app, this would call an API)
    console.log('Creating session:', {
      name: name.trim(),
      copyPercentage: Number(copyPercentage),
      maxPositionSize: Number(maxPositionSize),
      minTradeSize: Number(minTradeSize),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-surface-elevated border border-border rounded-sm">
      <h2 className="text-xl font-semibold mb-4">Create New Trading Session</h2>

      <div>
        <label htmlFor="session-name" className="block text-sm font-medium mb-1">
          Session Name
        </label>
        <input
          id="session-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md focus:ring-primary/50"
          placeholder="e.g., Algo-Trader Session 1"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label htmlFor="copy-percentage" className="block text-sm font-medium mb-1">
            Copy Percentage: {copyPercentage}%
          </label>
          <input
            id="copy-percentage"
            type="range"
            min="1"
            max="100"
            value={copyPercentage}
            onChange={(e) => setCopyPercentage(Number(e.target.value))}
            className="w-full h-6"
          />
          <div className="flex justify-between mt-1 text-xs">
            <span>1%</span>
            <span>100%</span>
          </div>
        </div>

        <div>
          <label htmlFor="max-position-size" className="block text-sm font-medium mb-1">
            Max Position Size: {maxPositionSize.toLocaleString()} SOL
          </label>
          <input
            id="max-position-size"
            type="range"
            min="100"
            max="1000000"
            value={maxPositionSize}
            onChange={(e) => setMaxPositionSize(Number(e.target.value))}
            className="w-full h-6"
          />
          <div className="flex justify-between mt-1 text-xs">
            <span>100</span>
            <span>1,000,000</span>
          </div>
        </div>

        <div>
          <label htmlFor="min-trade-size" className="block text-sm font-medium mb-1">
            Min Trade Size: {minTradeSize.toLocaleString()} SOL
          </label>
          <input
            id="min-trade-size"
            type="range"
            min="1"
            max="10000"
            value={minTradeSize}
            onChange={(e) => setMinTradeSize(Number(e.target.value))}
            className="w-full h-6"
          />
          <div className="flex justify-between mt-1 text-xs">
            <span>1</span>
            <span>10,000</span>
          </div>
          {minTradeSize > maxPositionSize && (
            <p className="text-xs text-red-400 mt-1">Min trade size cannot exceed max position size.</p>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          type="submit"
          disabled={!isValid}
          className="w-full px-6 py-2 bg-primary text-surface rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          Create Session
        </button>
      </div>
    </form>
  );
};