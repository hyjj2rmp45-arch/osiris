/**
 * Self-Healing Router
 * 
 * Phase 2: Intelligence Integration
 * 
 * Routes errors to appropriate action based on confidence scoring.
 * Integrates with existing Phase 1 safety layers.
 * 
 * Uses the enhanced confidence engine to determine whether to:
 * - AUTO_FIX: High-confidence, safe changes (confidence ≥ 0.85)
 * - QUEUE: Medium-confidence changes needing review (confidence 0.70-0.85)
 * - ESCALATE: Low-confidence or anomalous changes (confidence 0.50-0.70)
 * - DENY: Very low confidence or safety violations (confidence < 0.50)
 */

'use strict';

const { computeEnhancedConfidence, detectAnomalies, SCORE_THRESHOLDS } = require('./confidence-scoring');
const { isWithinTrustBoundary, filterByTrustBoundary } = require('./trust-boundary');
const { AuditTrail } = require('./audit-trail');
const telegramBot = require('./telegram-bot');

// ═══════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════

class SelfHealingRouter {
  constructor(options = {}) {
    this.auditTrail = options.auditTrail || new AuditTrail();
    this.historicalData = options.historicalData || { knownFixes: [] };
    this.telegramChatId = options.telegramChatId || null;
    this.repoRoot = options.repoRoot || process.cwd();
    
    // Load historical data on init
    this._loadHistoricalData();
  }
  
  _loadHistoricalData() {
    try {
      const knownFixesPath = require('path').join(this.repoRoot, 'known-fixes.json');
      const data = require(knownFixesPath);
      this.historicalData.knownFixes = data.knownFixes || [];
      this.historicalData.successRates = data.successRates || {};
      this.historicalData.baselineTokens = data.baselineTokens || 200;
    } catch (err) {
      // No known-fixes.json yet — start with empty data
      this.historicalData = { knownFixes: [], successRates: {}, baselineTokens: 200 };
    }
  }
  
  /**
   * Route an error to the appropriate action.
   * 
   * @param {object} error - Error info { fingerprint, message, severity, stack, context }
   * @param {object} fixProposal - Proposed fix { pattern, file, diff, severity }
   * @returns {object} - Routing decision
   */
  routeError(error, fixProposal) {
    const correlationId = this.auditTrail.record('routing_started', {
      errorFingerprint: error.fingerprint,
      severity: error.severity,
      fixPattern: fixProposal.pattern
    });
    
    // Step 1: Safety gate check (trust boundary)
    const boundaryCheck = isWithinTrustBoundary(fixProposal.file || 'src/worker.js');
    if (!boundaryCheck.allowed) {
      this._alertBlockedFix(error, fixProposal, boundaryCheck.reason, correlationId);
      
      this.auditTrail.record('fix_denied_by_safety', {
        correlationId,
        reason: boundaryCheck.reason,
        file: fixProposal.file
      });
      
      return {
        action: 'DENY',
        reason: `Trust boundary violation: ${boundaryCheck.reason}`,
        confidence: 0,
        correlationId,
        requiresApproval: false
      };
    }
    
    // Step 2: Enhanced confidence scoring
    const errorContext = {
      functionName: error.functionName,
      errorType: error.type,
      fingerprint: error.fingerprint
    };
    
    const confidence = computeEnhancedConfidence(fixProposal, errorContext, this.historicalData);
    
    // Step 3: Anomaly detection
    const anomalies = detectAnomalies(fixProposal, errorContext, this.historicalData);
    
    // Step 4: Determine action
    let action = confidence.recommendation;
    
    // Override: anomalies always get escalated
    if (anomalies.hasAnomalies && anomalies.count > 0) {
      const criticalAnomalies = anomalies.anomalies.filter(a => a.severity === 'CRITICAL');
      
      if (criticalAnomalies.length > 0) {
        action = 'DENY'; // Critical anomalies = deny
      } else {
        action = 'ESCALATE'; // Non-critical anomalies = escalate
      }
      
      this.auditTrail.record('anomalies_detected', {
        correlationId,
        anomalyCount: anomalies.count,
        overrideAction: action,
        originalRecommendation: confidence.recommendation
      });
    }
    
    // Step 4.5: Time-based mode check
    const modeStatus = this._getCurrentMode();
    if (modeStatus.currentMode === 'SCHOOL' && this._isPaymentCode(fixProposal.file)) {
      // Payment fixes always blocked during school hours
      action = 'QUEUE'; // Queue for manual review
      this.auditTrail.record('payment_fix_blocked_school_mode', {
        correlationId,
        file: fixProposal.file,
        mode: modeStatus.currentMode
      });
    }
    
    // Step 5: Log routing decision
    const routingRecord = this.auditTrail.record('routing_decision', {
      correlationId,
      action,
      confidence: confidence.total,
      confidenceBreakdown: confidence.breakdown,
      anomalies: anomalies.hasAnomalies ? anomalies.count : 0,
      mode: modeStatus.currentMode,
      errorSeverity: error.severity
    });
    
    // Step 6: Notify if needed
    if (action === 'ESCALATE' || action === 'DENY') {
      this._notifyRoutingDecision(error, fixProposal, action, confidence, correlationId);
    }
    
    return {
      action,
      confidence: confidence.total,
      confidenceBreakdown: confidence.breakdown,
      recommendationReason: this._getActionReason(action, confidence, anomalies),
      requiresApproval: action !== 'AUTO_FIX',
      correlationId,
      anomalies: anomalies.hasAnomalies ? anomalies.anomalies : null
    };
  }
  
  /**
   * Check if a file contains payment-related code.
   */
  _isPaymentCode(filePath) {
    if (!filePath) return false;
    
    const paymentPatterns = [
      'src/payment',
      'src/subscription',
      'src/wallet',
      'payment',
      'stripe',
      'solana',
      'telegram/auth'
    ];
    
    const filePathLower = filePath.toLowerCase();
    return paymentPatterns.some(p => filePathLower.includes(p));
  }
  
  /**
   * Get current mode from mode manager (if available).
   */
  _getCurrentMode() {
    try {
      // Check if mode manager is available globally
      if (global.__modeManager) {
        return global.__modeManager.getStatus();
      }
    } catch (err) {
      // Fall back
    }
    
    return { currentMode: 'ACTIVE', scheduledMode: 'ACTIVE' };
  }
  
  /**
   * Get human-readable reason for routing decision.
   */
  _getActionReason(action, confidence, anomalies) {
    switch (action) {
      case 'AUTO_FIX':
        return `High confidence fix (${Math.round(confidence.total * 100)}%) approved for autonomous application`;
      
      case 'QUEUE':
        return `Medium confidence fix (${Math.round(confidence.total * 100)}%) queued for human review`;
      
      case 'ESCALATE':
        return `Low confidence (${Math.round(confidence.total * 100)}%) or anomalies detected - escalated to human`;
      
      case 'DENY':
        return `Fix denied - safety violation or very low confidence (${Math.round(confidence.total * 100)}%)`;
      
      default:
        return `Decision based on confidence score: ${Math.round(confidence.total * 100)}%`;
    }
  }
  
  /**
   * Alert when a fix is blocked.
   */
  async _alertBlockedFix(error, fixProposal, reason, correlationId) {
    const message = `🚨 <b>Fix Blocked</b>
    
Error: ${error.fingerprint || 'unknown'}
File: ${fixProposal.file || 'unknown'}
Pattern: ${fixProposal.pattern || 'unknown'}
Reason: ${reason}
Action: DENY
Correlation: ${correlationId}`;
    
    await telegramBot.alert(message, { disableNotification: false });
  }
  
  /**
   * Notify on escalated/denied decisions.
   */
  async _notifyRoutingDecision(error, fixProposal, action, confidence, correlationId) {
    const modeStatus = this._getCurrentMode();
    
    const message = `⚠️ <b>Fix ${action}</b>
    
Error: ${error.fingerprint || 'unknown'}
Pattern: ${fixProposal.pattern || 'unknown'}
Confidence: ${Math.round(confidence.total * 100)}%
Mode: ${modeStatus.currentMode}
Correlation: ${correlationId}`;
    
    if (modeStatus.currentMode === 'SCHOOL' && this._isPaymentCode(fixProposal.file)) {
      message += '\n\nBlocked: Payment code fix during school hours';
    }
    
    await telegramBot.notify(message, { disableNotification: false });
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════

let routerInstance = null;

function createRouter(options = {}) {
  if (!routerInstance) {
    routerInstance = new SelfHealingRouter(options);
  }
  return routerInstance;
}

function getRouter() {
  if (!routerInstance) {
    throw new Error('Router not initialized. Call createRouter() first.');
  }
  return routerInstance;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  SelfHealingRouter,
  createRouter,
  getRouter
};
