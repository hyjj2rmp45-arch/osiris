'use client';

import { useState } from 'react';
import { FeatureGate } from '@/app/dashboard/components/FeatureGate';

type Alert = {
  id: string;
  level: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  time: string;
  acknowledged: boolean;
};

const initialAlerts: Alert[] = [
  {
    id: '1',
    level: 'error',
    title: 'Circuit breaker triggered',
    message: 'Daily loss limit reached for session aggressive-snipes-01. Trading halted.',
    time: '14:32:01',
    acknowledged: false,
  },
  {
    id: '2',
    level: 'warning',
    title: 'Slippage warning',
    message: 'SOL/USDC order executed at 0.8% slippage, above 0.5% threshold.',
    time: '14:28:44',
    acknowledged: false,
  },
  {
    id: '3',
    level: 'info',
    title: 'MEV protection activated',
    message: 'Private routing path used for JUP/USDC buy order.',
    time: '14:18:47',
    acknowledged: true,
  },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);

  const acknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, acknowledged: true } : alert
      )
    );
  };

  const resolve = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-xl font-bold tracking-tight text-[color:var(--text-primary)]">Alerts</h1>
        <p className="mt-1 font-mono text-xs text-[color:var(--text-secondary)]">
          Security and execution notifications from your trading sessions.
        </p>
      </div>

      <div className="divide-y divide-obsidian-border/60">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start justify-between gap-4 px-4 py-3 transition-colors ${
              alert.acknowledged ? 'opacity-60' : 'hover:bg-obsidian-elevated'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider ${
                    alert.level === 'error'
                      ? 'text-error'
                      : alert.level === 'warning'
                        ? 'text-warning'
                        : 'text-[color:var(--text-muted)]'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {alert.level}
                </span>
                <span className="font-mono text-sm font-bold text-[color:var(--text-primary)]">
                  {alert.title}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-[color:var(--text-secondary)]">
                {alert.message}
              </p>
              <p className="mt-1 font-mono text-[10px] text-[color:var(--text-muted)]">
                {alert.time}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!alert.acknowledged && (
                <FeatureGate requiredTier="monthly">
                  <button
                    type="button"
                    onClick={() => acknowledge(alert.id)}
                    className="inline-flex items-center gap-1.5 border border-obsidian-border px-3 py-1.5 font-mono text-[11px] text-[color:var(--text-secondary)] transition-colors hover:border-gold hover:text-gold"
                  >
                    acknowledge
                  </button>
                </FeatureGate>
              )}
              <FeatureGate requiredTier="monthly">
                <button
                  type="button"
                  onClick={() => resolve(alert.id)}
                  className="inline-flex items-center gap-1.5 border border-obsidian-border px-3 py-1.5 font-mono text-[11px] text-[color:var(--text-secondary)] transition-colors hover:border-gold hover:text-gold"
                >
                  dismiss
                </button>
              </FeatureGate>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
