'use client';

/* Pricing tier cards for dashboard header — phase 10 tier pricing UI */
import { useTier } from '@/contexts/TierContext';

export default function TierPricing() {
  const { tier, user, loading } = useTier();

  const tierLabel = tier === 'monthly' ? 'Monthly' : 'Lifetime';
  const priceLabel = tier === 'monthly' ? '0.3 SOL/mo' : '1 SOL';
  const isLifetime = tier === 'lifetime';

  if (loading) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="h-3 w-12 animate-pulse rounded bg-obsidian-border" />
        </div>
        <div className="h-6 w-px bg-obsidian-border" aria-hidden="true" />
        <div className="text-right">
          <div className="h-3 w-16 animate-pulse rounded bg-obsidian-border" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {/* Tier label */}
      <div className="text-right">
        <div className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">Tier</div>
        <div className={`font-mono text-sm font-bold ${isLifetime ? 'text-gold' : 'text-[color:var(--text-primary)]'}`}>
          {tierLabel}
        </div>
      </div>

      <div className="h-6 w-px bg-obsidian-border" aria-hidden="true" />

      {/* Price display */}
      <div className="text-right">
        <div className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">Price</div>
        <div className="font-mono text-sm font-bold text-[color:var(--text-primary)]">{priceLabel}</div>
      </div>
    </div>
  );
}
