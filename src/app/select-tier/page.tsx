'use client';

import Link from 'next/link';

export default function SelectTierPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian px-4">
      <div className="w-full max-w-md border border-obsidian-border bg-obsidian-surface p-6">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">
          Choose your plan
        </p>
        <h1 className="mt-2 font-mono text-xl font-bold text-[color:var(--text-primary)]">
          Start trading on OSIRIS
        </h1>
        <p className="mt-2 font-mono text-xs text-[color:var(--text-secondary)]">
          Select a subscription tier to continue to payment.
        </p>

        <div className="mt-6 space-y-3">
          <Link
            href="/select-tier/monthly"
            className="flex items-center justify-between border border-obsidian-border bg-obsidian-elevated p-4 transition-colors hover:border-gold"
          >
            <div>
              <p className="font-mono text-sm font-bold text-[color:var(--text-primary)]">Monthly</p>
              <p className="font-mono text-xs text-[color:var(--text-muted)]">0.3 SOL / month</p>
            </div>
            <span className="font-mono text-xs text-gold">&rarr;</span>
          </Link>

          <Link
            href="/select-tier/lifetime"
            className="flex items-center justify-between border border-obsidian-border bg-obsidian-elevated p-4 transition-colors hover:border-gold"
          >
            <div>
              <p className="font-mono text-sm font-bold text-[color:var(--text-primary)]">Lifetime</p>
              <p className="font-mono text-xs text-[color:var(--text-muted)]">1.0 SOL one-time</p>
            </div>
            <span className="font-mono text-xs text-gold">&rarr;</span>
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/#pricing"
            className="font-mono text-xs text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]"
          >
            &larr; Back to pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
