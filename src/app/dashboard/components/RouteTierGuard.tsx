'use client';

import { useEffect } from 'react';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { useRouter, usePathname } from 'next/navigation';

type Tier = 'monthly' | 'lifetime';
type Role = 'user' | 'tester' | 'admin' | 'support';

interface TierGuardOptions {
  requiredTier?: Tier;
  requiredRole?: Role;
  returnTo?: string;
}

export function TierGuard({ children, requiredTier = 'monthly', requiredRole }: { children: React.ReactNode } & TierGuardOptions) {
  const { canAccess, isRole, redirectToUpgrade } = useFeatureGate();
  const router = useRouter();
  const pathname = usePathname();

  const hasTierAccess = canAccess(requiredTier);
  const hasRoleAccess = requiredRole ? isRole(requiredRole) : true;
  const allowed = hasTierAccess && hasRoleAccess;

  useEffect(() => {
    if (!allowed) {
      redirectToUpgrade(pathname ?? '/');
    }
  }, [allowed, redirectToUpgrade, pathname]);

  if (!allowed) return null;
  return <>{children}</>;
}
