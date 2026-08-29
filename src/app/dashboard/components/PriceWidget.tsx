'use client';

import { useState, useEffect } from 'react';

interface PriceState {
  priceUsd: number | null;
  source: string | null;
  error: string | null;
  loading: boolean;
}

export function PriceWidget({ mint = 'So11111111111111111111111111111111111111112' }: { mint?: string }) {
  const [state, setState] = useState<PriceState>({
    priceUsd: null,
    source: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/prices?mint=${encodeURIComponent(mint)}`);
        const data = await res.json();
        if (!cancelled) {
          setState({
            priceUsd: data.price?.priceUsd ?? null,
            source: data.price?.source ?? null,
            error: null,
            loading: false,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            priceUsd: null,
            source: null,
            error: 'Price unavailable',
            loading: false,
          });
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [mint]);

  return (
    <div className="p-4 bg-surface-elevated border border-border rounded-sm">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">SOL Price</h3>
      {state.loading && <p className="text-sm">Loading...</p>}
      {!state.loading && state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {!state.loading && !state.error && state.priceUsd !== null && (
        <div className="text-xl font-semibold">
          ${state.priceUsd.toFixed(2)}
          <span className="ml-2 text-xs text-muted-foreground">{state.source}</span>
        </div>
      )}
    </div>
  );
}
