'use client';

import { useRouter } from 'next/navigation';
import { useFeatureGate } from '@/hooks/useFeatureGate';

export function UpgradePrompt({ returnTo }: { returnTo?: string }) {
  const router = useRouter();
  const { upgradeHref } = useFeatureGate();

  const goUpgrade = () => {
    router.push(upgradeHref(returnTo));
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 border border-obsidian-border bg-obsidian-surface p-6 text-center">
      <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">upgrade required</p>
      <h2 className="font-mono text-lg font-bold text-[color:var(--text-primary)]">This feature is locked</h2>
      <p className="font-mono text-xs text-[color:var(--text-secondary)]">
        Select a tier to unlock live trading, copy trading, and advanced controls.
      </p>
      <button
        type="button"
        onClick={goUpgrade}
        className="inline-flex min-h-[40px] items-center justify-center gap-2 bg-gold px-4 py-2 font-mono text-xs font-bold text-obsidian transition-colors hover:bg-gold-bright"
      >
        View pricing
      </button>
    </div>
  );
}
