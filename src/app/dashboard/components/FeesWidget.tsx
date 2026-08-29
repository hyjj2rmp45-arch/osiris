'use client';

import { useState } from 'react';

interface FeeResult {
  computeUnitLimit: number;
  feeLamports: number;
  feePercentage: number;
  source: string;
}

export function FeesWidget() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FeeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function estimate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionType: 'swap', valueLamports: 1_000_000_000, urgency: 'normal' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fee estimate failed');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fee estimate failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 bg-surface-elevated border border-border rounded-sm">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">Fee Estimate</h3>
      <button
        onClick={estimate}
        disabled={loading}
        className="px-3 py-1 text-sm bg-primary text-surface rounded hover:bg-primary-dark disabled:opacity-50"
      >
        {loading ? 'Estimating...' : 'Estimate Fee'}
      </button>
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
      {result && (
        <div className="mt-3 text-sm space-y-1">
          <div>Compute units: {result.computeUnitLimit}</div>
          <div>Fee lamports: {result.feeLamports.toLocaleString()}</div>
          <div>Fee %: {(result.feePercentage * 100).toFixed(4)}%</div>
          <div className="text-muted-foreground">Source: {result.source}</div>
        </div>
      )}
    </div>
  );
}
