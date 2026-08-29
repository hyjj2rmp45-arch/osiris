import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TreasuryService, treasuryService } from '@/services/treasury';

describe('treasury', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('splitFee', () => {
    it('should keep some fee operational and route rest to platform', () => {
      const svc = new TreasuryService({ treasuryAddress: 'TreasuryXYZ' });
      const splits = svc.splitFee(100_000_000); // 0.1 SOL in lamports
      const operational = splits.find(s => s.category === 'operational');
      const platform = splits.find(s => s.category === 'platform');

      expect(operational).toBeDefined();
      expect(platform).toBeDefined();
      expect(operational!.amountLamports + platform!.amountLamports).toBe(100_000_000);
      expect(platform!.destination).toBe('TreasuryXYZ');
    });

    it('should route all to platform when amount is zero or negative', () => {
      const svc = new TreasuryService({ treasuryAddress: 'TreasuryXYZ' });
      const splits = svc.splitFee(0);
      expect(splits).toHaveLength(1);
      expect(splits[0].category).toBe('operational');
      expect(splits[0].amountLamports).toBe(0);
    });
  });

  describe('canSweep', () => {
    it('should reject when treasury address is missing', () => {
      const svc = new TreasuryService({ treasuryAddress: '' });
      const result = svc.canSweep(100_000_000);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('treasury_address_not_configured');
    });

    it('should reject below minimum sweep', () => {
      const svc = new TreasuryService({
        treasuryAddress: 'TreasuryXYZ',
        minSweepLamports: 50_000_000,
        maxSweepLamports: 500_000_000,
      });
      const result = svc.canSweep(10_000_000);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('below_min_sweep');
    });

    it('should reject above maximum sweep', () => {
      const svc = new TreasuryService({
        treasuryAddress: 'TreasuryXYZ',
        minSweepLamports: 50_000_000,
        maxSweepLamports: 500_000_000,
      });
      const result = svc.canSweep(600_000_000);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('exceeds_max_sweep');
    });

    it('should allow sweep within bounds', () => {
      const svc = new TreasuryService({
        treasuryAddress: 'TreasuryXYZ',
        minSweepLamports: 50_000_000,
        maxSweepLamports: 500_000_000,
      });
      const result = svc.canSweep(100_000_000);
      expect(result.allowed).toBe(true);
    });
  });
});
