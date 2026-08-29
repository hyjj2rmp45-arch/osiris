import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CostControlService, costControlService } from '@/services/cost-control';

describe('cost-control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('evaluate', () => {
    it('should allow spend when under warning threshold', () => {
      const result = costControlService.evaluate({
        budgetLamports: 100,
        spentLamports: 10,
      });
      expect(result.allowed).toBe(true);
      expect(result.threshold).toBe('normal');
    });

    it('should warn at warning threshold', () => {
      const result = costControlService.evaluate({
        budgetLamports: 100,
        spentLamports: 75,
      });
      expect(result.allowed).toBe(true);
      expect(result.threshold).toBe('warning');
    });

    it('should warn at critical threshold', () => {
      const result = costControlService.evaluate({
        budgetLamports: 100,
        spentLamports: 91,
      });
      expect(result.allowed).toBe(true);
      expect(result.threshold).toBe('critical');
    });

    it('should block at hard cap', () => {
      const result = costControlService.evaluate({
        budgetLamports: 100,
        spentLamports: 100,
      });
      expect(result.allowed).toBe(false);
      expect(result.threshold).toBe('hard_cap');
    });

    it('should allow when budget is zero/negative', () => {
      const result = costControlService.evaluate({
        budgetLamports: 0,
        spentLamports: 100,
      });
      expect(result.allowed).toBe(true);
      expect(result.threshold).toBe('normal');
    });
  });
});
