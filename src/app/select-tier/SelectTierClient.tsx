'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const tierMeta: Record<string, { name: string; cta: string }> = {
  monthly: { name: 'Monthly', cta: 'Start monthly plan' },
  lifetime: { name: 'Lifetime', cta: 'Unlock lifetime' },
};

export default function SelectTierClient() {
  const search = useSearchParams();
  const router = useRouter();
  const tier = ((search?.get('tier') || 'monthly') as 'monthly' | 'lifetime');

  const handleStart = () => {
    // Go directly to payment page instead of dashboard
    router.push(`/select-tier/${tier}`);
  };

  const meta = {
    monthly: { name: 'Monthly', cta: 'Start monthly plan' },
    lifetime: { name: 'Lifetime', cta: 'Unlock lifetime' },
  }[tier];

  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian px-4">
      <div className="w-full max-w-md border border-obsidian-border bg-obsidian-surface p-6">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">Select tier</p>
        <h1 className="mt-2 font-mono text-xl font-bold text-[color:var(--text-primary)]">{meta.name}</h1>
        <p className="mt-2 font-mono text-xs text-[color:var(--text-secondary)]">
          Confirm your choice to continue to payment.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleStart}
            className="inline-flex min-h-[40px] items-center justify-center gap-2 bg-gold px-4 py-2 font-mono text-xs font-bold text-obsidian transition-colors hover:bg-gold-bright"
          >
            {meta.cta}
          </button>
          <button
            type="button"
            onClick={() => router.replace('/#pricing')}
            className="inline-flex min-h-[40px] items-center justify-center gap-2 border border-obsidian-border px-4 py-2 font-mono text-xs text-[color:var(--text-secondary)] transition-colors hover:border-gold hover:text-gold"
          >
            back
          </button>
        </div>
      </div>
    </div>
  );
}
