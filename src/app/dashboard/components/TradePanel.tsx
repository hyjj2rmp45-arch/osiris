'use client';

import { useState } from 'react';
import { ArrowDownUp } from 'lucide-react';

const slippages = ['0.1%', '0.5%', '1.0%'] as const;

export default function TradePanel() {
  const [from, setFrom] = useState('SOL');
  const [to, setTo] = useState('BONK');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState<(typeof slippages)[number]>('0.5%');

  return (
    <section aria-label="Quick trade panel" className="rounded-sm border border-obsidian-border bg-obsidian-elevated p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Quick trade</h3>
        <span className="font-mono text-[10px] text-[color:var(--text-muted)]">Demo mode</span>
      </div>

      <form className="mt-5 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[color:var(--text-muted)]">From</span>
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-sm border border-obsidian-border bg-obsidian-surface px-3 py-2 font-mono text-sm focus:border-gold-dim focus:outline-none"
              aria-label="From token"
            />
          </label>
          <button
            type="button"
            aria-label="Swap tokens"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
            className="mb-0.5 rounded-sm p-2 text-gold transition-colors hover:bg-gold/10"
          >
            <ArrowDownUp aria-hidden="true" className="h-4 w-4" />
          </button>
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[color:var(--text-muted)]">To</span>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-sm border border-obsidian-border bg-obsidian-surface px-3 py-2 font-mono text-sm focus:border-gold-dim focus:outline-none"
              aria-label="To token"
            />
          </label>
        </div>

        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[color:var(--text-muted)]">Amount</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-sm border border-obsidian-border bg-obsidian-surface px-3 py-2 font-mono text-sm focus:border-gold-dim focus:outline-none"
          />
        </label>

        <fieldset>
          <legend className="font-mono text-[11px] uppercase tracking-wider text-[color:var(--text-muted)]">Slippage</legend>
          <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Slippage tolerance">
            {slippages.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={slippage === s}
                onClick={() => setSlippage(s)}
                className={`min-h-[44px] rounded-sm border py-2 font-mono text-sm transition-colors ${
                  slippage === s
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-obsidian-border text-[color:var(--text-secondary)] hover:border-gold-dim'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={!amount || Number(amount) <= 0}
          className="min-h-[44px] w-full rounded-sm bg-gold py-3 font-semibold text-obsidian transition-colors hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
        >
          Execute
        </button>
      </form>
    </section>
  );
}
