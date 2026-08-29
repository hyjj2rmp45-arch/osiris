'use client';

export const WalletBalances = () => {
  return (
    <div className="space-y-4 p-4 bg-surface-elevated rounded-sm border border-border">
      <h2 className="text-lg font-semibold mb-3">Wallet Balances</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center p-3 bg-surface border rounded-sm">
          <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
            SOL
          </div>
          <div className="flex-1 ml-3">
            <p className="text-sm font-medium text-muted-foreground">SOL Balance</p>
            <p className="text-lg font-semibold text-body">12.5 SOL</p>
          </div>
          <div className="text-sm text-primary">
            +2.3%
          </div>
        </div>
        <div className="flex items-center p-3 bg-surface border rounded-sm">
          <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
            USDC
          </div>
          <div className="flex-1 ml-3">
            <p className="text-sm font-medium text-muted-foreground">USDC Balance</p>
            <p className="text-lg font-semibold text-body">1,250.00 USDC</p>
          </div>
          <div className="text-sm text-primary">
            +0.5%
          </div>
        </div>
        <div className="flex items-center p-3 bg-surface border rounded-sm">
          <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
            USDT
          </div>
          <div className="flex-1 ml-3">
            <p className="text-sm font-medium text-muted-foreground">USDT Balance</p>
            <p className="text-lg font-semibold text-body">800.00 USDT</p>
          </div>
          <div className="text-sm text-primary">
            +0.1%
          </div>
        </div>
      </div>
    </div>
  );
};