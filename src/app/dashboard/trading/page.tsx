'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Play, Pause, Trash2, Plus } from 'lucide-react';
import { FeatureGate } from '@/app/dashboard/components/FeatureGate';

type Session = {
  id: string;
  name: string;
  strategy: string;
  budget: string;
  spent: string;
  pnl: string;
  status: 'active' | 'paused';
};

const sessions: Session[] = [
  { id: '1', name: 'aggressive-snipes-01', strategy: 'MEV', budget: '5.0 SOL', spent: '2.34 SOL', pnl: '+0.89 SOL', status: 'active' },
  { id: '2', name: 'conservative-dca-02', strategy: 'DCA', budget: '10.0 SOL', spent: '4.12 SOL', pnl: '-0.23 SOL', status: 'paused' },
];

export default function TradingPage() {
  const [items, setItems] = useState<Session[]>(sessions);

  const toggle = (id: string) => setItems((prev) =>
    prev.map((s) => (s.id === id ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s)),
  );
  const remove = (id: string) => setItems((prev) => prev.filter((s) => s.id !== id));

  return (
    <div className="space-y-px">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-[color:var(--text-muted)]">trading</p>
          <h2 className="mt-1 font-mono text-sm font-bold text-[color:var(--text-primary)]">sessions</h2>
          <p className="mt-0.5 font-mono text-xs text-[color:var(--text-muted)]">
            {items.length} total · {items.filter((s) => s.status === 'active').length} active
          </p>
        </div>
        <FeatureGate requiredTier="monthly">
          <Link
            href="/dashboard/trading"
            className="inline-flex min-h-[36px] items-center gap-2 border border-obsidian-border px-3 font-mono text-xs text-[color:var(--text-secondary)] transition-colors hover:border-gold hover:text-gold"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            new session
          </Link>
        </FeatureGate>
      </div>

      {/* Sessions table/cards */}
      <div className="border border-obsidian-border bg-obsidian-surface">
        {/* Desktop table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-obsidian-border text-left text-[color:var(--text-muted)]">
                <th className="px-3 py-2 font-normal">name</th>
                <th className="px-2 py-2 font-normal">strategy</th>
                <th className="px-2 py-2 font-normal text-right">budget</th>
                <th className="px-2 py-2 font-normal text-right">spent</th>
                <th className="px-2 py-2 font-normal text-right">pnl</th>
                <th className="px-2 py-2 font-normal">status</th>
                <th className="px-3 py-2 font-normal text-right">actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-obsidian-border/40">
              {items.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-obsidian-elevated">
                  <td className="px-3 py-2.5 text-[color:var(--text-primary)]">{s.name}</td>
                  <td className="px-2 py-2.5">
                    <span className="border border-obsidian-border px-1.5 py-0.5 text-gold">{s.strategy}</span>
                  </td>
                  <td className="px-2 py-2.5 text-right text-[color:var(--text-secondary)]">{s.budget}</td>
                  <td className="px-2 py-2.5 text-right text-[color:var(--text-secondary)]">{s.spent}</td>
                  <td className={`px-2 py-2.5 text-right ${s.pnl.startsWith('+') ? 'text-success' : 'text-error'}`}>{s.pnl}</td>
                  <td className="px-2 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 ${s.status === 'active' ? 'text-success' : 'text-[color:var(--text-muted)]'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.status === 'active' ? 'bg-success' : 'bg-[color:var(--text-muted)]'}`} />
                      {s.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <FeatureGate requiredTier="monthly">
                        <button
                          type="button"
                          onClick={() => toggle(s.id)}
                          className="inline-flex items-center gap-0.5 border border-obsidian-border px-2 py-1 font-mono text-xs text-[color:var(--text-secondary)] transition-colors hover:border-gold hover:text-gold"
                        >
                          {s.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          {s.status === 'active' ? 'Pause' : 'Play'}
                        </button>
                      </FeatureGate>
                      <FeatureGate requiredTier="monthly">
                        <button
                          type="button"
                          onClick={() => remove(s.id)}
                          className="inline-flex items-center gap-0.5 border border-obsidian-border px-2 py-1 font-mono text-xs text-[color:var(--text-secondary)] transition-colors hover:border-error hover:text-error"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> remove
                        </button>
                      </FeatureGate>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-[color:var(--text-muted)]">
                    no sessions yet. create one to start trading.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden">
          {items.map((s) => (
            <div key={s.id} className="border-b border-obsidian-border/40 last:border-b-0 px-3 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-bold text-[color:var(--text-primary)]">{s.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-[color:var(--text-muted)]">{s.strategy}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 font-mono text-xs ${s.status === 'active' ? 'text-success' : 'text-[color:var(--text-muted)]'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.status === 'active' ? 'bg-success' : 'bg-[color:var(--text-muted)]'}`} />
                  {s.status}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-[color:var(--text-muted)]">budget</p>
                  <p className="mt-0.5 font-mono text-xs text-[color:var(--text-secondary)]">{s.budget}</p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-[color:var(--text-muted)]">spent</p>
                  <p className="mt-0.5 font-mono text-xs text-[color:var(--text-secondary)]">{s.spent}</p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-[color:var(--text-muted)]">pnl</p>
                  <p className={`mt-0.5 font-mono text-xs ${s.pnl.startsWith('+') ? 'text-success' : 'text-error'}`}>{s.pnl}</p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-[color:var(--text-muted)]">session</p>
                  <p className="mt-0.5 font-mono text-xs text-[color:var(--text-secondary)]">{s.status}</p>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-end gap-1">
                <FeatureGate requiredTier="monthly">
                  <button
                    type="button"
                    onClick={() => toggle(s.id)}
                    className="inline-flex items-center gap-0.5 border border-obsidian-border px-2 py-1 font-mono text-xs text-[color:var(--text-secondary)] transition-colors hover:border-gold hover:text-gold"
                  >
                    {s.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {s.status === 'active' ? 'Pause' : 'Play'}
                  </button>
                </FeatureGate>
                <FeatureGate requiredTier="monthly">
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    className="inline-flex items-center gap-0.5 border border-obsidian-border px-2 py-1 font-mono text-xs text-[color:var(--text-secondary)] transition-colors hover:border-error hover:text-error"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> remove
                  </button>
                </FeatureGate>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="px-3 py-8 text-center text-[color:var(--text-muted)]">
              no sessions yet. create one to start trading.
            </div>
          )}
        </div>
      </div>

      <p className="font-mono text-xs text-[color:var(--text-muted)]">
        sessions are time-boxed. the circuit breaker halts trading when your loss limit trips.
      </p>
    </div>
  );
}
