import { describe, it, expect } from 'vitest';
import { feeStrategyService } from '@/services/fees/strategy';

describe('FeeStrategyService', () => {
  it('should compute fee within 1% ceiling', async () => {
    const result = await feeStrategyService.compute({
      transactionType: 'swap',
      valueLamports: 1_000_000_000,
      urgency: 'medium',
    });

    expect(result.computeUnitLimit).toBeGreaterThan(0);
    expect(result.feeLamports).toBeLessThanOrEqual(1_000_000_000 * 0.01);
    expect(result.feePercentage).toBeLessThanOrEqual(0.01);
    expect(['base', 'percentile', 'ceiling']).toContain(result.source);
  });

  it('should use higher base limit for swaps than transfers', async () => {
    const swap = await feeStrategyService.compute({
      transactionType: 'swap',
      valueLamports: 1_000_000,
      urgency: 'low',
    });
    const transfer = await feeStrategyService.compute({
      transactionType: 'transfer',
      valueLamports: 1_000_000,
      urgency: 'low',
    });

    expect(swap.computeUnitLimit).toBeGreaterThan(transfer.computeUnitLimit);
  });
});
