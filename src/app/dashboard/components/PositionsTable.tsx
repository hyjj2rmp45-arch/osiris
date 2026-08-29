'use client';

interface Position {
  id: string;
  mint: string;
  symbol: string;
  amount: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
}

const mockPositions: Position[] = [
  {
    id: 'pos-1',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTt1g',
    symbol: 'USDC',
    amount: 1000,
    avgEntryPrice: 1.0,
    currentPrice: 1.002,
    unrealizedPnl: 2.0,
    realizedPnl: 15.5,
  },
  {
    id: 'pos-2',
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT',
    amount: 500,
    avgEntryPrice: 1.0,
    currentPrice: 0.999,
    unrealizedPnl: -0.5,
    realizedPnl: 8.2,
  },
  {
    id: 'pos-3',
    mint: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    amount: 5.5,
    avgEntryPrice: 180.0,
    currentPrice: 185.5,
    unrealizedPnl: 30.25,
    realizedPnl: 42.0,
  },
];

export const PositionsTable = () => {
  const formatCurrency = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value: number) => {
    return value.toFixed(4);
  };

  return (
    <div className="p-4 bg-surface-elevated rounded-sm border border-border">
      <h2 className="text-lg font-semibold mb-3">Open Positions</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="pb-2 px-2">Token</th>
              <th className="pb-2 px-2 text-right">Amount</th>
              <th className="pb-2 px-2 text-right">Entry Price</th>
              <th className="pb-2 px-2 text-right">Current Price</th>
              <th className="pb-2 px-2 text-right">Unrealized PNL</th>
              <th className="pb-2 px-2 text-right">Realized PNL</th>
            </tr>
          </thead>
          <tbody>
            {mockPositions.map((position) => (
              <tr key={position.id} className="border-b border-border/50">
                <td className="py-3 px-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
                      {position.symbol[0]}
                    </span>
                    <span className="font-medium">{position.symbol}</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-right font-mono">
                  {formatNumber(position.amount)} {position.symbol}
                </td>
                <td className="py-3 px-2 text-right font-mono">
                  ${position.avgEntryPrice.toFixed(2)}
                </td>
                <td className="py-3 px-2 text-right font-mono">
                  ${position.currentPrice.toFixed(2)}
                </td>
                <td className="py-3 px-2 text-right font-mono">
                  <span className={position.unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                    ${position.unrealizedPnl.toFixed(2)}
                  </span>
                </td>
                <td className="py-3 px-2 text-right font-mono text-green-500">
                  ${position.realizedPnl.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};