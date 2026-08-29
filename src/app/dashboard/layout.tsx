'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import SidebarNav from './components/SidebarNav';
import Header from './components/Header';
import { CommandPalette } from './components/CommandPalette';
import { TierGuard } from './components/RouteTierGuard';
import { TierProvider } from '@/contexts/TierContext';

function LivePulse() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] text-[color:var(--text-muted)]">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inset-0 rounded-full bg-success opacity-75 animate-ping" />
        <span className="relative rounded-full bg-success" />
      </span>
      <span>live</span>
      <span>{secs}s</span>
    </div>
  );
}

/** Terminal-path breadcrumb: ~/osiris/dashboard/sessions */
function TerminalPath() {
  const pathname = usePathname() ?? '/dashboard';
  const parts = pathname.split('/').filter(Boolean);
  return (
    <p className="font-mono text-xs text-[color:var(--text-muted)]" aria-label="Current path">
      ~/{parts.join('/')}
      <span className="ml-1 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-gold" aria-hidden="true" />
    </p>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <TierProvider>
      <div className="flex min-h-screen bg-obsidian">
        <SidebarNav />
        <div className="flex flex-1 flex-col">
          <Header />
          <div className="flex items-center justify-between border-b border-obsidian-border bg-obsidian-light px-4 py-1.5">
            <TerminalPath />
            <div className="flex items-center gap-4">
              <LivePulse />
            </div>
          </div>
          <main className="flex-1 overflow-y-auto p-4">
            <TierGuard>{children}</TierGuard>
          </main>
        </div>
        <CommandPalette />
      </div>
    </TierProvider>
  );
}
