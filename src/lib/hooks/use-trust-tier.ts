import { useAuthStore } from '@/lib/stores/use-auth-store';

/**
 * Hook to check user's trust tier and enforce access control
 * Trust tiers:
 * - Tier 0 (Telegram alone): read-only + panic button
 * - Tier 1 (Telegram + active web session): trade within limits
 * - Tier 2 (passkey re-auth required): raise limits, change targets
 * - Tier 3 (passkey + 24h delay): transfer destinations, disable MFA, /halt and /resume commands
 */

export const useTrustTier = () => {
  const { user } = useAuthStore();

  // If not authenticated, return tier 0 (read-only)
  if (!user) {
    return {
      tier: 'tier-0' as const,
      canTrade: false,
      canModifyLimits: false,
      canWithdraw: false,
      canDisableSecurity: false,
      requiresReauthForTrading: true,
      requiresReauthForSettings: true,
    };
  }

  // Map from stored tier to capabilities
  const tierCapabilities = {
    monthly: {
      tier: 'tier-1' as const,
      canTrade: true,
      canModifyLimits: false,
      canWithdraw: false,
      canDisableSecurity: false,
      requiresReauthForTrading: false,
      requiresReauthForSettings: true,
    },
    lifetime: {
      tier: 'tier-2' as const,
      canTrade: true,
      canModifyLimits: true,
      canWithdraw: true,
      canDisableSecurity: false,
      requiresReauthForTrading: false,
      requiresReauthForSettings: false,
    },
  };

  return {
    ...tierCapabilities[user.tier as keyof typeof tierCapabilities],
    userId: user.id,
    telegramId: user.telegramId,
    username: user.username,
    role: user.role,
  };
};

/**
 * Helper to check if user can perform an action based on trust tier
 */
export const canPerformAction = (tier: ReturnType<typeof useTrustTier>, action: keyof Omit<ReturnType<typeof useTrustTier>, 'userId' | 'telegramId' | 'username' | 'role'>) => {
  return tier[action];
};