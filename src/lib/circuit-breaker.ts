/**
 * Circuit Breaker — OSIRIS Phase 6
 * Implements safety mechanism to prevent unintended trades
 * and enforce safety thresholds from Phase 1 security model.
 */

export interface CircuitBreakerConfig {
  safetyMargin: number; // % of maxPositionSize reserved for safety
  maxConsecutiveFailures: number; // Max failures before auto-pause
  cooldownMs: number; // Time to wait before reset
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  safetyMargin: 10, // 10% buffer for emergency halt
  maxConsecutiveFailures: 5,
  cooldownMs: 60 * 1000, // 1 minute
};

export class CircuitBreaker {
  private isBreached: boolean = false;
  private consecutiveFailures: number = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if trade amount is within safety threshold
   * Returns true if safe, false if circuit breaker should engage
   */
  checkSafety(tradeAmount: number, maxPositionSize: number): boolean {
    const safetyThreshold = maxPositionSize * (1 - (this.config.safetyMargin / 100));
    
    if (tradeAmount > safetyThreshold) {
      this.isBreached = true;
      this.consecutiveFailures++;
      this.lastFailureTime = Date.now();
      console.error(`⚠️ Circuit breaker triggered: Trade amount ${tradeAmount} exceeds safety threshold ${safetyThreshold}`);
      return false;
    }
    
    this.isBreached = false;
    return true;
  }

  /**
   * Record a failed trade execution
   */
  recordFailure(): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    
    if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.isBreached = true;
      console.error(`🚨 Circuit breaker auto-engaged: ${this.consecutiveFailures} consecutive failures`);
    }
  }

  /**
   * Record a successful trade execution
   */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.isBreached = false;
  }

  /**
   * Reset circuit breaker manually
   */
  reset(): void {
    this.isBreached = false;
    this.consecutiveFailures = 0;
    this.lastFailureTime = 0;
    console.log('✅ Circuit breaker reset');
  }

  /**
   * Check if circuit breaker is currently engaged
   */
  isEngaged(): boolean {
    if (this.isBreached) {
      // Auto-reset after cooldown
      if (Date.now() - this.lastFailureTime > this.config.cooldownMs) {
        this.reset();
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Get current state for monitoring
   */
  getState(): {
    engaged: boolean;
    consecutiveFailures: number;
    lastFailureTime: number;
    cooldownRemaining: number;
  } {
    const now = Date.now();
    const cooldownRemaining = this.isBreached 
      ? Math.max(0, this.config.cooldownMs - (now - this.lastFailureTime))
      : 0;
    
    return {
      engaged: this.isBreached,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      cooldownRemaining,
    };
  }
}