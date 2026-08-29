/**
 * OSIRIS Cost Control Service
 *
 * Enforces spend guardrails against configured budgets and emits alerts when
 * thresholds are crossed. Intended to be consulted before high-cost actions
 * such as trade execution, session resumption, or external API spend.
 */

import { AdminAlerts } from '@/lib/admin-alerts';
import { logger } from '@/lib/logger';
import { createCorrelationId } from '@/lib/safety-manager';

export interface CostThresholds {
  warningFraction: number; // 0..1
  criticalFraction: number; // 0..1
  hardCapFraction: number; // 0..1
}

export interface SpendBudget {
  budgetLamports: number;
  spentLamports: number;
}

export type BudgetScope = 'session' | 'wallet' | 'global';

export interface CostCheckResult {
  allowed: boolean;
  fraction: number;
  threshold: 'normal' | 'warning' | 'critical' | 'hard_cap';
}

const DEFAULT_THRESHOLDS: CostThresholds = {
  warningFraction: 0.7,
  criticalFraction: 0.9,
  hardCapFraction: 1.0,
};

export class CostControlService {
  private readonly thresholds: CostThresholds;

  constructor(thresholds: Partial<CostThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Evaluate whether a spend is allowed under the current budget and thresholds.
   */
  evaluate(budget: SpendBudget, scope: BudgetScope = 'session'): CostCheckResult {
    if (budget.budgetLamports <= 0) {
      return { allowed: true, fraction: 0, threshold: 'normal' };
    }

    const fraction = budget.spentLamports / budget.budgetLamports;
    const threshold = this.resolveThreshold(fraction);
    const allowed = threshold !== 'hard_cap';

    if (!allowed) {
      const correlationId = createCorrelationId();
      logger.warn('cost_control.hard_cap', {
        correlationId,
        scope,
        budgetLamports: budget.budgetLamports,
        spentLamports: budget.spentLamports,
        fraction,
      });
      AdminAlerts.system.configError('cost-control', `Hard cap reached for ${scope}`);
    }

    return { allowed, fraction, threshold };
  }

  /**
   * Record a spend event and optionally evaluate it against the budget.
   */
  async recordSpend(input: {
    scope: BudgetScope;
    scopeId: string;
    lamports: number;
    budgetLamports: number;
    previousSpentLamports?: number;
    correlationId?: string;
  }): Promise<CostCheckResult> {
    const correlationId = input.correlationId || createCorrelationId();
    const spentLamports = (input.previousSpentLamports || 0) + input.lamports;

    const result = this.evaluate(
      { budgetLamports: input.budgetLamports, spentLamports },
      input.scope
    );

    if (result.threshold === 'critical' || result.threshold === 'hard_cap') {
      AdminAlerts.system.configError(
        'cost-control',
        `Threshold ${result.threshold} reached for ${input.scope}:${input.scopeId}`
      );
    } else if (result.threshold === 'warning') {
      logger.warn('cost_control.warning', {
        correlationId,
        scope: input.scope,
        scopeId: input.scopeId,
        fraction: result.fraction,
      });
    }

    logger.info('cost_control.spend_recorded', {
      correlationId,
      scope: input.scope,
      scopeId: input.scopeId,
      lamports: input.lamports,
      budgetLamports: input.budgetLamports,
      spentLamports,
      fraction: result.fraction,
      threshold: result.threshold,
    });

    return result;
  }

  private resolveThreshold(fraction: number): CostCheckResult['threshold'] {
    if (fraction >= this.thresholds.hardCapFraction) {
      return 'hard_cap';
    }
    if (fraction >= this.thresholds.criticalFraction) {
      return 'critical';
    }
    if (fraction >= this.thresholds.warningFraction) {
      return 'warning';
    }
    return 'normal';
  }
}

export const costControlService = new CostControlService();
