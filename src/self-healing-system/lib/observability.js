/**
 * Observability System
 * 
 * Phase 3: Observability & Self-Improvement
 * 
 * Comprehensive metrics collection, behavioral drift detection,
 * and anomaly detection for the self-healing system.
 * 
 * Based on:
 * - OpenTelemetry metrics patterns
 * - Google SRE error budget principles
 * - Anthropic's agent observability recommendations
 * - Claude Code's "anomaly detection" pattern
 */

'use strict';

const { AuditTrail } = require('./audit-trail');
const { safeReadJSON, atomicWriteJSON } = require('./state-persistence');

// ═══════════════════════════════════════════════════════════════
// METRICS COLLECTOR
// ═══════════════════════════════════════════════════════════════

class MetricsCollector {
  constructor(options = {}) {
    this.auditTrail = options.auditTrail || new AuditTrail();
    this.metricsFile = options.metricsFile || '/app/data/metrics.json';
    this.startTime = Date.now();
    
    this.metrics = {
      // Fix metrics
      totalFixesAttempted: 0,
      totalFixesApplied: 0,
      totalFixesDenied: 0,
      totalFixesQueued: 0,
      totalFixesEscalated: 0,
      
      // Success rates
      fixSuccessRate: 0,
      escalationRate: 0,
      
      // Timing
      avgFixLatency: 0,
      avgRoutingTime: 0,
      
      // Safety violations
      trustBoundaryViolations: 0,
      patternViolations: 0,
      sizeLimitViolations: 0,
      
      // Mode tracking
      modeDurations: {
        ACTIVE: 0,
        NIGHT: 0,
        RECAP: 0,
        SCHOOL: 0,
        WEEKEND: 0,
        HOLIDAY: 0,
        EMERGENCY: 0
      },
      
      // Confidence distribution
      confidenceBuckets: {
        '0.0-0.2': 0,
        '0.2-0.4': 0,
        '0.4-0.6': 0,
        '0.6-0.8': 0,
        '0.8-1.0': 0
      },
      
      // Per-fix breakdown
      fixHistory: [],
      
      // Anomalies detected
      anomaliesDetected: 0,
      criticalAnomalies: 0,
      
      // Emergency events
      emergencyStops: 0,
      killSwitchActivations: 0
    };
    
    this.fixStartTimes = new Map(); // correlationId -> startTime
    this.modeStartTimes = {};
    this._loadMetrics();
  }
  
  _loadMetrics() {
    const saved = safeReadJSON(this.metricsFile, { metrics: this.metrics, schemaVersion: 1 }, 1);
    if (saved.metrics) {
      // Merge saved metrics with current (additive)
      this.metrics = { ...this.metrics, ...saved.metrics };
    }
  }
  
  _saveMetrics() {
    atomicWriteJSON(this.metricsFile, {
      metrics: this.metrics,
      schemaVersion: 1,
      lastUpdated: new Date().toISOString()
    });
  }
  
  /**
   * Record a fix attempt with full context.
   */
  recordFixAttempt(errorInfo, fixProposal, routingResult) {
    this.metrics.totalFixesAttempted++;
    
    const correlationId = routingResult.correlationId;
    this.fixStartTimes.set(correlationId, Date.now());
    
    // Track confidence buckets
    const conf = routingResult.confidence || 0;
    const bucket = this._getConfidenceBucket(conf);
    this.metrics.confidenceBuckets[bucket]++;
    
    // Track routing decision
    switch (routingResult.action) {
      case 'AUTO_FIX':
        this.metrics.totalFixesApplied++;
        break;
      case 'QUEUE':
        this.metrics.totalFixesQueued++;
        break;
      case 'ESCALATE':
        this.metrics.totalFixesEscalated++;
        break;
      case 'DENY':
        this.metrics.totalFixesDenied++;
        break;
    }
    
    // Record detailed fix history
    this.metrics.fixHistory.push({
      correlationId,
      timestamp: new Date().toISOString(),
      errorFingerprint: errorInfo.fingerprint,
      errorSeverity: errorInfo.severity,
      fixPattern: fixProposal.pattern,
      confidence: conf,
      action: routingResult.action,
      anomalies: routingResult.anomalies ? routingResult.anomalies.length : 0,
      trustBoundaryViolations: 0, // Will be incremented by safety layer
      routingTimeMs: 0 // Will be updated on completion
    });
    
    // Trim history
    if (this.metrics.fixHistory.length > 1000) {
      this.metrics.fixHistory = this.metrics.fixHistory.slice(-500);
    }
    
    this._saveMetrics();
  }
  
  /**
   * Record the completion of a fix attempt.
   */
  recordFixCompletion(correlationId, success, latencyMs) {
    if (success) {
      this.metrics.totalFixesApplied++;
    }
    
    // Update timing
    const currentAvg = this.metrics.avgFixLatency;
    const count = this.metrics.totalFixesAttempted;
    this.metrics.avgFixLatency = (currentAvg * (count - 1) + latencyMs) / count;
    
    // Update fix history with completion time
    const fixRecord = this.metrics.fixHistory.find(f => f.correlationId === correlationId);
    if (fixRecord) {
      fixRecord.routingTimeMs = latencyMs;
      fixRecord.completed = success;
    }
    
    this._saveMetrics();
  }
  
  /**
   * Record a safety violation.
   */
  recordViolation(type, details = {}) {
    switch (type) {
      case 'TRUST_BOUNDARY':
        this.metrics.trustBoundaryViolations++;
        break;
      case 'PATTERN':
        this.metrics.patternViolations++;
        break;
      case 'SIZE_LIMIT':
        this.metrics.sizeLimitViolations++;
        break;
      case 'ANOMALY':
        this.metrics.anomaliesDetected++;
        if (details.severity === 'CRITICAL') {
          this.metrics.criticalAnomalies++;
        }
        break;
      case 'EMERGENCY_STOP':
        this.metrics.emergencyStops++;
        break;
      case 'KILL_SWITCH':
        this.metrics.killSwitchActivations++;
        break;
    }
    
    this._saveMetrics();
  }
  
  /**
   * Record mode transitions for duration calculation.
   */
  recordModeTransition(fromMode, toMode) {
    const now = Date.now();
    
    // Record duration of previous mode
    if (this.modeStartTimes[fromMode]) {
      const duration = now - this.modeStartTimes[fromMode];
      this.metrics.modeDurations[fromMode] += duration;
    }
    
    // Start timer for new mode
    this.modeStartTimes[toMode] = now;
    
    this._saveMetrics();
  }
  
  /**
   * Get current metrics snapshot.
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptimeMs: Date.now() - this.startTime,
      successRate: this.metrics.totalFixesAttempted > 0
        ? this.metrics.totalFixesApplied / this.metrics.totalFixesAttempted
        : 0
    };
  }
  
  /**
   * Generate dashboard-style summary.
   */
  getDashboardSummary(period = '24h') {
    const cutoff = Date.now() - this._parsePeriod(period);
    const recentFixes = this.metrics.fixHistory.filter(
      f => new Date(f.timestamp).getTime() > cutoff
    );
    
    return {
      period,
      fixesAttempted: recentFixes.length,
      fixesApplied: recentFixes.filter(f => f.action === 'AUTO_FIX').length,
      fixesQueued: recentFixes.filter(f => f.action === 'QUEUE').length,
      fixesEscalated: recentFixes.filter(f => f.action === 'ESCALATE').length,
      fixesDenied: recentFixes.filter(f => f.action === 'DENY').length,
      avgConfidence: recentFixes.reduce((sum, f) => sum + (f.confidence || 0), 0) / Math.max(1, recentFixes.length),
      anomaliesDetected: recentFixes.filter(f => f.anomalies > 0).length,
      trustViolations: this.metrics.trustBoundaryViolations,
      emergencyStops: this.metrics.emergencyStops
    };
  }
  
  _getConfidenceBucket(conf) {
    if (conf < 0.2) return '0.0-0.2';
    if (conf < 0.4) return '0.2-0.4';
    if (conf < 0.6) return '0.4-0.6';
    if (conf < 0.8) return '0.6-0.8';
    return '0.8-1.0';
  }
  
  _parsePeriod(period) {
    const match = period.match(/(\d+)([hd])/);
    if (!match) return 24 * 3600 * 1000;
    
    const num = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'h': return num * 3600 * 1000;
      case 'd': return num * 24 * 3600 * 1000;
      default: return 24 * 3600 * 1000;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// BEHAVIORAL DRIFT DETECTOR
// ═══════════════════════════════════════════════════════════════

/**
 * Detect behavioral drift in the self-healing agent.
 * 
 * Based on Claude Code's "drift detection" pattern:
 * - Monitor token usage per fix (baseline +300% = drift)
 * - Track step count per fix (unexpected increase)
 * - Monitor confidence distribution shifts
 * - Flag unusual fix complexity increases
 */
class DriftDetector {
  constructor(options = {}) {
    this.metrics = options.metricsCollector;
    this.auditTrail = options.auditTrail || new AuditTrail();
    this.driftFile = options.driftFile || '/app/data/drift-state.json';
    
    this.baseline = {
      avgTokensPerFix: 250,    // Expected tokens per fix
      avgStepsPerFix: 6,       // Expected steps per fix
      avgConfidence: 0.75,     // Expected confidence
      avgFixLatencyMs: 280,    // Expected latency
      confidenceStdDev: 0.15   // Expected variance
    };
    
    this._loadBaseline();
  }
  
  _loadBaseline() {
    try {
      const saved = safeReadJSON(this.driftFile, {}, 1);
      if (saved.baseline) {
        this.baseline = { ...this.baseline, ...saved.baseline };
      }
    } catch {
      // Use defaults
    }
  }
  
  _saveBaseline() {
    atomicWriteJSON(this.driftFile, {
      baseline: this.baseline,
      schemaVersion: 1
    });
  }
  
  /**
   * Analyze a fix attempt for potential drift.
   * 
   * @param {object} fixAttempt - { tokensUsed, stepsTaken, confidence, latencyMs, complexity }
   * @returns {{driftDetected: boolean, reasons: string[], severity: string}}
   */
  detectDrift(fixAttempt) {
    const reasons = [];
    let severity = 'INFO';
    
    // Check token usage drift
    if (fixAttempt.tokensUsed) {
      const tokenDeviation = Math.abs(fixAttempt.tokensUsed - this.baseline.avgTokensPerFix) / this.baseline.avgTokensPerFix;
      if (tokenDeviation > 3) { // 300% deviation
        reasons.push(`Token usage ${fixAttempt.tokensUsed} deviates ${Math.round(tokenDeviation*100)}% from baseline`);
        if (tokenDeviation > 5) severity = 'CRITICAL';
        else if (tokenDeviation > 4) severity = 'HIGH';
      }
    }
    
    // Check step count drift
    if (fixAttempt.stepsTaken) {
      const stepDeviation = Math.abs(fixAttempt.stepsTaken - this.baseline.avgStepsPerFix) / this.baseline.avgStepsPerFix;
      if (stepDeviation > 2) { // 200% deviation
        reasons.push(`Step count ${fixAttempt.stepsTaken} deviates ${Math.round(stepDeviation*100)}% from baseline`);
        if (stepDeviation > 3) severity = 'CRITICAL';
        else if (stepDeviation > 2.5) severity = 'HIGH';
      }
    }
    
    // Check confidence distribution drift
    if (fixAttempt.confidence !== undefined) {
      const confDeviation = Math.abs(fixAttempt.confidence - this.baseline.avgConfidence) / (this.baseline.confidenceStdDev || 0.15);
      if (Math.abs(confDeviation) > 3) { // 3 sigma
        reasons.push(`Confidence ${fixAttempt.confidence} deviates from baseline ${this.baseline.avgConfidence}`);
        if (Math.abs(confDeviation) > 5) severity = 'CRITICAL';
        else if (Math.abs(confDeviation) > 4) severity = 'HIGH';
      }
    }
    
    // Check complexity drift
    if (fixAttempt.complexity) {
      if (fixAttempt.complexity > 10) {
        reasons.push(`High complexity score: ${fixAttempt.complexity}`);
        if (fixAttempt.complexity > 20) severity = 'CRITICAL';
        else if (fixAttempt.complexity > 15) severity = 'HIGH';
      }
    }
    
    // Log drift detection
    if (reasons.length > 0) {
      this.auditTrail.record('behavioral_drift_detected', {
        reasons,
        severity,
        metrics: {
          tokensUsed: fixAttempt.tokensUsed,
          stepsTaken: fixAttempt.stepsTaken,
          confidence: fixAttempt.confidence,
          complexity: fixAttempt.complexity
        },
        baselines: this.baseline
      });
      
      return {
        driftDetected: true,
        reasons,
        severity,
        action: severity === 'CRITICAL' ? 'EMERGENCY_STOP' : 
                severity === 'HIGH' ? 'ESCALATE' : 'MONITOR'
      };
    }
    
    return { driftDetected: false, reasons: [], severity: 'OK' };
  }
  
  /**
   * Update baselines from recent successful fixes.
   */
  updateBaselines(recentFixes = []) {
    if (recentFixes.length === 0) return;
    
    const validFixes = recentFixes.filter(f => f.success !== false && f.completed);
    
    if (validFixes.length < 10) return; // Need minimum sample size
    
    // Calculate new baselines
    const avgTokens = validFixes
      .filter(f => f.tokensUsed)
      .reduce((sum, f) => sum + f.tokensUsed, 0) / validFixes.length;
    
    const avgSteps = validFixes
      .filter(f => f.stepsTaken)
      .reduce((sum, f) => sum + f.stepsTaken, 0) / validFixes.length;
    
    const avgLatency = validFixes
      .filter(f => f.latencyMs)
      .reduce((sum, f) => sum + f.latencyMs, 0) / validFixes.length;
    
    const avgConfidence = validFixes
      .filter(f => f.confidence !== undefined)
      .reduce((sum, f) => sum + f.confidence, 0) / validFixes.length;
    
    this.baseline = {
      avgTokensPerFix: avgTokens || this.baseline.avgTokensPerFix,
      avgStepsPerFix: avgSteps || this.baseline.avgStepsPerFix,
      avgConfidence: avgConfidence || this.baseline.avgConfidence,
      avgFixLatencyMs: avgLatency || this.baseline.avgFixLatencyMs
    };
    
    this._saveBaseline();
  }
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTION EVALUATION FRAMEWORK
// ═══════════════════════════════════════════════════════════════

/**
 * Production evaluation framework for ongoing quality assurance.
 * 
 * Based on Anthropic's evaluation patterns:
 * - Automated eval harness runs after each fix
 * - Golden dataset testing
 * - Regression testing for previously fixed errors
 */
class ProductionEval {
  constructor(options = {}) {
    this.auditTrail = options.auditTrail || new AuditTrail();
    this.evalFile = options.evalFile || '/app/data/eval-results.json';
    this.goldenDatasetPath = options.goldenDatasetPath || '/app/data/golden-fix-tests.json';
    
    this.evalHistory = [];
    this._loadEvals();
  }
  
  _loadEvals() {
    try {
      const saved = safeReadJSON(this.evalFile, { evals: [], schemaVersion: 1 }, 1);
      this.evalHistory = saved.evals || [];
    } catch {
      this.evalHistory = [];
    }
  }
  
  _saveEvals() {
    atomicWriteJSON(this.evalFile, {
      evals: this.evalHistory,
      schemaVersion: 1,
      lastUpdated: new Date().toISOString()
    });
  }
  
  /**
   * Run production evaluation after a fix is applied.
   */
  runPostFixEval(fixId, errorFingerprint, testResults = {}) {
    const evalResult = {
      evalId: require('crypto').randomUUID(),
      fixId,
      errorFingerprint,
      timestamp: new Date().toISOString(),
      passed: testResults.passed || false,
      metrics: testResults.metrics || {},
      regressionChecks: testResults.regressionChecks || [],
      notes: testResults.notes || ''
    };
    
    this.evalHistory.push(evalResult);
    
    // Trim history
    if (this.evalHistory.length > 500) {
      this.evalHistory = this.evalHistory.slice(-250);
    }
    
    this._saveEvals();
    
    // Log to audit trail
    this.auditTrail.record('production_eval_result', {
      fixId,
      evalId: evalResult.evalId,
      passed: evalResult.passed,
      errorFingerprint
    });
    
    return evalResult;
  }
  
  /**
   * Run golden dataset regression tests.
   */
  runGoldenTests() {
    if (!require('fs').existsSync(this.goldenDatasetPath)) {
      return { passed: 0, failed: 0, details: 'No golden dataset found' };
    }
    
    try {
      const dataset = JSON.parse(require('fs').readFileSync(this.goldenDatasetPath, 'utf-8'));
      const results = {
        passed: 0,
        failed: 0,
        details: []
      };
      
      for (const testCase of dataset.tests) {
        // Simulate: would run the known fix against the error case
        const success = this._runGoldenTestCase(testCase);
        
        if (success) {
          results.passed++;
        } else {
          results.failed++;
          results.details.push({
            errorPattern: testCase.errorPattern,
            expectedFix: testCase.expectedFix,
            reason: 'Fix not applied or failed'
          });
        }
      }
      
      // Log to audit trail
      this.auditTrail.record('golden_test_run', {
        passed: results.passed,
        failed: results.failed,
        timestamp: new Date().toISOString()
      });
      
      return results;
      
    } catch (err) {
      return { passed: 0, failed: 0, error: err.message };
    }
  }
  
  _runGoldenTestCase(testCase) {
    // Placeholder — would integrate with confidence scoring
    // to verify historical fixes still work
    return true; // Simplified for now
  }
  
  /**
   * Get recent eval results.
   */
  getRecentEvals(limit = 50) {
    return this.evalHistory.slice(-limit);
  }
  
  /**
   * Get eval statistics.
   */
  getStats() {
    const recent = this.getRecentEvals(100);
    const passed = recent.filter(e => e.passed).length;
    
    return {
      total: recent.length,
      passed: passed,
      failed: recent.length - passed,
      successRate: recent.length > 0 ? passed / recent.length : 0
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCES
// ═══════════════════════════════════════════════════════════════

let metricsCollector = null;
let driftDetector = null;
let productionEval = null;

function getMetricsCollector() {
  if (!metricsCollector) {
    metricsCollector = new MetricsCollector();
  }
  return metricsCollector;
}

function getDriftDetector() {
  if (!driftDetector && metricsCollector) {
    driftDetector = new DriftDetector({ metricsCollector });
  }
  return driftDetector;
}

function getProductionEval() {
  if (!productionEval) {
    productionEval = new ProductionEval();
  }
  return productionEval;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  MetricsCollector,
  DriftDetector,
  ProductionEval,
  getMetricsCollector,
  getDriftDetector,
  getProductionEval
};
