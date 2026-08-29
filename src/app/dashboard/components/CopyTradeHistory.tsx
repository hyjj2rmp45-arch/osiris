'use client';

import { useState } from 'react';

interface CopyTrade {
  id: string;
  sourceAddress: string;
  sourceLabel: string;
  inputMint: string;
  outputMint: string;
  sourceAmount: number;
  copyAmount: number;
  signature: string;
  status: 'pending' | 'simulated' | 'submitted' | 'confirmed' | 'failed';
  pnl: number;
  latencyMs: number;
  createdAt: number;
}

const mockCopyTrades: CopyTrade[] = [
  {
    id: 'ct-1',
    sourceAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fEb',
    sourceLabel: 'Whale Trader Alpha',
    inputMint: 'SOL',
    outputMint: 'USDC',
    sourceAmount: 500,
    copyAmount: 250,
    signature: '5X7K9mN2pQ3rS4tV6wX8yZ1aB3cD5eF7gH9iJ2kL4mN6oP8qR1sT3uV5wX',
    status: 'confirmed',
    pnl: 12.50,
    latencyMs: 42,
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'ct-2',
    sourceAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fEb',
    sourceLabel: 'Whale Trader Alpha',
    inputMint: 'USDC',
    outputMint: 'SOL',
    sourceAmount: 1000,
    copyAmount: 500,
    signature: '9aB2cD4eF6gH8iJ1kL3mN5oP7qR9sT2uV4wX6yZ8aB1cD3eF5gH7iJ',
    status: 'confirmed',
    pnl: -8.20,
    latencyMs: 38,
    createdAt: Date.now() - 7200000,
  },
  {
    id: 'ct-3',
    sourceAddress: '0x8ba1f109551bD432803012645Hac136c4c4C4D9F',
    sourceLabel: 'DeFi Yield Farmer',
    inputMint: 'SOL',
    outputMint: 'mSOL',
    sourceAmount: 200,
    copyAmount: 50,
    signature: '3kL5mN7oP9qR2sT4uV6wX8yZ1aB3cD5eF7gH9iJ2kL4mN6oP8qR',
    status: 'submitted',
    pnl: 0,
    latencyMs: 45,
    createdAt: Date.now() - 10800000,
  },
  {
    id: 'ct-4',
    sourceAddress: '0x8ba1f109551bD432803012645Hac136c4c4C4D9F',
    sourceLabel: 'DeFi Yield Farmer',
    inputMint: 'mSOL',
    outputMint: 'SOL',
    sourceAmount: 50,
    copyAmount: 12.5,
    signature: '7hJ9kL2mN4oP6qR8sT1uV3wX5yZ7aB9cD2eF4gH6iJ8kL1mN3oP',
    status: 'confirmed',
    pnl: 5.75,
    latencyMs: 41,
    createdAt: Date.now() - 14400000,
  },
  {
    id: 'ct-5',
    sourceAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fEb',
    sourceLabel: 'Whale Trader Alpha',
    inputMint: 'SOL',
    outputMint: 'BONK',
    sourceAmount: 100,
    copyAmount: 50,
    signature: '1aB3cD5eF7gH9iJ2kL4mN6oP8qR1sT3uV5wX7yZ9aB2cD4eF6gH',
    status: 'failed',
    pnl: -2.30,
    latencyMs: 120,
    createdAt: Date.now() - 18000000,
  },
];

const formatCurrency = (value: number) => {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatNumber = (value: number) => {
  return value.toLocaleString();
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

const statusColors = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  simulated: 'bg-blue-500/20 text-blue-400',
  submitted: 'bg-purple-500/20 text-purple-400',
  confirmed: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
};

export const CopyTradeHistory = () => {
  const [trades] = useState<CopyTrade[]>(mockCopyTrades);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'pending' | 'failed'>('all');
  const [sortField, setSortField] = useState<keyof CopyTrade>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof CopyTrade) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredTrades = trades.filter(trade => 
    filter === 'all' || trade.status === filter
  );

  const sortedTrades = [...filteredTrades].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const statusCounts = trades.reduce((acc, trade) => {
    acc[trade.status] = (acc[trade.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Copy Trade History</h2>
        <div className="flex items-center space-x-2">
          {(['all', 'confirmed', 'pending', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === status
                  ? 'bg-primary text-surface'
                  : 'bg-surface border border-border hover:bg-surface-elevated'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status] || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="pb-2 px-2 cursor-pointer hover:text-body" onClick={() => handleSort('createdAt')}>
                Time
              </th>
              <th className="pb-2 px-2 cursor-pointer hover:text-body" onClick={() => handleSort('sourceLabel')}>
                Source
              </th>
              <th className="pb-2 px-2 cursor-pointer hover:text-body" onClick={() => handleSort('inputMint')}>
                Pair
              </th>
              <th className="pb-2 px-2 text-right cursor-pointer hover:text-body" onClick={() => handleSort('copyAmount')}>
                Copy Amount
              </th>
              <th className="pb-2 px-2 cursor-pointer hover:text-body" onClick={() => handleSort('status')}>
                Status
              </th>
              <th className="pb-2 px-2 text-right cursor-pointer hover:text-body" onClick={() => handleSort('pnl')}>
                PNL
              </th>
              <th className="pb-2 px-2 text-right cursor-pointer hover:text-body" onClick={() => handleSort('latencyMs')}>
                Latency
              </th>
              <th className="pb-2 px-2">Tx</th>
            </tr>
          </thead>
          <tbody>
            {sortedTrades.map((trade) => (
              <tr key={trade.id} className="border-b border-border/50 hover:bg-surface/50">
                <td className="py-3 px-2 text-xs font-mono">
                  {formatDate(trade.createdAt)}
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
                      {trade.sourceLabel[0]}
                    </div>
                    <span className="font-medium truncate max-w-[150px]">{trade.sourceLabel}</span>
                  </div>
                </td>
                <td className="py-3 px-2 font-mono">
                  {trade.inputMint} → {trade.outputMint}
                </td>
                <td className="py-3 px-2 text-right font-mono">
                  {formatNumber(trade.copyAmount)} {trade.outputMint}
                </td>
                <td className="py-3 px-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${statusColors[trade.status]}`}>
                    {trade.status.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-2 text-right font-mono">
                  <span className={trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                  </span>
                </td>
                <td className="py-3 px-2 text-right font-mono">
                  {trade.latencyMs}ms
                </td>
                <td className="py-3 px-2">
                  <a
                    href={`https://solscan.io/tx/${trade.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredTrades.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No trades found for this filter
        </div>
      )}
    </div>
  );
};