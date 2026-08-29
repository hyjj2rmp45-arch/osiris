/**
 * OSIRIS Tier Context — fetches tier from server-side /api/me
 * Replaces localStorage-based tier storage.
 */
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Tier = 'monthly' | 'lifetime';
export type UserRole = 'user' | 'tester' | 'admin' | 'support';

export interface OsirisUser {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  tier: Tier;
  currentPeriodEnd: string | null;
  autoRenew: boolean;
}

interface TierContextValue {
  tier: Tier;
  user: OsirisUser | null;
  loading: boolean;
  setTier: (tier: Tier) => Promise<void>;
  reset: () => Promise<void>;
  refresh: () => Promise<void>;
}

const TierContext = createContext<TierContextValue | undefined>(undefined);

export function TierProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<OsirisUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/me', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          return;
        }
      }
      // Not authenticated - default to 'monthly' for unauthenticated users
      setUser(null);
    } catch (err) {
      // Network error - keep current state
      console.error('[TierContext] Failed to fetch /api/me:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setTier = useCallback(
    async (next: Tier) => {
      if (!user) return;
      // Optimistic update
      setUser({ ...user, tier: next });
      // In production, would call /api/subscription/change
    },
    [user]
  );

  const reset = useCallback(async () => {
    // Logout
    try {
      await fetch('/api/auth/telegram', { method: 'DELETE', credentials: 'include' });
    } catch (err) {
      console.error('[TierContext] Failed to logout:', err);
    }
    setUser(null);
  }, []);

  const tier: Tier = user?.tier ?? 'monthly';

  return (
    <TierContext.Provider value={{ tier, user, loading, setTier, reset, refresh }}>
      {children}
    </TierContext.Provider>
  );
}

export function useTier() {
  const ctx = useContext(TierContext);
  if (!ctx) {
    return {
      tier: 'monthly' as Tier,
      user: null,
      loading: true,
      setTier: async () => {},
      reset: async () => {},
      refresh: async () => {},
    };
  }
  return ctx;
}
