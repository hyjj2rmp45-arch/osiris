'use client';

import { useAuthStore } from '@/lib/stores/use-auth-store';
import { useTrustTier } from '@/lib/hooks/use-trust-tier';

export const UserInfo = () => {
  const { user, logout } = useAuthStore();
  const tier = useTrustTier();

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-sm font-medium text-primary">
          {user.firstName?.[0] || user.username?.[0] || 'U'}
        </span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-body">
          {user.firstName || user.username || 'User'}
        </p>
        <p className="text-xs text-muted-foreground">
          Tier: {tier.tier} · Role: {user.role}
        </p>
      </div>
      <button
        onClick={logout}
        className="text-sm text-muted-foreground hover:text-body transition-colors"
        aria-label="Logout"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M17 16l4-4m0 0l-4-4m4 4V7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3 11V9a4 4 0 014-4h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  );
};