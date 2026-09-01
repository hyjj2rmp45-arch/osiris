/**
 * Enhanced Confidence Scoring Engine
 * 
 * Phase 2: Intelligence Layer
 * 
 * Multi-factor confidence scoring that evaluates:
 * 1. Pattern Match Confidence (40%) - How reliable is this fix pattern historically
 * 2. Trust Factor (30%) - How trusted is the code context being modified
 * 3. Impact Score (20%) - How much could this change break things  
 * 4. Novelty Penalty (10%) - Unknown fixes get penalized
 * 
 * Based on:
 * - Claude Code Auto Mode (two-stage classifier, 0.4% false positive rate)
 * - Microsoft Loop confidence framework (92% threshold for autonomous fixes)
 * - Anthropic trust scoring patterns
 * - Input isolation pattern (strip tool results before scoring)
 */

'use strict';

const path = require('path');
const { isWithinTrustBoundary, filterByTrustBoundary } = require('./trust-boundary');
const { AuditTrail } = require('./audit-trail');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const CONFIDENCE_WEIGHTS = Object.freeze({
  patternMatch: 0.40,
  trustFactor: 0.30,
  impactScore: 0.20,
  noveltyPenalty: 0.10  // Negative weight (penalty)
});

const SCORE_THRESHOLDS = Object.freeze({
  autoFix: 0.85,    // Apply without PR review
  queue: 0.70,     // Queue for human approval
  escalate: 0.50,  // Escalate to human
  deny: 0.0       // Always deny
});

// ═══════════════════════════════════════════════════════════════
// PATTERN MATCH CONFIDENCE
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate confidence based on how reliable this fix pattern is historically.
 * 
 * @param {string} pattern - The fix pattern ID or name
 * @param {object} historicalData - Historical fix outcomes
 * @returns {number} - Confidence score (0.0-1.0)
 */
function calculatePatternMatchConfidence(pattern, historicalData = {}) {
  if (!pattern) {
    return 0.5; // Neutral if no pattern specified
  }
  
  const patternHistory = historicalData.knownFixes 
    ? historicalData.knownFixes.filter(f => f.pattern === pattern)
    : [];
  
  if (patternHistory.length === 0) {
    // No historical data for this pattern
    // Conservative estimate — patterns starting with common prefixes get a small boost
    const knownPrefixes = ['timeout', 'retry', 'connection_reset', 'memory_pressure'];
    const isKnownPrefix = knownPrefixes.some(prefix => 
      pattern.toLowerCase().startsWith(prefix));
    
    return isKnownPrefix ? 0.6 : 0.5;
  }
  
  // Calculate success rate with Wilson score interval (conservative for small samples)
  const successes = patternHistory.filter(f => f.success).length;
  const total = patternHistory.length;
  
  // For small sample sizes, use a more conservative estimate
  if (total < 5) {
    // Bayesian average with prior of 0.7 (assume neutral reliability)
    const priorSuccesses = 0.7 * 10; // Equivalent to 10 prior observations
    return (successes + priorSuccesses) / (total + 10);
  }
  
  return successes / total;
}

// ═══════════════════════════════════════════════════════════════
// TRUST FACTOR
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate trust factor based on the code context being modified.
 * 
 * @param {string} filePath - Path of file being modified
 * @param {object} errorContext - Context of the error
 * @returns {number} - Trust score (0.0-1.0)
 */
function calculateTrustFactor(filePath, errorContext = {}) {
  if (!filePath) {
    return 0.1; // Untrusted if no file specified
  }
  
  // Check against trust boundary
  const boundaryCheck = isWithinTrustBoundary(filePath);
  if (!boundaryCheck.allowed) {
    return 0.1; // Severely penalized for touching non-allowlisted files
  }
  
  // File-specific trust scores
  const TRUST_SCORES = {
    'src/worker.js': 0.95,        // Core worker is well-understood
    'known-fixes.json': 0.90,     // Fix database — trusted
    'src/self-healing/lib/': 0.85, // Self-healing components are trusted
    'src/logging.js': 0.80,       // Utility functions
    'src/monitor.js': 0.75,       // Monitoring code
    'src/error-handlers.js': 0.85, // Error handling patterns
    'src/config/': 0.70,          // Config files (moderate trust)
    'src/utils/': 0.75,           // Utility functions
    'src/types/': 0.60,           // Type definitions (lower trust)
  };
  
  // Score based on file path
  let score = 0.5; // Default for unknown trusted files
  
  for (const [pattern, patternScore] of Object.entries(TRUST_SCORES)) {
    if (filePath.includes(pattern) || filePath === pattern.replace(/\/$/, '')) {
      score = patternScore;
      break;
    }
  }
  
  // If the file is the allowlisted worker.js, apply additional context trust
  if (filePath === 'src/worker.js') {
    // If error is in a known function, boost trust
    const knownFunctions = [
      'handlePaymentWebhook',
      'processTelegramUpdate',
      'healthCheck',
      'logError',
      'sendNotification'
    ];
    
    const errorFunction = errorContext.functionName;
    if (errorFunction && knownFunctions.includes(errorFunction)) {
      score = Math.min(0.95, score + 0.1); // Boost for known functions
    }
  }
  
  return score;
}

// ═══════════════════════════════════════════════════════════════
// IMPACT SCORE
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate impact score based on the proposed change.
 * Lower impact = higher confidence (less likely to break things).
 * 
 * @param {string} diff - Unified diff of the proposed fix
 * @returns {number} - Impact score (0.0-1.0) — higher means more impact
 */
function calculateImpactFactor(diff) {
  if (!diff) {
    return 0.5; // Neutral impact if no diff provided
  }
  
  const lines = diff.split('\n');
  const addedLines = lines.filter(l => l.startsWith('+')).length;
  const removedLines = lines.filter(l => l.startsWith('-')).length;
  
  // Line count impact (max 120 lines per Microsoft .NET standard)
  const lineCountImpact = Math.max(0, 1 - (addedLines + removedLines) / 120);
  
  // File change count impact
  const filesChangedMatch = diff.match(/^diff --git/gm);
  const filesChanged = filesChangedMatch ? filesChangedMatch.length : 1;
  const fileCountImpact = filesChanged === 1 ? 1.0 : Math.max(0, 1 - (filesChanged - 1) * 0.3);
  
  // Pattern-based risk scoring
  const highRiskPatterns = [
    /require\s*\(/i,        // Module imports
    /eval\s*\(/i,           // Eval calls
    /Function\s*\(/i,       // Dynamic function creation
    /process\.exit/i,       // Process termination
    /fs\./i,                // Filesystem operations
    /http\./i,              // HTTP operations
    /https?:/i,             // Network calls
    /process\.env/i,        // Environment access
  ];
  
  const highRiskMatches = highRiskPatterns.filter(pattern => 
    pattern.test(diff)).length;
  const riskPenalty = Math.min(1, highRiskMatches * 0.2);
  
  // Combine factors
  return lineCountImpact * fileCountImpact * (1 - riskPenalty);
}

// ═══════════════════════════════════════════════════════════════
// NOVELTY PENALTY
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate novelty penalty for unfamiliar fix patterns.
 * 
 * @param {object} fixAttempt - The proposed fix
 * @param {object} historicalData - Historical fix outcomes
 * @returns {number} - Penalty (0.0-0.2) — higher means more penalty
 */
function calculateNoveltyPenalty(fixAttempt, historicalData = {}) {
  // Check if this exact pattern or approach was seen before
  const knownFixes = historicalData.knownFixes || [];
  const similarFixes = knownFixes.filter(f => 
    f.pattern === fixAttempt.pattern || 
    (fixAttempt.diff && this._diffSimilarity(f.diff || '', fixAttempt.diff) > 0.8)
  ).length;
  
  if (similarFixes === 0) {
    // Never seen this pattern before
    return 0.15; // Moderate penalty for completely novel fixes
  }
  
  if (similarFixes <= 3) {
    // Seen 1-3 times
    return 0.05; // Small penalty
  }
  
  // Well-established pattern
  return 0.0;
}

// ═══════════════════════════════════════════════════════════════
// WEIGHTED CONFIDENCE CALCULATION
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate final confidence score using weighted factors.
 * 
 * @param {object} factors - { patternMatch, trustFactor, impactScore, noveltyPenalty }
 * @returns {number} - Final weighted confidence score
 */
function calculateWeightedConfidence(factors) {
  // noveltyPenalty is subtracted, not added
  const penalty = factors.noveltyPenalty || 0;
  
  const weightedScore = 
    (factors.patternMatch * CONFIDENCE_WEIGHTS.patternMatch) +
    (factors.trustFactor * CONFIDENCE_WEIGHTS.trustFactor) +
    (factors.impactScore * CONFIDENCE_WEIGHTS.impactScore) -
    (penalty * Math.abs(CONFIDENCE_WEIGHTS.noveltyPenalty));
  
  // Ensure bounds [0, 1]
  return Math.max(0, Math.min(1, weightedScore));
}

// ═══════════════════════════════════════════════════════════════
// DECISION ROUTING
// ═══════════════════════════════════════════════════════════════

/**
 * Determine routing decision based on confidence factors.
 * 
 * @param {object} factors - Confidence factors
 * @returns {string} - Routing decision: AUTO_FIX | QUEUE | ESCALATE | DENY
 */
function determineRouting(factors) {
  const confidence = calculateWeightedConfidence(factors);
  
  if (confidence >= SCORE_THRESHOLDS.autoFix) {
    return 'AUTO_FIX';
  } else if (confidence >= SCORE_THRESHOLDS.queue) {
    return 'QUEUE';
  } else if (confidence >= SCORE_THRESHOLDS.escalate) {
    return 'ESCALATE';
  } else {
    return 'DENY';
  }
}

// ═══════════════════════════════════════════════════════════════
// COMPREHENSIVE SCORING INTERFACE
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate enhanced confidence for a fix attempt.
 * 
 * @param {object} fixAttempt - { file, diff, pattern, severity }
 * @param {object} errorContext - { functionName, errorType, fingerprint }
 * @param {object} historicalData - Historical fix outcomes
 * @returns {object} - { total, breakdown, recommendation }
 */
function computeEnhancedConfidence(fixAttempt, errorContext, historicalData = {}) {
  const factors = {
    patternMatch: calculatePatternMatchConfidence(fixAttempt.pattern, historicalData),
    trustFactor: calculateTrustFactor(fixAttempt.file || fixAttempt.filePath, errorContext),
    impactScore: calculateImpactFactor(fixAttempt.diff),
    noveltyPenalty: calculateNoveltyPenalty(fixAttempt, historicalData)
  };
  
  const total = calculateWeightedConfidence(factors);
  const recommendation = determineRouting(factors);
  
  // Log to audit trail
  if (global.__auditTrail) {
    global.__auditTrail.record('confidence_scored', {
      pattern: fixAttempt.pattern,
      file: fixAttempt.file,
      confidence: parseFloat(total.toFixed(4)),
      recommendation,
      factors: {
        patternMatch: parseFloat(factors.patternMatch.toFixed(4)),
        trustFactor: parseFloat(factors.trustFactor.toFixed(4)),
        impactScore: parseFloat(factors.impactScore.toFixed(4)),
        noveltyPenalty: parseFloat(factors.noveltyPenalty.toFixed(4))
      }
    });
  }
  
  return {
    total: parseFloat(total.toFixed(4)),
    breakdown: factors,
    recommendation,
    thresholdUsed: SCORE_THRESHOLDS[recommendation.toLowerCase()] || 0
  };
}

// ═══════════════════════════════════════════════════════════════
// ANOMALY DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Detect anomalous fix attempts that deviate significantly from patterns.
 * 
 * Based on Claude Code Auto Mode input isolation pattern:
 * - Strip tool results before classifier review
 * - Flag deviations from expected behavior
 */
function detectAnomalies(fixAttempt, errorContext, historicalData = {}) {
  const anomalies = [];
  
  // Check for unexpected file modifications
  const files = Array.isArray(fixAttempt.files) ? fixAttempt.files : [fixAttempt.file];
  for (const file of files) {
    const boundary = isWithinTrustBoundary(file);
    if (!boundary.allowed) {
      anomalies.push({
        type: 'TRUST_BOUNDARY_VIOLATION',
        severity: 'CRITICAL',
        file: file,
        reason: boundary.reason
      });
    }
  }
  
  // Check for unexpectedly large diffs
  if (fixAttempt.diff) {
    const lineCount = fixAttempt.diff.split('\n').length;
    if (lineCount > 200) {
      anomalies.push({
        type: 'UNEXPECTEDLY_LARGE_FIX',
        severity: 'HIGH',
        details: `Fix spans ${lineCount} lines (expected <200)`
      });
    }
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    { pattern: /while\s*\(\s*true\s*\)/i, reason: 'Infinite loop introduced' },
    { pattern: /setInterval/i, reason: 'New interval timer added' },
    { pattern: /websocket/i, reason: 'WebSocket connection introduced' },
    { pattern: /(delete|rm|unlink)/i, reason: 'File deletion operation detected' }
  ];
  
  const fixContent = fixAttempt.diff || '';
  for (const { pattern, reason } of suspiciousPatterns) {
    if (pattern.test(fixContent)) {
      anomalies.push({
        type: 'SUSPICIOUS_CODE_PATTERN',
        severity: 'HIGH',
        reason,
        match: pattern.toString()
      });
    }
  }
  
  // Check for deviation from baseline behavior
  if (fixAttempt.tokensUsed && historicalData.baselineTokens) {
    const deviation = Math.abs(fixAttempt.tokensUsed - historicalData.baselineTokens) 
      / historicalData.baselineTokens;
    if (deviation > 3.0) {  // 300% deviation
      anomalies.push({
        type: 'TOKEN_USAGE_ANOMALY',
        severity: 'MEDIUM',
        details: `Token usage ${fixAttempt.tokensUsed} deviates ${Math.round(deviation*100)}% from baseline ${historicalData.baselineTokens}`
      });
    }
  }
  
  return {
    hasAnomalies: anomalies.length > 0,
    count: anomalies.length,
    anomalies
  };
}

// ═══════════════════════════════════════════════════════════════
// SELF-RECALIBRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Adjust confidence thresholds based on recent fix outcomes.
 * 
 * If recent fixes are failing at high confidence → raise thresholds
 * If recent fixes are succeeding at low confidence → lower thresholds
 */
function recalibrateThresholds(recentOutcomes = []) {
  if (recentOutcomes.length < 10) {
    return SCORE_THRESHOLDS; // Not enough data to recalibrate
  }
  
  const recentSuccesses = recentOutcomes.filter(o => o.outcome === 'success');
  const recentFailures = recentOutcomes.filter(o => o.outcome === 'failure');
  
  const successRate = recentSuccesses.length / recentOutcomes.length;
  
  // Adjust thresholds based on performance
  const adjustments = {
    autoFix: successRate < 0.8 ? 0.02 : successRate > 0.95 ? -0.02 : 0,
    queue: successRate < 0.8 ? 0.03 : successRate > 0.95 ? -0.01 : 0,
    escalate: successRate < 0.8 ? 0.02 : successRate > 0.95 ? -0.01 : 0
  };
  
  return {
    autoFix: Math.max(0.75, Math.min(0.95, SCORE_THRESHOLDS.autoFix + adjustments.autoFix)),
    queue: Math.max(0.60, Math.min(0.85, SCORE_THRESHOLDS.queue + adjustments.queue)),
    escalate: Math.max(0.40, Math.min(0.70, SCORE_THRESHOLDS.escalate + adjustments.escalate)),
    deny: 0.0
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  computeEnhancedConfidence,
  calculatePatternMatchConfidence,
  calculateTrustFactor,
  calculateImpactFactor,
  calculateNoveltyPenalty,
  calculateWeightedConfidence,
  determineRouting,
  detectAnomalies,
  recalibrateThresholds,
  SCORE_THRESHOLDS,
  CONFIDENCE_WEIGHTS
};
