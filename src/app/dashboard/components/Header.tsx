'use client';

import { useState } from 'react';
import { Bell, Wallet, Activity, Zap, Shield } from 'lucide-react';
import PaperTradingToggle from './PaperTradingToggle';
import TierPricing from './TierPricing';
import { useFeatureGate } from '@/hooks/useFeatureGate';

type Notification = {
  id: string;
  label: string;
  description: string;
};

const notifications: Notification[] = [
  { id: '1', label: 'Circuit breaker triggered', description: 'Daily loss limit reached for aggressive-snipes-01.' },
  { id: '2', label: 'Slippage warning', description: 'SOL/USDC execution above 0.5% threshold.' },
];

export default function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, role } = useFeatureGate();

  return (
    <header className="flex items-center justify-between border-b border-obsidian-border bg-obsidian-surface/60 px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-gold" aria-hidden="true" />
          <span className="font-mono text-sm font-bold text-gold">OSIRIS</span>
        </div>
        <span className="hidden font-mono text-[10px] text-[color:var(--text-muted)] sm:block">
          mainnet-beta
        </span>

        {(role === 'admin' || role === 'tester') && (
          <span className="inline-flex items-center gap-1 border border-gold/40 px-2 py-0.5 font-mono text-[10px] text-gold">
            <Shield className="h-3 w-3" aria-hidden="true" />
            {role}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <PaperTradingToggle />
        <TierPricing />

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications((prev) => !prev)}
            className="inline-flex items-center gap-2 border border-obsidian-border px-2.5 py-1.5 font-mono text-[11px] text-[color:var(--text-secondary)] transition-colors hover:border-gold hover:text-gold"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">alerts</span>
            {notifications.length > 0 && (
              <span className="ml-1 rounded-sm bg-error px-1.5 py-0.5 font-mono text-[10px] text-white">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 border border-obsidian-border bg-obsidian-surface p-3 shadow-lg">
              <p className="font-mono text-xs font-bold text-[color:var(--text-primary)]">Notifications</p>
              <div className="mt-2 divide-y divide-obsidian-border/60">
                {notifications.map((notification) => (
                  <div key={notification.id} className="py-2">
                    <p className="font-mono text-xs font-bold text-[color:var(--text-primary)]">
                      {notification.label}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-[color:var(--text-secondary)]">
                      {notification.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
