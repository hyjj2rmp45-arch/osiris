/**
 * Dynamic Fee & CU Strategy — OSIRIS Phase 5.7
 *
 * Implements fee percentile strategy by urgency and CU limits by transaction type.
 */

export interface FeeComputationInput {
  transactionType: 'transfer' | 'swap';
  valueLamports: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface FeeComputationResult {
  computeUnitLimit: number;
  feeLamports: number;
  feePercentage: number;
  source: 'base' | 'percentile' | 'ceiling';
}

export interface FeeEstimate {
  fee: number;
  computeUnits: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  percentile: number;
}

export interface FeeStrategyConfig {
  /** Fee ceiling as fraction of trade value. Default: 0.01 (1%) */
  feeCeiling: number;
  /** Base compute units for simple transfers */
  baseCuTransfer: number;
  /** Base compute units for swaps */
  baseCuSwap: number;
}

const DEFAULT_CONFIG: FeeStrategyConfig = {
  feeCeiling: 0.01,
  baseCuTransfer: 10000,
  baseCuSwap: 200000,
};

export class DynamicFeeStrategy {
  private config: FeeStrategyConfig;

  constructor(config: Partial<FeeStrategyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Compute fee and compute units for a transaction.
   * Matches test expectations: computeUnitLimit, feeLamports, feePercentage, source
   */
  compute(input: FeeComputationInput): FeeComputationResult {
    const baseCu = input.transactionType === 'transfer'
      ? this.config.baseCuTransfer
      : this.config.baseCuSwap;

    const percentile = this.getPercentileByUrgency(input.urgency);
    const multiplier = 1 + (percentile / 100) * 0.5;
    const computeUnitLimit = Math.floor(baseCu * multiplier);

    // Fee calculation: base fee * urgency multiplier
    const baseFee = input.transactionType === 'transfer' ? 5000 : 50000;
    const urgencyMultiplier = this.getUrgencyMultiplier(input.urgency);
    const feeLamports = Math.floor(baseFee * urgencyMultiplier);
    const feePercentage = feeLamports / input.valueLamports;

    // Determine source
    let source: FeeComputationResult['source'] = 'base';
    if (feePercentage > this.config.feeCeiling) {
      source = 'ceiling';
    } else if (percentile > 50) {
      source = 'percentile';
    }

    return {
      computeUnitLimit,
      feeLamports,
      feePercentage,
      source,
    };
  }

  /**
   * Estimate fee and compute units for a transaction.
   */
  estimate(transactionType: 'transfer' | 'swap', urgency: 'low' | 'medium' | 'high' | 'critical'): FeeEstimate {
    const baseCu = transactionType === 'transfer'
      ? this.config.baseCuTransfer
      : this.config.baseCuSwap;

    const percentile = this.getPercentileByUrgency(urgency);
    const multiplier = 1 + (percentile / 100) * 0.5;
    const computeUnits = Math.floor(baseCu * multiplier);

    // Fee calculation: base fee * urgency multiplier
    const baseFee = transactionType === 'transfer' ? 5000 : 50000;
    const urgencyMultiplier = this.getUrgencyMultiplier(urgency);
    const fee = Math.floor(baseFee * urgencyMultiplier);

    return {
      fee,
      computeUnits,
      urgency,
      percentile,
    };
  }

  /**
   * Validate that fee does not exceed ceiling.
   */
  validateFee(fee: number, tradeValue: number): boolean {
    const feeRatio = fee / tradeValue;
    return feeRatio <= this.config.feeCeiling;
  }

  private getPercentileByUrgency(urgency: string): number {
    switch (urgency) {
      case 'low':
        return 25;
      case 'medium':
        return 50;
      case 'high':
        return 75;
      case 'critical':
        return 95;
      default:
        return 50;
    }
  }

  private getUrgencyMultiplier(urgency: string): number {
    switch (urgency) {
      case 'low':
        return 0.8;
      case 'medium':
        return 1.0;
      case 'high':
        return 1.5;
      case 'critical':
        return 2.0;
      default:
        return 1.0;
    }
  }
}

export const dynamicFeeStrategy = new DynamicFeeStrategy();

/**
 * Compatibility alias matching existing test imports.
 */
export const feeStrategyService = dynamicFeeStrategy;
