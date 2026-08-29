'use client';

import { useState } from 'react';
import { Play, Pause, Trash2 } from 'lucide-react';
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

const initialSessions: Session[] = [
  {
    id: '1',
    name: 'aggressive-snipes-01',
    strategy: 'sniping',
    budget: '5.00',
    spent: '2.34',
    status: 'active',
    pnl: '+2.31 SOL',
  },
  {
    id: '2',
    name: 'defensive-basis-02',
    strategy: 'basis',
    budget: '3.00',
    spent: '0.12',
    status: 'paused',
    pnl: '+0.04 SOL',
  },
];

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);

  const toggle = (id: string) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === id
          ? { ...session, status: session.status === 'active' ? 'paused' : 'active' }
          : session
      )
    );
  };

  const remove = (id: string) => {
    setSessions((prev) => prev.filter((session) => session.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-tight text-[color:var(--text-primary)]">Sessions</h1>
          <p className="mt-1 font-mono text-xs text-[color:var(--text-secondary)]">
            Manage active and paused trading sessions.
          </p>
        </div>
        <FeatureGate requiredTier="monthly">
          <button
            type="button"
            className="inline-flex min-h-[36px] items-center gap-2 border border-obsidian-border px-3 font-mono text-xs text-[color:var(--text-secondary)] transition-colors hover:border-gold hover:text-gold"
          >
            new session
          </button>
        </FeatureGate>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-b border-obsidian-border/60 text-left text-[color:var(--text-muted)]">
              <th className="px-4 py-2 font-normal">session</th>
              <th className="px-4 py-2 font-normal">strategy</th>
              <th className="px-4 py-2 font-normal">budget</th>
              <th className="px-4 py-2 font-normal">pnl</th>
              <th className="px-4 py-2 font-normal text-right">status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-obsidian-border/40">
            {sessions.map((session) => (
              <tr key={session.id} className="transition-colors hover:bg-obsidian-elevated">
                <td className="px-4 py-2.5 text-[color:var(--text-primary)]">{session.name}</td>
                <td className="px-4 py-2.5 text-[color:var(--text-secondary)]">
                  {session.strategy}
                </td>
                <td className="px-4 py-2.5 text-[color:var(--text-secondary)]">
                  {session.spent} / {session.budget}
                </td>
                <td
                  className={`px-4 py-2.5 ${
                    session.pnl.startsWith('+') ? 'text-success' : 'text-error'
                  }`}
                >
                  {session.pnl}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="mt-2 flex items-center justify-end gap-1">
                    <FeatureGate requiredTier="monthly">
                      <button
                        type="button"
                        onClick={() => toggle(session.id)}
                        className="inline-flex items-center gap-0.5 border border-obsidian-border px-2 py-1 font-mono text-[10px] text-[color:var(--text-secondary)] transition-colors hover:border-gold hover:text-gold"
                      >
                        {session.status === 'active' ? (
                          <>
                            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                            pause session
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" aria-hidden="true" />
                            play session
                          </>
                        )}
                      </button>
                    </FeatureGate>
                    <FeatureGate requiredTier="monthly">
                      <button
                        type="button"
                        onClick={() => remove(session.id)}
                        className="inline-flex items-center gap-0.5 border border-obsidian-border px-2 py-1 font-mono text-[10px] text-[color:var(--text-secondary)] transition-colors hover:border-error hover:text-error"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
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
