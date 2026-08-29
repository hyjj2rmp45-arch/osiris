'use client';

import { useState, useEffect } from 'react';

interface TaxLot {
  id: number;
  mint: string;
  amount: number;
  costBasis: number;
  acquisitionDate: string;
  isClosed: boolean;
}

interface TaxLotsState {
  lots: TaxLot[];
  error: string | null;
  loading: boolean;
}

export function TaxLotsWidget({ userId = '1', mint }: { userId?: string; mint?: string }) {
  const [state, setState] = useState<TaxLotsState>({
    lots: [],
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const params = new URLSearchParams({ userId });
        if (mint) params.set('mint', mint);
        const res = await fetch(`/api/tax-lots?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) {
          setState({
            lots: data.lots ?? [],
            error: null,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            lots: [],
            error: 'Tax lots unavailable',
            loading: false,
          });
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId, mint]);

  return (
    <div className="p-4 bg-surface-elevated border border-border rounded-sm">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">Tax Lots (FIFO)</h3>
      {state.loading && <p className="text-sm">Loading...</p>}
      {!state.loading && state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {!state.loading && !state.error && (
        <div className="space-y-2">
          {state.lots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tax lots found.</p>
          ) : (
            <ul className="text-xs space-y-1">
              {state.lots.map((lot, idx) => (
                <li key={lot.id} className="flex justify-between">
                  <span className="font-mono">{lot.mint.slice(0, 6)}…{lot.mint.slice(-4)}</span>
                  <span>{lot.amount.toFixed(4)} @ {lot.costBasis.toFixed(6)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
