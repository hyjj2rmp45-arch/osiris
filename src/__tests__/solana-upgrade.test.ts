import { describe, it, expect } from 'vitest';
import { solanaUpgradeHandler } from '@/lib/solana-upgrade';

describe('SolanaUpgradeHandler', () => {
  it('should return upgrade status without upgrading', async () => {
    const result = await solanaUpgradeHandler.checkUpgradeStatus();

    expect(result).toBeDefined();
    expect(result.currentVersion).toBeTruthy();
    expect(typeof result.cautiousMode).toBe('boolean');
    expect(result.lastChecked).toBeInstanceOf(Date);
  });
});
