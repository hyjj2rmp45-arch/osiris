'use client';

import { useState } from 'react';

interface CopyTarget {
  id: string;
  address: string;
  label: string;
  copyPercentage: number;
  maxPositionSize: number;
  minTradeSize: number;
  isActive: boolean;
  performance: {
    totalTrades: number;
    winRate: number;
    totalPnl: number;
    avgLatencyMs: number;
  };
}

const mockTargets: CopyTarget[] = [
  {
    id: 'ct-1',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fEb',
    label: 'Whale Trader Alpha',
    copyPercentage: 50,
    maxPositionSize: 1000000,
    minTradeSize: 1000,
    isActive: true,
    performance: {
      totalTrades: 142,
      winRate: 68.3,
      totalPnl: 2450.75,
      avgLatencyMs: 45,
    },
  },
  {
    id: 'ct-2',
    address: '0x8ba1f109551bD432803012645Hac136c4c4C4D9F',
    label: 'DeFi Yield Farmer',
    copyPercentage: 25,
    maxPositionSize: 500000,
    minTradeSize: 500,
    isActive: true,
    performance: {
      totalTrades: 89,
      winRate: 72.1,
      totalPnl: 1280.30,
      avgLatencyMs: 38,
    },
  },
  {
    id: 'ct-3',
    address: '0x1234567890123456789012345678901234567890',
    label: 'Inactive Target',
    copyPercentage: 10,
    maxPositionSize: 100000,
    minTradeSize: 100,
    isActive: false,
    performance: {
      totalTrades: 12,
      winRate: 41.6,
      totalPnl: -45.20,
      avgLatencyMs: 120,
    },
  },
];

export const TargetList = () => {
  const [targets, setTargets] = useState<CopyTarget[]>(mockTargets);
  const [isAdding, setIsAdding] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newCopyPercentage, setNewCopyPercentage] = useState(25);
  const [newMaxPositionSize, setNewMaxPositionSize] = useState(500000);
  const [newMinTradeSize, setNewMinTradeSize] = useState(1000);

  const handleAdd = () => {
    if (!newAddress.trim()) return;
    
    if (newAddress.length < 32 || newAddress.length > 44) {
      alert('Invalid address format');
      return;
    }

    const newTarget: CopyTarget = {
      id: `ct-${Date.now()}`,
      address: newAddress.trim(),
      label: newLabel.trim() || 'Unnamed',
      copyPercentage: newCopyPercentage,
      maxPositionSize: newMaxPositionSize,
      minTradeSize: newMinTradeSize,
      isActive: true,
      performance: {
        totalTrades: 0,
        winRate: 0,
        totalPnl: 0,
        avgLatencyMs: 0,
      },
    };

    setTargets(prev => [...prev, newTarget]);
    setIsAdding(false);
    setNewAddress('');
    setNewLabel('');
    setNewCopyPercentage(25);
    setNewMaxPositionSize(500000);
    setNewMinTradeSize(1000);
  };

  const handleRemove = (id: string) => {
    if (!window.confirm('Remove this copy target?')) return;
    setTargets(prev => prev.filter(t => t.id !== id));
  };

  const handleToggle = (id: string) => {
    setTargets(prev => prev.map(t => 
      t.id === id ? { ...t, isActive: !t.isActive } : t
    ));
  };

  const handlePercentageChange = (id: string, percentage: number) => {
    setTargets(prev => prev.map(t => 
      t.id === id ? { ...t, copyPercentage: percentage } : t
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Copy Targets</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-primary text-surface rounded-md hover:bg-primary-dark text-sm"
        >
          + Add Target
        </button>
      </div>

      <div className="space-y-3">
        {targets.map((target) => (
          <div key={target.id} className={`p-4 bg-surface-elevated border border-border rounded-sm ${target.isActive ? 'border-primary/30' : 'opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {target.label[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{target.label}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {target.address.slice(0, 12)}...{target.address.slice(-8)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={target.isActive}
                    onChange={() => handleToggle(target.id)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
                  />
                  <span className="text-sm">{target.isActive ? 'Active' : 'Paused'}</span>
                </label>
                <button
                  onClick={() => handleRemove(target.id)}
                  className="px-3 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Copy %</p>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={target.copyPercentage}
                  onChange={(e) => handlePercentageChange(target.id, parseInt(e.target.value))}
                  className="w-full h-4"
                />
                <div className="flex justify-between mt-1 text-xs">
                  <span>{target.copyPercentage}%</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max Position</p>
                <p className="font-mono text-sm">{target.maxPositionSize.toLocaleString()} SOL</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Min Trade</p>
                <p className="font-mono text-sm">{target.minTradeSize.toLocaleString()} SOL</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Latency</p>
                <p className="font-mono text-sm">{target.performance.avgLatencyMs}ms</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="p-3 bg-surface border border-border rounded-sm">
                <p className="text-muted-foreground">Total Trades</p>
                <p className="font-semibold">{target.performance.totalTrades}</p>
              </div>
              <div className="p-3 bg-surface border border-border rounded-sm">
                <p className="text-muted-foreground">Win Rate</p>
                <p className="font-semibold text-green-500">{target.performance.winRate.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-surface border border-border rounded-sm">
                <p className="text-muted-foreground">Total PNL</p>
                <p className={`font-semibold ${target.performance.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {target.performance.totalPnl >= 0 ? '+' : ''}${target.performance.totalPnl.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-surface border border-border rounded-sm">
                <p className="text-muted-foreground">Status</p>
                <p className={`font-semibold ${target.isActive ? 'text-green-500' : 'text-gray-500'}`}>
                  {target.isActive ? 'ACTIVE' : 'PAUSED'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="mt-4 p-4 bg-surface border border-border rounded-sm space-y-4">
          <h3 className="font-medium">Add Copy Target</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Target Address</label>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Enter wallet address"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Label (optional)</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g., Whale Trader"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Copy Percentage</label>
              <input
                type="range"
                min="1"
                max="100"
                value={newCopyPercentage}
                onChange={(e) => setNewCopyPercentage(parseInt(e.target.value))}
                className="w-full h-4"
              />
              <p className="text-sm text-right mt-1">{newCopyPercentage}%</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Position (SOL)</label>
              <input
                type="number"
                value={newMaxPositionSize}
                onChange={(e) => setNewMaxPositionSize(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min Trade (SOL)</label>
              <input
                type="number"
                value={newMinTradeSize}
                onChange={(e) => setNewMinTradeSize(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => { setIsAdding(false); setNewAddress(''); setNewLabel(''); }}
              className="px-4 py-2 border border-border rounded-md hover:bg-surface"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-primary text-surface rounded-md hover:bg-primary-dark"
            >
              Add Target
            </button>
          </div>
        </div>
      )}
    </div>
  );
};