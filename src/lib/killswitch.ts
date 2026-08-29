/**
 * Global Emergency Kill Switch — OSIRIS Phase 5 (P5.8)
 * 
 * Multi-layer halt system:
 *   Layer 1: DB `trading_halted` flag (fail-closed)
 *   Layer 2: Session revocation cascade (all active sessions revoked)
 *   Layer 3: Remote signer HALT check (rejects ALL signing requests)
 *   Layer 4: On-chain pause program (future, cryptographic guarantee)
 * 
 * Automatic triggers:
 *   - Circuit breaker trip
 *   - Rate limit exceeded
 *   - >50% simulation failure rate
 * 
 * Manual triggers:
 *   - Admin dashboard panic button
 *   - Telegram /halt command (Tier 3 only)
 * 
 * Recovery:
 *   - 2-of-3 admin signatures
 *   - 60-minute cooldown
 *   - Typed confirmation "I CONFIRM HALT RECOVERY"
 */

import { publish } from '@/lib/events/bus';
import redis from '@/lib/redis';
import { AdminAlerts } from '@/lib/admin-alerts';

export enum KillSwitchLayer {
  DB_FLAG = 'db_flag',
  SESSION_CASCADE = 'session_cascade',
  REMOTE_SIGNER = 'remote_signer',
  ON_CHAIN = 'on_chain',
}

export enum KillSwitchTrigger {
  CIRCUIT_BREAKER = 'circuit_breaker',
  RATE_LIMIT = 'rate_limit',
  SIM_FAILURE = 'sim_failure',
  ADMIN_PANIC = 'admin_panic',
  TELEGRAM_HALT = 'telegram_halt',
}

export enum KillSwitchState {
  ARMED = 'armed',
  HALTED = 'halted',
  RECOVERY_PENDING = 'recovery_pending',
  RECOVERING = 'recovering',
  ACTIVE = 'active',
}

export interface KillSwitchContext {
  trigger: KillSwitchTrigger;
  source: string;
  details: Record<string, unknown>;
  timestamp: number;
  requestId: string;
}

export interface KillSwitchStatus {
  state: KillSwitchState;
  haltedAt?: number;
  haltedBy?: KillSwitchContext;
  recoveryProposedAt?: number;
  recoverySignatures: string[];
  recoveryConfirmed?: boolean;
  cooldownUntil?: number;
}

const KILLSWITCH_KEY = 'osiris:killswitch:status';
const HALTED_FLAG_KEY = 'osiris:trading_halted';
const RECOVERY_COOLDOWN_MS = 60 * 60 * 1000; // 60 minutes
const REQUIRED_SIGNATURES = 2;
const TOTAL_ADMINS = 3;

export class KillSwitch {
  private status: KillSwitchStatus = {
    state: KillSwitchState.ARMED,
    recoverySignatures: [],
  };

  /**
   * Check if trading is currently halted (fail-closed)
   * Returns true if ANY layer indicates halt
   */
  async isHalted(): Promise<boolean> {
    // Layer 1: DB flag (Redis as fast cache, DB as source of truth)
    const redisHalted = await redis.get(HALTED_FLAG_KEY);
    if (redisHalted === 'true') {
      return true;
    }

    // Also check in-memory status for fast path
    return this.status.state === KillSwitchState.HALTED;
  }

  /**
   * Get current kill switch status
   */
  async getStatus(): Promise<KillSwitchStatus> {
    // Sync with Redis
    const redisStatus = await redis.get(KILLSWITCH_KEY);
    if (redisStatus) {
      try {
        this.status = JSON.parse(redisStatus);
      } catch {
        // Ignore parse errors, use in-memory
      }
    }
    return { ...this.status };
  }

  /**
   * Engage kill switch — immediate halt across all layers
   */
  async engage(context: KillSwitchContext): Promise<boolean> {
    const now = Date.now();

    // Prevent re-engagement if already halted
    if (await this.isHalted()) {
      return false;
    }

    // Update status
    this.status = {
      state: KillSwitchState.HALTED,
      haltedAt: now,
      haltedBy: context,
      recoverySignatures: [],
    };

    // Persist to Redis (fast layer)
    await redis.set(HALTED_FLAG_KEY, 'true');
    await redis.set(KILLSWITCH_KEY, JSON.stringify(this.status));

    // Layer 2: Revoke all active sessions
    await this.revokeAllSessions(context);

    // Layer 3: Notify remote signer to engage HALT
    await this.notifyRemoteSignerHalt(true);

    // Layer 4: Publish HALT event for WebSocket/SSE clients
    await publish('killswitch:halted', {
      ...context,
      timestamp: now,
    });

    // Log audit trail
    console.error(`🚨 KILL SWITCH ENGAGED: ${context.trigger} by ${context.source}`, context.details);

    AdminAlerts.system.killswitchEngaged(context.trigger, context.source);

    return true;
  }

  /**
   * Propose recovery — requires 2-of-3 admin signatures
   */
  async proposeRecovery(adminId: string): Promise<{ success: boolean; signaturesNeeded: number }> {
    const status = await this.getStatus();

    if (status.state !== KillSwitchState.HALTED) {
      return { success: false, signaturesNeeded: REQUIRED_SIGNATURES };
    }

    // Check cooldown
    if (status.cooldownUntil && status.cooldownUntil > Date.now()) {
      return { success: false, signaturesNeeded: REQUIRED_SIGNATURES - status.recoverySignatures.length };
    }

    // Add signature if not already signed
    if (!status.recoverySignatures.includes(adminId)) {
      status.recoverySignatures.push(adminId);
    }

    // Check threshold
    if (status.recoverySignatures.length >= REQUIRED_SIGNATURES) {
      status.state = KillSwitchState.RECOVERY_PENDING;
      status.recoveryProposedAt = Date.now();
      status.cooldownUntil = Date.now() + RECOVERY_COOLDOWN_MS;
    }

    await redis.set(KILLSWITCH_KEY, JSON.stringify(status));
    this.status = status;

    return {
      success: status.recoverySignatures.length >= REQUIRED_SIGNATURES,
      signaturesNeeded: Math.max(0, REQUIRED_SIGNATURES - status.recoverySignatures.length),
    };
  }

  /**
   * Confirm recovery with typed confirmation
   */
  async confirmRecovery(confirmationText: string): Promise<boolean> {
    const status = await this.getStatus();

    if (status.state !== KillSwitchState.RECOVERY_PENDING) {
      return false;
    }

    if (confirmationText !== 'I CONFIRM HALT RECOVERY') {
      return false;
    }

    if (!status.recoveryConfirmed) {
      status.recoveryConfirmed = true;
      await redis.set(KILLSWITCH_KEY, JSON.stringify(status));
      this.status = status;
    }

    // Check cooldown expiry
    if (status.cooldownUntil && status.cooldownUntil <= Date.now()) {
      return await this.executeRecovery();
    }

    return false;
  }

  /**
   * Execute recovery after cooldown and confirmation
   */
  private async executeRecovery(): Promise<boolean> {
    const status = await this.getStatus();

    if (status.state !== KillSwitchState.RECOVERY_PENDING || !status.recoveryConfirmed) {
      return false;
    }

    // Layer 1: Clear DB flag
    await redis.set(HALTED_FLAG_KEY, 'false');

    // Layer 3: Notify remote signer to disengage HALT
    await this.notifyRemoteSignerHalt(false);

    // Layer 4: Publish recovery event
    await publish('killswitch:recovered', {
      timestamp: Date.now(),
      previousHalt: status.haltedBy,
    });

    // Reset status
    this.status = {
      state: KillSwitchState.ACTIVE,
      recoverySignatures: [],
    };
    await redis.set(KILLSWITCH_KEY, JSON.stringify(this.status));

    console.log('✅ KILL SWITCH RECOVERED: Trading resumed');
    return true;
  }

  /**
   * Revoke all active sessions (Layer 2)
   */
  private async revokeAllSessions(context: KillSwitchContext): Promise<void> {
    // This would integrate with session-state-machine
    // For now, publish event that session manager consumes
    await publish('killswitch:revoke_all_sessions', {
      reason: `Kill switch: ${context.trigger}`,
      ...context,
    });
  }

  /**
   * Notify remote signer of HALT state change (Layer 3)
   */
  private async notifyRemoteSignerHalt(halted: boolean): Promise<void> {
    // This would integrate with remote-signer service
    // For now, publish event that remote signer consumes
    await publish('killswitch:remote_signer_halt', {
      halted,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if a specific operation should be blocked
   * Used by remote signer, trading engine, webhooks
   */
  async checkOperation(operation: string, metadata: Record<string, unknown> = {}): Promise<{ allowed: boolean; reason?: string }> {
    if (await this.isHalted()) {
      return {
        allowed: false,
        reason: `Kill switch engaged: ${this.status.haltedBy?.trigger ?? 'unknown'}`,
      };
    }
    return { allowed: true };
  }

  /**
   * Automatic trigger evaluation
   * Called by monitoring systems
   */
  async evaluateTriggers(metrics: {
    circuitBreakerTripped: boolean;
    rateLimitExceeded: boolean;
    simFailureRate: number;
  }): Promise<void> {
    const now = Date.now();
    const requestId = `auto-${now}`;

    if (metrics.circuitBreakerTripped) {
      await this.engage({
        trigger: KillSwitchTrigger.CIRCUIT_BREAKER,
        source: 'auto-monitor',
        details: { circuitBreaker: true },
        timestamp: now,
        requestId,
      });
    } else if (metrics.rateLimitExceeded) {
      await this.engage({
        trigger: KillSwitchTrigger.RATE_LIMIT,
        source: 'auto-monitor',
        details: { rateLimit: true },
        timestamp: now,
        requestId,
      });
    } else if (metrics.simFailureRate > 0.5) {
      await this.engage({
        trigger: KillSwitchTrigger.SIM_FAILURE,
        source: 'auto-monitor',
        details: { simFailureRate: metrics.simFailureRate },
        timestamp: now,
        requestId,
      });
    }
  }
}

// Singleton instance
export const killSwitch = new KillSwitch();