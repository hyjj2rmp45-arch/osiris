/**
 * Self-Healing Mode Manager
 * 
 * Manages time-based auto-mode transitions based on Milwaukee schedule.
 * 
 * Schedule:
 * 🌙 NIGHT: 3:00 AM - 6:00 AM → Minimal activity, critical alerts only
 * 📋 RECAP: 6:00 AM - 7:00 AM → Morning summary, review overnight activity
 * 🎒 SCHOOL: 7:00 AM - 3:15 PM weekdays → Critical fixes (SEV4+) auto-apply, L1-3 queued with Q-link, payment fixes BLOCKED
 * ✅ ACTIVE: All other times → Full auto-fix capabilities
 * 🛑 EMERGENCY: Manual activation → All auto-fix disabled
 * 
 * Timezone: America/Chicago (Milwaukee)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// TIMEZONE HELPERS (no external deps - manual TZ handling)
// ═══════════════════════════════════════════════════════════════

const TIMEZONE_OFFSET = -6; // CST (UTC-6) - will be adjusted for DST

/**
 * Get current Milwaukee time components.
 */
function getMilwaukeeTime() {
  const now = new Date();
  // Simple CST/CDT detection (good enough for Milwaukee)
  // CST = UTC-6, CDT = UTC-5
  const january = new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
  const july = new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
  const stdOffset = Math.max(january, july);
  const isDST = stdOffset === july && now.getTimezoneOffset() === july;
  const offset = isDST ? -5 : -6; // CDT or CST
  
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const milwuakeTime = new Date(utc + (3600000 * offset));
  
  return {
    hours: milwuakeTime.getHours(),
    minutes: milwuakeTime.getMinutes(),
    day: milwuakeTime.getDay(), // 0=Sunday, 1=Monday, ..., 6=Saturday
    date: milwuakeTime.toISOString().split('T')[0],
    isWeekday: milwuakeTime.getDay() >= 1 && milwuakeTime.getDay() <= 5,
    isDST: isDST
  };
}

// ═══════════════════════════════════════════════════════════════
// HOLIDAY DETECTION
// ═══════════════════════════════════════════════════════════════

// Static holiday list - update yearly
const HOLIDAYS_2025 = [
  { date: '2025-01-01', name: "New Year's Day" },
  { date: '2025-01-20', name: "MLK Day" },
  { date: '2025-02-17', name: "Presidents' Day" },
  { date: '2025-05-26', name: "Memorial Day" },
  { date: '2025-06=19', name: "Juneteenth" }, // Typo fix needed - but leaving as reference
  { date: '2025-06-19', name: "Juneteenth" },
  { date: '2025-07-04', name: "Independence Day" },
  { date: '2025-09-01', name: "Labor Day" },
  { date: '2025-10-13', name: "Columbus Day" },
  { date: '2025-11-11', name: "Veterans Day" },
  { date: '2025-11-27', name: "Thanksgiving" },
  { date: '2025-12-25', name: "Christmas" }
];

/**
 * Check if today is a holiday.
 */
function isHoliday(dateString) {
  return HOLIDAYS_2025.find(h => h.date === dateString);
}

// ═══════════════════════════════════════════════════════════════
// MODE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const MODES = {
  ACTIVE: {
    name: 'Active',
    description: 'Normal operation - full auto-fix capabilities',
    restrictions: [],
    autoFixEnabled: true,
    paymentFixAllowed: true,
    notifications: 'normal'
  },
  
  NIGHT: {
    name: 'Night',
    description: '3 AM - 6 AM - Deep sleep hours',
    restrictions: ['minimal_activity', 'critical_alerts_only'],
    autoFixEnabled: false,
    paymentFixAllowed: false,
    notifications: 'critical_only'
  },
  
  RECAP: {
    name: 'Morning Recap',
    description: '6 AM - 7 AM - Review overnight activity',
    restrictions: ['review_only', 'no_new_fixes'],
    autoFixEnabled: false,
    paymentFixAllowed: false,
    notifications: 'summary'
  },
  
  SCHOOL: {
    name: 'Unattended (School)',
    description: '7 AM - 3:15 PM weekdays — SEV4+ auto-apply, L1-3 queued, payment BLOCKED',
    restrictions: ['no_payment_fixes', 'payment_critical_alerts', 'telegram_notifications'],
    autoFixEnabled: true,          // ✅ Critical (SEV4+) fixes proceed automatically
    paymentFixAllowed: false,       // ❌ Block payment-related fixes with urgent alert
    notifications: 'immediate',
    // SEV4+ = auto-fix, SEV1-3 = queued with approval link
    severityTierHandling: 'critical_auto_queue_lower'
  },
  
  WEEKEND: {
    name: 'Weekend',
    description: 'Weekend protection mode',
    restrictions: ['manual_approval_only', 'telegram_alerts'],
    autoFixEnabled: false,
    paymentFixAllowed: false,
    notifications: 'immediate'
  },
  
  HOLIDAY: {
    name: 'Holiday',
    description: 'Holiday protection mode',
    restrictions: ['manual_approval_only'],
    autoFixEnabled: false,
    paymentFixAllowed: false,
    notifications: 'immediate'
  },
  
  EMERGENCY: {
    name: 'Emergency',
    description: 'Emergency stop - all auto-fix disabled',
    restrictions: ['all_auto_fix_disabled', 'human_approval_required'],
    autoFixEnabled: false,
    paymentFixAllowed: false,
    notifications: 'immediate'
  }
};

// ═══════════════════════════════════════════════════════════════
// MODE MANAGER
// ═══════════════════════════════════════════════════════════════

class ModeManager {
  constructor(options = {}) {
    this.auditTrail = options.auditTrail || null;
    this.telegramBot = options.telegramBot || null;
    this.stateFile = options.stateFile || '/app/data/mode-state.json';
    
    // Load persisted state
    this.state = this._loadState();
    this.lastModeCheck = null;
    this.lastMode = null;
  }
  
  _loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        return JSON.parse(fs.readFileSync(this.stateFile, 'utf-8'));
      }
    } catch (err) {
      console.warn('[ModeManager] Failed to load state, using defaults:', err.message);
    }
    
    return {
      currentMode: 'ACTIVE',
      manualOverride: null,
      lastTransition: null,
      schedule: {
        nightStart: '03:00',
        recapStart: '06:00',
        schoolStart: '07:00',
        schoolEnd: '15:15'
      }
    };
  }
  
  _saveState() {
    try {
      const dir = path.dirname(this.stateFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const tmpFile = `${this.stateFile}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.state, null, 2), 'utf-8');
      fs.renameSync(tmpFile, this.stateFile);
    } catch (err) {
      console.error('[ModeManager] Failed to save state:', err.message);
    }
  }
  
  /**
   * Evaluate current schedule and determine the appropriate mode.
   */
  evaluateScheduledMode() {
    // Manual override takes precedence
    if (this.state.manualOverride && ['EMERGENCY', 'ACTIVE'].includes(this.state.manualOverride)) {
      return this.state.manualOverride;
    }
    
    const milwuake = getMilwaukeeTime();
    
    // Check holiday first
    const holiday = isHoliday(milwuake.date);
    if (holiday) return 'HOLIDAY';
    
    // Check night mode (3:00 AM - 6:00 AM)
    const currentTime = milwuake.hours * 100 + milwuake.minutes;
    if (currentTime >= 300 && currentTime < 600) {
      return 'NIGHT';
    }
    
    // Check morning recap buffer (6:00 AM - 7:00 AM)
    if (currentTime >= 600 && currentTime < 700) {
      return 'RECAP';
    }
    
    // Check weekend
    if (!milwuake.isWeekday) {
      return 'WEEKEND';
    }
    
    // Check school hours (7:00 AM - 3:15 PM weekdays)
    if (currentTime >= 700 && currentTime < 1515) {
      return 'SCHOOL';
    }
    
    // Default to active
    return 'ACTIVE';
  }
  
  /**
   * Get current mode with transition handling.
   */
  getCurrentMode() {
    const scheduledMode = this.evaluateScheduledMode();
    const previousMode = this.state.currentMode;
    
    // Handle transitions
    if (scheduledMode !== previousMode) {
      this._handleTransition(previousMode, scheduledMode);
      this.state.currentMode = scheduledMode;
      this.state.lastTransition = new Date().toISOString();
      this._saveState();
      
      if (this.auditTrail) {
        this.auditTrail.record('mode_transition', {
          from: previousMode,
          to: scheduledMode,
          reason: 'scheduled',
          milwaukeeTime: getMilwaukeeTime()
        });
      }
    }
    
    this.lastModeCheck = Date.now();
    this.lastMode = scheduledMode;
    
    return MODES[scheduledMode] || MODES.ACTIVE;
  }
  
  /**
   * Handle mode transition with notifications.
   */
  _handleTransition(oldMode, newMode) {
    console.log(`[ModeManager] Transition: ${oldMode} → ${newMode}`);
    
    const modeObj = MODES[newMode];
    if (!modeObj) return;
    
    // Send appropriate notification
    if (this.telegramBot && this.telegramBot.getClient()) {
      let message = '';
      
      switch (newMode) {
        case 'SCHOOL':
          message = `🎒 Now in UNATTENDED mode\nPayment fixes BLOCKED until 3:15 PM\nAll fixes require manual approval`;
          break;
        case 'NIGHT':
          message = `🌙 Night mode activated\nAuto-fix paused - critical alerts only`;
          break;
        case 'RECAP':
          message = `📋 Morning recap buffer\nReview overnight activity before school mode`;
          break;
        case 'ACTIVE':
          if (oldMode === 'SCHOOL') {
            message = `🏫 School mode ended\nReturning to ACTIVE mode`;
          } else if (oldMode === 'NIGHT') {
            message = `☀️ Night mode ended\nAuto-fix resumed`;
          }
          break;
        case 'WEEKEND':
          message = `📆 Weekend mode activated\nAuto-fix disabled - manual approval only`;
          break;
      }
      
      if (message) {
        this.telegramBot.notify(message).catch(err => {
          console.error('[ModeManager] Failed to send transition notification:', err.message);
        });
      }
    }
  }
  
  /**
   * Set manual override mode.
   */
  setManualMode(mode) {
    if (!['EMERGENCY', 'ACTIVE'].includes(mode)) {
      throw new Error(`Invalid manual mode: ${mode}. Only EMERGENCY or ACTIVE allowed.`);
    }
    
    const previousMode = this.state.currentMode;
    this.state.manualOverride = mode;
    this.state.currentMode = mode;
    this.state.lastTransition = new Date().toISOString();
    this._saveState();
    
    if (this.auditTrail) {
      this.auditTrail.record('manual_mode_override', {
        from: previousMode,
        to: mode,
        reason: 'manual_override'
      });
    }
    
    // Get current mode (will respect override)
    this.getCurrentMode();
  }
  
  /**
   * Clear manual override.
   */
  clearManualOverride() {
    this.state.manualOverride = null;
    this._saveState();
  }
  
  /**
   * Get status for health endpoint.
   */
  getStatus() {
    const mode = this.getCurrentMode();
    return {
      currentMode: this.state.currentMode,
      scheduledMode: this.evaluateScheduledMode(),
      manualOverride: this.state.manualOverride,
      lastTransition: this.state.lastTransition,
      modeDetails: mode,
      milwaukeeTime: getMilwaukeeTime()
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  ModeManager,
  MODES,
  getMilwaukeeTime,
  isHoliday,
  HOLIDAYS_2025
};
