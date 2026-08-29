'use client';

import { useTier } from '@/contexts/TierContext';
import type { OsirisUser, UserRole } from '@/contexts/TierContext';
import { useRouter } from 'next/navigation';

type Tier = 'monthly' | 'lifetime';

const upgradeHref = (returnTo?: string) => {
  const base = '/select-tier';
  if (!returnTo) return base;
  return `${base}?returnTo=${encodeURIComponent(returnTo)}`;
};

export function useFeatureGate() {
  const { tier, user, loading } = useTier();

  // Fail-closed: no authenticated user means NO access regardless of tier default.
  const canAccess = (requiredTier: Tier): boolean => {
    if (!user) return false;
    const order: Record<Tier, number> = { monthly: 0, lifetime: 1 };
    return order[tier] >= order[requiredTier];
  };

  // Admin and tester bypass all tier gates.
  const hasRoleBypass = user?.role === 'admin' || user?.role === 'tester';

  const isRole = (role: UserRole): boolean => {
    if (!user || loading) return false;
    if (hasRoleBypass) return true;
    return user.role === role;
  };

  const redirectToUpgrade = (returnTo?: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = upgradeHref(returnTo);
    }
  };

  return {
    tier,
    user: user as OsirisUser | null,
    role: (user?.role ?? 'user') as UserRole,
    loading,
    canAccess: (requiredTier: Tier) => canAccess(requiredTier) || hasRoleBypass,
    isRole,
    redirectToUpgrade,
    upgradeHref,
  };
}
