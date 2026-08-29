'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Settings, Wallet, Activity } from 'lucide-react';

const nav = [
  { href: '/dashboard', label: 'Overview', icon: Activity },
  { href: '/dashboard/trading', label: 'Trading', icon: Wallet },
  { href: '/dashboard/copy-trading', label: 'Copy Trading', icon: Wallet },
  { href: '/dashboard/alerts', label: 'Alerts', icon: Bell, showBadge: true },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="space-y-1">
      {nav.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 font-mono text-xs transition-colors ${
              active
                ? 'border-l-2 border-gold bg-gold/10 text-gold'
                : 'border-l-2 border-transparent text-[color:var(--text-secondary)] hover:border-gold/60 hover:text-gold'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{item.label}</span>
            {item.showBadge && (
              <span className="ml-auto rounded-sm border border-obsidian-border px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--text-muted)]">
                2
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
