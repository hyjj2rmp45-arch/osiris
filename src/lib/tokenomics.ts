/**
 * Tokenomics — OSIRIS Phase 6
 * Defines fee structures and payout calculations for the OSIRIS platform.
 */

export interface PayoutConfig {
  takeFee: number; // Fee on taker (e.g., 0.5%)
  transferFee: number; // Fee on transfer (e.g., 0% — kept dormant for future use)
  referralFee: number; // Fee for referrals (e.g., 0% — activate when referrals launch)
}

const DEFAULT_CONFIG: PayoutConfig = {
  takeFee: 0.5, // 0.5% taker fee — matches Banana Gun, half of BullX/Photon
  transferFee: 0.00, // 0% transfer fee — user custody model, no platform transfers
  referralFee: 0.00, // 0% referral fee — dormant; activate at 0.05% when referrals launch
};

export class Tokenomics {
  private config: PayoutConfig;

  constructor(config: Partial<PayoutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate the payout for a trade, deducting fees.
   * @param amount The gross trade amount in USDC
   * @returns An object containing the net amount after fees and the payout details
   */
  calculatePayout(amount: number): {
    netAmount: number;
    fees: {
      takeFee: number;
      transferFee: number;
    };
    payoutDetails: {
      takerPayout: number;
      recipientPayout: number;
    };
  } {
    // Calculate fees
    const takeFeeAmount = amount * (this.config.takeFee / 100);
    let amountAfterTake = amount - takeFeeAmount;

    const transferFeeAmount = amountAfterTake * (this.config.transferFee / 100);
    const netAmount = amountAfterTake - transferFeeAmount;

    // For simplicity, we assume the payout is the net amount to the recipient
    const takerPayout = 0; // Taker pays the fee, so they don't get a payout from this trade
    const recipientPayout = netAmount;

    return {
      netAmount,
      fees: {
        takeFee: takeFeeAmount,
        transferFee: transferFeeAmount,
      },
      payoutDetails: {
        takerPayout,
        recipientPayout,
      },
    };
  }

  /**
   * Validate that a payout amount is within allowed bounds.
   * @param payoutAmount The payout amount to validate
   * @param maxPositionSize The maximum position size allowed for the user's tier
   * @returns True if the payout is valid, false otherwise
   */
  validatePayout(payoutAmount: number, maxPositionSize: number): boolean {
    // Ensure payout is positive and does not exceed the max position size
    return payoutAmount > 0 && payoutAmount <= maxPositionSize;
  }

  /**
   * Update the fee configuration.
   * @param newConfig Partial configuration to update
   */
  updateConfig(newConfig: Partial<PayoutConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('💰 Tokenomics configuration updated:', this.config);
  }
}

// Export a default instance for use throughout the application
export const tokenomics = new Tokenomics();