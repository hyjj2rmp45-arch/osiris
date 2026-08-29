'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Play, Pause, Trash2, Plus } from 'lucide-react';
import { FeatureGate } from '@/app/dashboard/components/FeatureGate';

type Target = {
  id: string;
  address: string;
  label: string;
  allocation: string;
  status: 'active' | 'paused';
  pnl: string;
};

const initialTargets: Target[] = [
  {
    id: '1',
    address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    label: 'whale-01',
    allocation: '25%',
    status: 'active',
    pnl: '+1.24 SOL',
  },
  {
    id: '2',
    address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    label: 'sniper-x',
    allocation: '15%',
    status: 'paused',
    pnl: '-0.08 SOL',
  },
];

export default function CopyTradingPage() {
  const [targets, setTargets] = useState<Target[]>(initialTargets);

  const toggle = (id: string) => {
    setTargets((prev) =>
      prev.map((target) =>
        target.id === id
          ? { ...target, status: target.status === 'active' ? 'paused' : 'active' }
          : target
      )
    );
  };

  const remove = (id: string) => {
    setTargets((prev) => prev.filter((target) => target.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-tight text-[color:var(--text-primary)]">Copy Trading</h1>
          <p className="mt-1 font-mono text-xs text-[color:var(--text-secondary)]">
            Mirror proven wallets with allocation caps and risk controls.
          </p>
        </div>
        <FeatureGate requiredTier="monthly">
          <button
            type="button"
            className="inline-flex min-h-[36px] items-center gap-2 border border-obsidian-border px-3 font-mono text-xs text-[color:var(--text-secondary)] transition-colors hover:border-gold hover:text-gold"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            add target
          </button>
        </FeatureGate>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-b border-obsidian-border/60 text-left text-[color:var(--text-muted)]">
              <th className="px-4 py-2 font-normal">wallet</th>
              <th className="px-4 py-2 font-normal">label</th>
              <th className="px-4 py-2 font-normal">allocation</th>
              <th className="px-4 py-2 font-normal">pnl</th>
              <th className="px-4 py-2 font-normal text-right">status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-obsidian-border/40">
            {targets.map((target) => (
              <tr key={target.id} className="transition-colors hover:bg-obsidian-elevated">
                <td className="px-4 py-2.5">
                  <span className="text-[color:var(--text-primary)]">{target.address.slice(0, 8)}...</span>
                </td>
                <td className="px-4 py-2.5 text-[color:var(--text-secondary)]">{target.label}</td>
                <td className="px-4 py-2.5 text-[color:var(--text-secondary)]">{target.allocation}</td>
                <td
                  className={`px-4 py-2.5 ${
                    target.pnl.startsWith('+') ? 'text-success' : 'text-error'
                  }`}
                >
                  {target.pnl}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="mt-2 flex items-center justify-end gap-1">
                    <FeatureGate requiredTier="monthly">
                      <button
                        type="button"
                        onClick={() => toggle(target.id)}
                        className="inline-flex items-center gap-0.5 border border-obsidian-border px-2 py-1 font-mono text-[10px] text-[color:var(--text-secondary)] transition-colors hover:border-gold hover:text-gold"
                      >
                        {target.status === 'active' ? (
                          <>
                            <Pause className="h-3 w-3" aria-hidden="true" />
                            pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" aria-hidden="true" />
                            play
                          </>
                        )}
                      </button>
                    </FeatureGate>
                    <FeatureGate requiredTier="monthly">
                      <button
                        type="button"
                        onClick={() => remove(target.id)}
                        className="inline-flex items-center gap-0.5 border border-obsidian-border px-2 py-1 font-mono text-[10px] text-[color:var(--text-secondary)] transition-colors hover:border-error hover:text-error"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </FeatureGate>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
