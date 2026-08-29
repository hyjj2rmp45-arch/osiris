'use client';

import { useState } from 'react';

interface PerformanceDataPoint {
  date: string;
  pnl: number;
  cumulativePnl: number;
  trades: number;
}

const mockPerformanceData: PerformanceDataPoint[] = [
  { date: '2024-01-01', pnl: 125.50, cumulativePnl: 125.50, trades: 5 },
  { date: '2024-01-02', pnl: -45.20, cumulativePnl: 80.30, trades: 3 },
  { date: '2024-01-03', pnl: 210.75, cumulativePnl: 291.05, trades: 7 },
  { date: '2024-01-04', pnl: 89.30, cumulativePnl: 380.35, trades: 4 },
  { date: '2024-01-05', pnl: -32.10, cumulativePnl: 348.25, trades: 2 },
  { date: '2024-01-06', pnl: 156.80, cumulativePnl: 505.05, trades: 6 },
  { date: '2024-01-07', pnl: 67.40, cumulativePnl: 572.45, trades: 4 },
];

const formatCurrency = (value: number) => {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const PerformanceTracking = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedTarget, setSelectedTarget] = useState('All Targets');

  const filteredData = mockPerformanceData; // In real app, filter by timeRange and target
  
  const totalPnl = filteredData.reduce((sum, d) => sum + d.pnl, 0);
  const totalTrades = filteredData.reduce((sum, d) => sum + d.trades, 0);
  const winDays = filteredData.filter(d => d.pnl > 0).length;
  const winRate = ((winDays / filteredData.length) * 100).toFixed(1);
  const avgDailyPnl = (totalPnl / filteredData.length).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Performance Tracking</h2>
        <div className="flex items-center space-x-3">
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="px-3 py-1 border border-border rounded-md bg-surface text-sm"
          >
            <option>All Targets</option>
            <option>Whale Trader Alpha</option>
            <option>DeFi Yield Farmer</option>
          </select>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-1 border border-border rounded-md bg-surface text-sm"
          >
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
            <option value="90d">90 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-surface-elevated border border-border rounded-sm">
          <p className="text-sm text-muted-foreground">Total PNL</p>
          <p className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(totalPnl)}
          </p>
        </div>
        <div className="p-4 bg-surface-elevated border border-border rounded-sm">
          <p className="text-sm text-muted-foreground">Win Rate</p>
          <p className="text-2xl font-bold text-primary">{winRate}%</p>
        </div>
        <div className="p-4 bg-surface-elevated border border-border rounded-sm">
          <p className="text-sm text-muted-foreground">Total Trades</p>
          <p className="text-2xl font-bold">{totalTrades}</p>
        </div>
        <div className="p-4 bg-surface-elevated border border-border rounded-sm">
          <p className="text-sm text-muted-foreground">Avg Daily PNL</p>
          <p className={`text-2xl font-bold ${parseFloat(avgDailyPnl) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(parseFloat(avgDailyPnl))}
          </p>
        </div>
      </div>

      {/* PNL Chart */}
      <div className="p-4 bg-surface-elevated border border-border rounded-sm">
        <h3 className="text-sm font-medium mb-4">PNL Over Time</h3>
        <div className="h-64 flex items-end justify-between space-x-1 px-2">
          {filteredData.map((point, index) => {
            const maxPnl = Math.max(...filteredData.map(d => d.cumulativePnl));
            const minPnl = Math.min(...filteredData.map(d => d.cumulativePnl));
            const range = maxPnl - minPnl || 1;
            const height = ((point.cumulativePnl - minPnl) / range) * 200;
            
            return (
              <div key={point.date} className="flex-1 flex flex-col items-center space-y-1">
                <div 
                  className={`w-full rounded-t transition-all duration-300 ${
                    point.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ height: `${Math.max(height, 4)}px` }}
                />
                <span className="text-xs text-muted-foreground">
                  {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Target Comparison */}
      <div className="p-4 bg-surface-elevated border border-border rounded-sm">
        <h3 className="text-sm font-medium mb-4">Target Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 px-2">Target</th>
                <th className="pb-2 px-2 text-right">Trades</th>
                <th className="pb-2 px-2 text-right">Win Rate</th>
                <th className="pb-2 px-2 text-right">Total PNL</th>
                <th className="pb-2 px-2 text-right">Avg Latency</th>
                <th className="pb-2 px-2 text-right">Copy %</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Whale Trader Alpha</td>
                <td className="py-3 px-2 text-right font-mono">142</td>
                <td className="py-3 px-2 text-right font-mono text-green-500">68.3%</td>
                <td className="py-3 px-2 text-right font-mono text-green-500">+$2,450.75</td>
                <td className="py-3 px-2 text-right font-mono">45ms</td>
                <td className="py-3 px-2 text-right font-mono">50%</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">DeFi Yield Farmer</td>
                <td className="py-3 px-2 text-right font-mono">89</td>
                <td className="py-3 px-2 text-right font-mono text-green-500">72.1%</td>
                <td className="py-3 px-2 text-right font-mono text-green-500">+$1,280.30</td>
                <td className="py-3 px-2 text-right font-mono">38ms</td>
                <td className="py-3 px-2 text-right font-mono">25%</td>
              </tr>
              <tr className="border-b border-border/50 opacity-60">
                <td className="py-3 px-2 font-medium">Inactive Target</td>
                <td className="py-3 px-2 text-right font-mono">12</td>
                <td className="py-3 px-2 text-right font-mono text-red-500">41.6%</td>
                <td className="py-3 px-2 text-right font-mono text-red-500">-$45.20</td>
                <td className="py-3 px-2 text-right font-mono">120ms</td>
                <td className="py-3 px-2 text-right font-mono">10%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};