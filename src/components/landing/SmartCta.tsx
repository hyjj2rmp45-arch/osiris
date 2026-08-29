"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTier } from '@/contexts/TierContext';

export default function SmartCta() {
  const { user } = useTier();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const hasSubscription = !!user;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      {!mounted ? (
        <span className="text-[10px] font-mono text-[color:var(--text-muted)] animate-pulse">
          authenticating...
        </span>
      ) : hasSubscription ? (
        <Link
          href="/dashboard"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 bg-gold px-6 py-2.5 font-mono text-sm font-bold text-obsidian transition-all hover:bg-gold-bright hover:shadow-[0_0_24px_rgba(212,175,55,0.3)]"
        >
          Open terminal <span aria-hidden="true">&rarr;</span>
        </Link>
      ) : (
        <Link
          href="/select-tier?tier=monthly"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 bg-gold px-6 py-2.5 font-mono text-sm font-bold text-obsidian transition-all hover:bg-gold-bright hover:shadow-[0_0_24px_rgba(212,175,55,0.3)]"
        >
          Start trading <span aria-hidden="true">&rarr;</span>
        </Link>
      )}
    </div>
  );
}