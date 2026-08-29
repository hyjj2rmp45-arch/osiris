'use client';

import { useFeatureGate } from '@/hooks/useFeatureGate';
import { useRouter } from 'next/navigation';

type Tier = 'monthly' | 'lifetime';
type Role = 'user' | 'tester' | 'admin' | 'support';

interface FeatureGateOptions {
  requiredTier?: Tier;
  requiredRole?: Role;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function FeatureGate({ requiredTier = 'monthly', requiredRole, fallback, children }: FeatureGateOptions) {
  const { canAccess, isRole, upgradeHref } = useFeatureGate();
  const router = useRouter();

  const hasTierAccess = canAccess(requiredTier);
  const hasRoleAccess = requiredRole ? isRole(requiredRole) : true;
  const allowed = hasTierAccess && hasRoleAccess;

  if (!allowed) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center border border-obsidian-border bg-obsidian-surface p-6 text-center">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">upgrade required</p>
          <p className="mt-2 font-mono text-xs text-[color:var(--text-secondary)]">
            This action requires an active subscription.
          </p>
          <button
            type="button"
            onClick={() => router.push(upgradeHref('/'))}
            className="mt-3 inline-flex min-h-[36px] items-center gap-2 border border-gold bg-gold/10 px-3 font-mono text-xs text-gold transition-colors hover:bg-gold hover:text-obsidian"
          >
            view pricing
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
