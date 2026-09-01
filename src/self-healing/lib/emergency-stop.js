/**
 * Emergency Kill Switch + Circuit Breaker
 * 
 * Phase 1: Safety Foundation
 * 
 * Provides immediate shutdown capability via file-based kill switch
 * and circuit breaker pattern for external dependencies.
 * 
 * Based on:
 * - Anthropic Claude Code Auto Mode (escalation threshold: 3 consecutive denials)
 * - Resilience4j circuit breaker pattern
 * - Microsoft Agent Governance Toolkit (Saga orchestration with rollback)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// KILL SWITCH
// ═══════════════════════════════════════════════════════════════

const KILL_SWITCH_PATH = '/app/NO_AUTO_FIX';
const KILL_SWITCH_CONTENT = JSON.stringify({
  reason: 'Emergency stop activated by kill switch file.',
  activatedAt: new Date().toISOString(),
  deactivatedBy: 'manual_file_removal',
  allowedReasons: [
    'emergency_system_failure',
    'ongoing_investigation',
    'unauthorized_behavior_detected',
    'manual_override'
  ]
}, null, 2);

/**
 * Check if the emergency kill switch is engaged.
 * 
 * @returns {boolean} - True if auto-fixing should be disabled
 */
function isKillSwitchEngaged() {
  return fs.existsSync(KILL_SWITCH_PATH);
}

/**
 * Get detailed kill switch status.
 * 
 * @returns {{engaged: boolean, reason?: string, activatedAt?: string}}
 */
function getKillSwitchStatus() {
  if (!isKillSwitchEngaged()) {
    return { engaged: false, reason: 'Kill switch not engaged.' };
  }
  
  try {
    const content = fs.readFileSync(KILL_SWITCH_PATH, 'utf-8');
    const parsed = JSON.parse(content);
    return {
      engaged: true,
      reason: parsed.reason || 'Kill switch file present.',
      activatedAt: parsed.activatedAt
    };
  } catch (e) {
    // File exists but couldn't be parsed - treat as engaged (fail-safe)
    return {
      engaged: true,
      reason: 'Kill switch file present but unreadable (fail-safe).',
      activatedAt: 'unknown'
    };
  }
}

/**
 * Engage the emergency kill switch.
 * Creates the kill switch file with an optional reason.
 * 
 * @param {string} [reason] - Optional reason for activation
 */
function engageKillSwitch(reason = 'manual_activation') {
  const content = {
    reason: reason,
    activatedAt: new Date().toISOString(),
    activatedBy: 'emergency_kill_switch_function',
    allowedReasons: [
      'emergency_system_failure',
      'ongoing_investigation', 
      'unauthorized_behavior_detected',
      'manual_override',
      'manual_activation'
    ]
  };
  
  fs.mkdirSync(path.dirname(KILL_SWITCH_PATH), { recursive: true });
  fs.writeFileSync(KILL_SWITCH_PATH, JSON.stringify(content, null, 2), {
    mode: 0o644,
    flag: 'w'
  });
}

/**
 * Disengage the emergency kill switch.
 * Removes the kill switch file.
 * 
 * @param {string} [reason] - Optional reason for deactivation
 */
function disengageKillSwitch(reason = 'manual_deactivation') {
  if (fs.existsSync(KILL_SWITCH_PATH)) {
    fs.unlinkSync(KILL_SWITCH_PATH);
  }
}

// ═══════════════════════════════════════════════════════════════
// CIRCUIT BREAKER
// ═══════════════════════════════════════════════════════════════

/**
 * Circuit Breaker states:
 * - CLOSED: Requests are allowed
 * - OPEN: Requests fail immediately (cooldown period)
 * - HALF_OPEN: Single test request allowed; if success, close; if fail, open
 */
const CircuitBreakerState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 3;      // failures to open
    this.successThreshold = options.successThreshold || 1;      // successes to close from half-open
    this.timeout = options.timeout || 10000;                     // timeout per request
    this.cooldown = options.cooldown || 60000;                   // open→half-open cooldown
    this.fallbackFn = options.fallbackFn || null;               // optional fallback
    
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
  }
  
  /**
   * Check if a request can proceed (state check before executing).
   * 
   * @returns {boolean} - True if request is allowed
   */
  canExecute() {
    const now = Date.now();
    
    switch (this.state) {
      case CircuitBreakerState.OPEN:
        if (now >= this.nextAttemptTime) {
          this.state = CircuitBreakerState.HALF_OPEN;
          this.successCount = 0;
        } else {
          return false;
        }
        break;
      
      case CircuitBreakerState.HALF_OPEN:
        return this.successCount < this.successThreshold;
      
      case CircuitBreakerState.CLOSED:
      default:
        return true;
    }
    
    return true;
  }
  
  /**
   * Execute a function through the circuit breaker.
   * Tracks success/failure and manages state transitions.
   * 
   * @param {Function} fn - Async function to execute
   * @returns {Promise<*>} - Result of the function
   */
  async execute(fn) {
    if (!this.canExecute()) {
      if (this.fallbackFn) {
        return await this.fallbackFn();
      }
      throw new Error(`Circuit breaker [${this.name}] is OPEN`);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const result = await fn({ signal: controller.signal });
      clearTimeout(timeoutId);
      this.onSuccess();
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      this.onFailure(err);
      throw err;
    }
  }
  
  /**
   * Record a successful execution.
   */
  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.lastFailureTime = 0;
      }
    }
  }
  
  /**
   * Record a failed execution.
   */
  onFailure(err) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.cooldown;
    } else if (this.state === CircuitBreakerState.CLOSED) {
      if (this.failureCount >= this.failureThreshold) {
        this.state = CircuitBreakerState.OPEN;
        this.nextAttemptTime = Date.now() + this.cooldown;
      }
    }
  }
  
  /**
   * Get current circuit breaker status (for health checks).
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      isOpen: this.state === CircuitBreakerState.OPEN
    };
  }
  
  /**
   * Reset circuit breaker to CLOSED state.
   */
  reset() {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// EMERGENCY STOP MANAGER
// ═══════════════════════════════════════════════════════════════

/**
 * Emergency stop manager combining kill switch and denial tracking.
 * 
 * Based on Anthropic Claude Code Auto Mode:
 * - 3 consecutive denials → emergency stop (lockout)
 * - 6 attempts per 24h rate limit (prevents brute force)
 */
class EmergencyStopManager {
  constructor(stateFile = '/app/data/emergency-state.json') {
    this.stateFile = stateFile;
    this.state = this._loadState();
    
    // Ensure state directory exists
    const dir = path.dirname(stateFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  _loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const content = fs.readFileSync(this.stateFile, 'utf-8');
        return JSON.parse(content);
      }
    } catch (e) {
      // State file corrupted — use safe defaults (fail-safe)
    }
    
    return {
      consecutiveDenials: 0,
      sessionDenials: 0,
      sessionStart: new Date().toISOString(),
      rateLimitTracker: {},  // { fingerprint: [timestamps] }
      mode: 'AUTO',          // AUTO | STANDBY | EMERGENCY
      lastKillSwitchCheck: null,
      emergencyActivated: false,
      emergencyReason: null,
      emergencySetAt: null
    };
  }
  
  _saveState() {
    const tmpFile = this.stateFile + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(this.state, null, 2), { encoding: 'utf-8' });
    fs.renameSync(tmpFile, this.stateFile);  // Atomic on POSIX
  }
  
  /**
   * Check if the system is in emergency stop state.
   */
  isEmergencyStopped() {
    // Check kill switch file
    if (isKillSwitchEngaged()) {
      this.state.emergencyActivated = true;
      this.state.emergencyReason = 'kill_switch_file_present';
      this.state.emergencySetAt = new Date().toISOString();
      return true;
    }
    
    // Check consecutive denials
    if (this.state.consecutiveDenials >= 3) {
      this.state.emergencyActivated = true;
      this.state.emergencyReason = 'consecutive_denials_exceeded';
      this.state.emergencySetAt = new Date().toISOString();
      return true;
    }
    
    // Check session denials  
    if (this.state.sessionDenials >= 6) {
      this.state.emergencyActivated = true;
      this.state.emergencyReason = 'session_denial_rate_exceeded';
      this.state.emergencySetAt = new Date().toISOString();
      return true;
    }
    
    this.state.emergencyActivated = false;
    this.state.lastKillSwitchCheck = new Date().toISOString();
    this._saveState();
    
    return false;
  }
  
  /**
   * Record a denial event.
   */
  recordDenial(fingerprint) {
    this.state.consecutiveDenials++;
    this.state.sessionDenials++;
    
    // Track for rate limiting
    if (!this.state.rateLimitTracker[fingerprint]) {
      this.state.rateLimitTracker[fingerprint] = [];
    }
    this.state.rateLimitTracker[fingerprint].push(Date.now());
    
    this._saveState();
    
    if (this.isEmergencyStopped()) {
      return { stopped: true, reason: this.state.emergencyReason };
    }
    return { stopped: false };
  }
  
  /**
   * Record a successful fix (resets consecutive denials).
   */
  recordSuccess() {
    this.state.consecutiveDenials = 0;
    this._saveState();
  }
  
  /**
   * Check rate limit for a specific error fingerprint.
   * 6 attempts per 24h per fingerprint.
   */
  checkRateLimit(fingerprint) {
    const attempts = this.state.rateLimitTracker[fingerprint] || [];
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;  // 24h ago
    const recent = attempts.filter(ts => ts > cutoff);
    
    return {
      allowed: recent.length < 6,
      remaining: Math.max(0, 6 - recent.length),
      totalAttempts: recent.length
    };
  }
  
  /**
   * Reset emergency state (manual recovery).
   */
  resetEmergency() {
    this.state.consecutiveDenials = 0;
    this.state.sessionDenials = 0;
    this.state.rateLimitTracker = {};
    this.state.emergencyActivated = false;
    this.state.emergencyReason = null;
    this.state.emergencySetAt = null;
    this._saveState();
  }
  
  /**
   * Get current status for health endpoint.
   */
  getStatus() {
    return {
      isEmergencyStopped: this.isEmergencyStopped(),
      consecutiveDenials: this.state.consecutiveDenials,
      sessionDenials: this.state.sessionDenials,
      mode: this.state.mode,
      emergencyReason: this.state.emergencyReason,
      emergencySetAt: this.state.emergencySetAt,
      killSwitchPresent: isKillSwitchEngaged()
    };
  }
  
  /**
   * Clean up old rate limit entries (housekeeping).
   */
  purgeOldRateLimits() {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [fp, timestamps] of Object.entries(this.state.rateLimitTracker)) {
      const recent = timestamps.filter(ts => ts > cutoff);
      if (recent.length === 0) {
        delete this.state.rateLimitTracker[fp];
      } else {
        this.state.rateLimitTracker[fp] = recent;
      }
    }
    this._saveState();
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Kill switch
  isKillSwitchEngaged,
  getKillSwitchStatus,
  engageKillSwitch,
  disengageKillSwitch,
  KILL_SWITCH_PATH,
  
  // Circuit breaker
  CircuitBreaker,
  CircuitBreakerState,
  
  // Emergency stop manager
  EmergencyStopManager,
  
  // Export state constants
  KILL_SWITCH_CONTENT
};
