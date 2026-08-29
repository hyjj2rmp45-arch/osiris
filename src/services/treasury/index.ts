/**
 * OSIRIS Treasury Service
 *
 * Separates collected fees into:
 *  - operational: kept in the hot wallet for tx fees, compute, infrastructure
 *  - platform: swept to the configured treasury address
 *
 * NOTE: Full DB persistence requires fee_ledger and treasury_sweeps tables
 * in schema.ts. This implementation is typed-safe and no-ops until those
 * tables are migrated.
 */

export type FeeCategory = 'operational' | 'platform';

export interface FeeSplit {
  category: FeeCategory;
  amountLamports: number;
  destination?: string;
}

export interface TreasuryConfig {
  /** Wallet that receives platform fees */
  treasuryAddress: string;
  /** Minimum lamports before a sweep is allowed */
  minSweepLamports: number;
  /** Maximum lamports allowed in a single sweep */
  maxSweepLamports: number;
}

const DEFAULT_CONFIG: TreasuryConfig = {
  treasuryAddress: process.env.PHANTOM_SOL_ADDRESS || '',
  minSweepLamports: 50_000_000, // 0.05 SOL
  maxSweepLamports: 500_000_000, // 0.5 SOL
};

export class TreasuryService {
  private readonly config: TreasuryConfig;

  constructor(config: Partial<TreasuryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Split a fee amount into operational + platform portions.
   *
   * Current rule:
   *  - first 25% or up to 0.1 SOL stays operational
   *  - remainder goes to platform/treasury
   */
  splitFee(feeLamports: number): FeeSplit[] {
    const operationalCap = Math.min(Math.floor(feeLamports * 0.25), 100_000_000);
    const operational = feeLamports > 0 ? Math.min(feeLamports, operationalCap) : 0;
    const platform = feeLamports - operational;

    const splits: FeeSplit[] = [
      {
        category: 'operational',
        amountLamports: operational,
      },
    ];

    if (platform > 0 && this.config.treasuryAddress) {
      splits.push({
        category: 'platform',
        amountLamports: platform,
        destination: this.config.treasuryAddress,
      });
    }

    return splits;
  }

  /**
   * Record a fee split in the fee ledger.
   */
  async recordFeeLedgerEntry(_input: {
    tradeId?: string;
    sourceWallet: string;
    feeType: string;
    totalLamports: number;
    correlationId?: string;
  }): Promise<void> {
    // TODO: implement when fee_ledger table is added to schema.ts
  }

  /**
   * Check whether a sweep of platform fees is allowed.
   */
  canSweep(platformBalanceLamports: number): { allowed: boolean; reason?: string } {
    if (!this.config.treasuryAddress) {
      return { allowed: false, reason: 'treasury_address_not_configured' };
    }

    if (platformBalanceLamports <= 0) {
      return { allowed: false, reason: 'zero_platform_balance' };
    }

    if (platformBalanceLamports < this.config.minSweepLamports) {
      return { allowed: false, reason: 'below_min_sweep' };
    }

    if (platformBalanceLamports > this.config.maxSweepLamports) {
      return { allowed: false, reason: 'exceeds_max_sweep' };
    }

    return { allowed: true };
  }

  /**
   * Record a sweep to the treasury.
   */
  async recordSweep(_input: {
    lamports: number;
    signature?: string;
    correlationId?: string;
  }): Promise<void> {
    // TODO: implement when treasury_sweeps table is added to schema.ts
  }

  /**
   * Get current platform fee balance from ledger.
   */
  async getPlatformBalance(): Promise<number> {
    // TODO: implement when fee_ledger table is added to schema.ts
    return 0;
  }

  /**
   * High-level fee attribution helper: classify, record, and update metrics.
   */
  async attributeFee(input: {
    tradeId?: string;
    sourceWallet: string;
    feeType: string;
    lamports: number;
    feeLabel?: string;
  }): Promise<FeeSplit[]> {
    const splits = this.splitFee(input.lamports);

    // TODO: record to ledger when fee_ledger table is available

    return splits;
  }
}

export const treasuryService = new TreasuryService();
