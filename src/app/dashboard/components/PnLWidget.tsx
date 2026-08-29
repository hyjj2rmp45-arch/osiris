'use client';

import { useState, useEffect } from 'react';

interface PnlState {
  realizedPnl: number | null;
  unrealizedPnl: number | null;
  totalFees: number | null;
  error: string | null;
  loading: boolean;
}

export function PnLWidget({ userId = '1', walletId }: { userId?: string; walletId?: string }) {
  const [state, setState] = useState<PnlState>({
    realizedPnl: null,
    unrealizedPnl: null,
    totalFees: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const params = new URLSearchParams({ userId, currentPrice: '0' });
        if (walletId) params.set('walletId', walletId);
        const res = await fetch(`/api/pnl?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) {
          setState({
            realizedPnl: data.realizedPnl ?? null,
            unrealizedPnl: data.unrealizedPnl ?? null,
            totalFees: data.totalFees ?? null,
            error: null,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            realizedPnl: null,
            unrealizedPnl: null,
            totalFees: null,
            error: 'PnL unavailable',
            loading: false,
          });
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId, walletId]);

  return (
    <div className="p-4 bg-surface-elevated border border-border rounded-sm">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">PnL</h3>
      {state.loading && <p className="text-sm">Loading...</p>}
      {!state.loading && state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {!state.loading && !state.error && (
        <div className="text-sm space-y-1">
          <div>Realized: {state.realizedPnl !== null ? state.realizedPnl.toFixed(2) : '-'}</div>
          <div>Unrealized: {state.unrealizedPnl !== null ? state.unrealizedPnl.toFixed(2) : '-'}</div>
          <div>Fees: {state.totalFees !== null ? state.totalFees.toFixed(2) : '-'}</div>
        </div>
      )}
    </div>
  );
}
