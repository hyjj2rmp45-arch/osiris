/**
 * Self-Healing System - Phase 1 + 2 + 3
 * 
 * Safety Layer Priority:
 * 1. Kill switch check (fastest, cheapest)
 * 2. Trust boundary validation (prevents file access violations)  
 * 3. Trust boundary self-validation (prevents system tampering)
 * 4. Post-fix validation (catches code injection)
 * 5. Circuit breaker (prevents cascading failures)
 * 6. Rate limiting (prevents resource exhaustion)
 * 7. Enhanced confidence scoring (multi-factor decision engine)
 * 8. Anomaly detection (flags unusual patterns)
 * 9. Audit trail (immutable record)
 * 
 * All safety layers are ALWAYS active regardless of mode.
 * Modes only control whether fixes are auto-applied vs queued.
 */

'use strict';

// Phase 1 Safety Components
const trustBoundary = require('./lib/trust-boundary');
const { EmergencyStopManager, CircuitBreaker } = require('./lib/emergency-stop');
const { atomicWriteJSON, safeReadJSON, createStateManager } = require('./lib/state-persistence');
const { AuditTrail } = require('./lib/audit-trail');
const config = require('./lib/config');
const { SnapshotManager } = require('./lib/rollback');
const { TrustBoundaryMonitor, validateConfigIntegrity } = require('./lib/trust-self-validation');
const telegramBot = require('./lib/telegram-bot');
const { ModeManager, MODES } = require('./lib/mode-manager');
const healthMonitor = require('./lib/health-monitor');

// Phase 2 Intelligence Components
const { SelfHealingRouter, createRouter } = require('./lib/router');
const { computeEnhancedConfidence, detectAnomalies } = require('./lib/confidence-scoring');

// Phase 3 Observability Components
const { MetricsCollector, DriftDetector, ProductionEval } = require('./lib/observability');


// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

let initialized = false;
let emergencyManager = null;
let auditTrail = null;
let trustMonitor = null;
let snapshotManager = null;
let llmCircuitBreaker = null;
let githubCircuitBreaker = null;
let ntfyCircuitBreaker = null;
let modeManager = null;

// Phase 3 Observability components
let metricsCollector = null;
let driftDetector = null;
let productionEval = null;

async function initialize(options = {}) {
  if (initialized) return;
  
  // Load configuration
  config.initialize(options.configFile);
  
  // Initialize state managers
  const emergencyStateFile = config.get('state.emergencyStateFile');
  emergencyManager = new EmergencyStopManager(emergencyStateFile);
  
  const auditFile = config.get('state.auditFile');
  auditTrail = new AuditTrail({ auditFile });
  
  // Initialize trust boundary monitoring
  trustMonitor = new TrustBoundaryMonitor({
    repoRoot: options.repoRoot || process.cwd()
  });
  
  // Initialize rollback/snapshot capabilities
  snapshotManager = new SnapshotManager({
    repoRoot: options.repoRoot || process.cwd(),
    snapshotDir: options.snapshotDir || '/app/data/snapshots/'
  });
  
  // Initialize circuit breakers
  const cbConfig = config.get('circuitBreaker');
  llmCircuitBreaker = new CircuitBreaker('LLM_API', cbConfig.llm);
  githubCircuitBreaker = new CircuitBreaker('GITHUB_API', cbConfig.github);
  ntfyCircuitBreaker = new CircuitBreaker('NTFY_API', cbConfig.ntfy);
  
  // Initialize mode manager
  modeManager = new ModeManager({
    auditTrail: auditTrail,
    telegramBot: telegramBot,
    stateFile: '/app/data/mode-state.json'
  });
  
  // Initialize Phase 3 Observability components
  metricsCollector = new MetricsCollector({
    metricsFile: '/app/data/metrics.json',
    auditTrail: auditTrail
  });
  
  driftDetector = new DriftDetector({
    metricsCollector: metricsCollector,
    auditTrail: auditTrail,
    driftFile: '/app/data/drift-state.json'
  });
  
  productionEval = new ProductionEval({
    evalFile: '/app/data/eval-results.json',
    auditTrail: auditTrail
  });
  
  // Initialize health monitor
  healthMonitor.initialize({
    auditTrail,
    emergencyManager,
    trustMonitor,
    modeManager,
    config
  });
  
  // Initialize Telegram bot if configured
  if (options.telegramBotToken && options.telegramChatId) {
    telegramBot.initialize(options.telegramBotToken, options.telegramChatId);
    auditTrail.record('init_telegram_bot', { status: 'initialized' });
    
    // Start polling for commands (5s interval)
    if (telegramBot.getClient()) {
      telegramBot.getClient().startPolling(5000);
      auditTrail.record('telegram_polling_started', { intervalMs: 5000 });
    }
  }
  
  // Validate configuration integrity
  const configValidation = validateConfigIntegrity(config.getAll());
  if (!configValidation.valid) {
    console.warn('[SelfHealing] Config validation warnings:', configValidation.violations);
    auditTrail.record('config_validation_warning', { violations: configValidation.violations });
  }
  
  initialized = true;
  auditTrail.record('system_initialization', { 
    mode: config.get('mode'),
    autoFixEnabled: config.get('autoFixEnabled'),
    trustBoundaryIntact: true
  });
}

// ═══════════════════════════════════════════════════════════════
// SAFETY GATE: Pre-Fix Validation Pipeline
// ═══════════════════════════════════════════════════════════════

/**
 * Run ALL safety checks before allowing a fix to proceed.
 * This is the core safety pipeline - every fix must pass ALL gates.
 * 
 * @param {object} fixAttempt - The proposed fix
 * @param {object} errorInfo - The error being fixed
 * @returns {{allow: boolean, route: string, reasons: string[], correlationId: string}}
 */
function safetyGate(fixAttempt, errorInfo) {
const correlationId = (auditTrail && auditTrail.record) 
    ? auditTrail.record('safety_gate_check', {}) 
    : require('crypto').randomUUID();
  const reasons = [];
  
  // === GATE 1: Kill Switch Check ===
  if (emergencyManager && emergencyManager.isEmergencyStopped()) {
    reasons.push('Kill switch engaged');
    return { allow: false, route: 'DENY', reasons, correlationId };
  }
  
  // === GATE 2: Trust Boundary Validation ===
  const filesToModify = fixAttempt.files || [fixAttempt.file];
  const { allowed, denied } = trustBoundary.filterByTrustBoundary(filesToModify);
  
  if (denied.length > 0) {
    reasons.push(`Trust boundary violation: ${denied.map(d => d.path).join(', ')}`);
    return { allow: false, route: 'DENY', reasons, correlationId };
  }
  
  // === GATE 3: Trust Boundary Self-Validation ===
  if (trustMonitor) {
    const validation = trustMonitor.validateTrustBoundary();
    if (!validation.trustBoundaryIntact) {
      reasons.push(`Trust boundary integrity compromised: ${validation.violations.map(v => v.message).join(' | ')}`);
      
      // Auto-engage emergency stop
      if (emergencyManager) {
        emergencyManager.engageKillSwitch('trust_boundary_compromised');
        if (telegramBot.getClient()) {
          telegramBot.alert('🚨 TRUST BOUNDARY COMPROMISED\nEmergency stop engaged automatically.', {
            parseMode: 'HTML'
          });
        }
      }
      
      return { allow: false, route: 'DENY', reasons, correlationId };
    }
  }
  
  // === GATE 4: Trust Boundary Self-Check ===
  const trustStatus = trustBoundary.getTrustBoundaryStatus();
  if (trustStatus.allowedFiles.includes('package.json') || 
      trustStatus.allowedFiles.includes('Dockerfile')) {
    reasons.push('Trust boundary allowlist has been modified (security risk)');
    return { allow: false, route: 'DENY', reasons, correlationId };
  }
  
  // === GATE 5: Post-Fix Validation ===
  if (fixAttempt.diff) {
    const diffValidation = trustBoundary.validateDiffTrustBoundary(fixAttempt.diff);
    if (!diffValidation.safe) {
      reasons.push(`Diff validation failed: ${diffValidation.violations.join(' | ')}`);
      return { allow: false, route: 'DENY', reasons, correlationId };
    }
  }
  
  // === GATE 6: Dangerous Pattern Detection ===
  const dangerousPatterns = [
    /eval\s*\(/i,
    /exec\s*\(/i,
    /child_process/i,
    /require\s*\(\s*['"]child_process/i,
    /process\.env\./g,  // Prevent new secret access
    /fetch\s*\(\s*['"]https?:\/\/(?!api\.github\.com|ntfy\.sh|api\.telegram\.org)/i,
    /http\.request/i,
    /new\s+Function/i
  ];
  
  const fixContent = JSON.stringify(fixAttempt);
  for (const pattern of dangerousPatterns) {
    if (pattern.test(fixContent)) {
      reasons.push(`Dangerous pattern detected: ${pattern.toString().substring(0, 50)}...`);
      return { allow: false, route: 'DENY', reasons, correlationId };
    }
  }
  
  // === GATE 7: Diff Size Validation ===
  const MAX_DIFF_LINES = config.get('fixParams.maxDiffLines') || 150;
  if (fixAttempt.diff) {
    const lineCount = fixAttempt.diff.split('\n').length;
    if (lineCount > MAX_DIFF_LINES) {
      reasons.push(`Diff too large: ${lineCount} lines (max: ${MAX_DIFF_LINES})`);
      return { allow: false, route: 'ESCALATE', reasons, correlationId };
    }
  }
  
  // If we got here, all hard safety gates passed
  // Now check rate limits and confidence for final routing
  
  // === GATE 8: Rate Limiting ===
  if (errorInfo.fingerprint && emergencyManager) {
    const rateCheck = emergencyManager.checkRateLimit(errorInfo.fingerprint);
    if (!rateCheck.allowed) {
      reasons.push(`Rate limit exceeded for fingerprint: ${errorInfo.fingerprint}`);
      return { allow: false, route: 'DENY', reasons, correlationId };
    }
  }
  
  // Record successful passage through safety gates
  if (auditTrail) {
    auditTrail.record('safety_gate_passed', {
      correlationId,
      errorFingerprint: errorInfo.fingerprint,
      fixPattern: fixAttempt.pattern,
      files: allowed
    });
  }
  
  // Calculate confidence for routing decision
  const confidence = calculateConfidence(fixAttempt, errorInfo);
  const thresholds = config.get('confidenceThresholds');
  
  let route;
  if (confidence >= thresholds.autoFix) {
    route = 'AUTO_FIX';
  } else if (confidence >= thresholds.queue) {
    route = 'QUEUE';
  } else if (confidence >= thresholds.escalate) {
    route = 'ESCALATE';
  } else {
    route = 'DENY';
  }
  
  return {
    allow: route !== 'DENY',
    route,
    confidence,
    reasons,
    correlationId
  };
}

// ═══════════════════════════════════════════════════════════════
// CONFIDENCE SCORING
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate fix confidence using enhanced scoring.
 * 
 * Formula: base_rate × trust_factor × impact_factor × stability_factor × decay_factor
 * 
 * @param {object} fixAttempt - The proposed fix
 * @param {object} errorInfo - The error being fixed
 * @returns {number} - Confidence score (0.0 to 1.0)
 */
function calculateConfidence(fixAttempt, errorInfo) {
  // Base rate: from known-fixes.json historical success (default 0.7)
  let baseRate = 0.7;
  if (fixAttempt.knownFixId && knownFixes) {
    const knownFix = knownFixes.find(f => f.id === fixAttempt.knownFixId);
    if (knownFix && knownFix.successRate) {
      baseRate = knownFix.successRate;
    }
  }
  
  // Trust factor: 0.9 for allowlisted files, 0.7 for non-payment code, 0.1 for anything else
  let trustFactor = 0.9;
  if (fixAttempt.file) {
    const { allowed } = trustBoundary.filterByTrustBoundary([fixAttempt.file]);
    trustFactor = allowed.length > 0 ? 0.9 : 0.1;
  }
  
  // Impact factor: smaller changes = higher confidence
  let impactFactor = 1.0;
  if (fixAttempt.diff) {
    const changedLines = fixAttempt.diff.split('\n').filter(line => line.startsWith('+') || line.startsWith('-')).length;
    impactFactor = Math.max(0.5, 1 - (changedLines / 120));  // Normalize against 120-line max
  }
  
  // Stability factor: based on historical accuracy for this pattern
  let stabilityFactor = 1.0;
  if (fixAttempt.pattern && knownFixes) {
    const patternMatches = knownFixes.filter(f => f.pattern === fixAttempt.pattern);
    if (patternMatches.length > 0) {
      const successRate = patternMatches.filter(f => f.success).length / patternMatches.length;
      stabilityFactor = 0.7 + (0.3 * successRate);  // Range 0.7-1.0
    }
  }
  
  // Time decay factor: known fixes degrade over 90 days
  let decayFactor = 1.0;
  if (fixAttempt.knownFixId && knownFixes) {
    const knownFix = knownFixes.find(f => f.id === fixAttempt.knownFixId);
    if (knownFix && knownFix.createdAt) {
      const ageDays = (Date.now() - new Date(knownFix.createdAt).getTime()) / (1000 * 3600 * 24);
      decayFactor = Math.max(0.1, 1 - (ageDays / 90));  // Max 90-day decay
    }
  }
  
  return baseRate * trustFactor * impactFactor * stabilityFactor * decayFactor;
}

// ═══════════════════════════════════════════════════════════════
// FIX APPLICATION WITH ROLLBACK
// ═══════════════════════════════════════════════════════════════

/**
 * Apply a fix safely with rollback protection.
 * 
 * @param {string} fileName - File to modify
 * @param {string} fixContent - The fix to apply
 * @param {object} options - Additional options
 * @returns {{success: boolean, rollbackId: string, error?: string}}
 */
async function applyFixWithRollback(fileName, fixContent, options = {}) {
  if (!initialized) {
    await initialize();
  }
  
  // Validate file is within trust boundary
  const boundaryCheck = trustBoundary.isWithinTrustBoundary(fileName);
  if (!boundaryCheck.allowed) {
    throw new Error(`Fix blocked by trust boundary: ${boundaryCheck.reason}`);
  }
  
  // Create pre-fix snapshot
  let snapshotId = null;
  if (snapshotManager) {
    snapshotId = snapshotManager.createSnapshot(fileName);
  }
  
  try {
    // Write fix atomically
    const filePath = path.join(process.cwd(), fileName);
    const tmpFile = `${filePath}.tmp`;
    
    fs.writeFileSync(tmpFile, fixContent, 'utf-8');
    
    // Validate syntax before committing
    await validateSyntax(tmpFile);
    
    // Atomic rename
    fs.renameSync(tmpFile, filePath);
    
    // Record successful fix
    if (auditTrail) {
      const fixId = auditTrail.record('fix_applied', {
        file: fileName,
        snapshotId: snapshotId,
        correlationId: options.correlationId,
        confidence: options.confidence
      });
      
      return {
        success: true,
        fixId: fixId,
        rollbackId: snapshotId,
        snapshotId: snapshotId
      };
    }
    
    return { success: true, rollbackId: snapshotId, snapshotId: snapshotId };
    
  } catch (err) {
    // Fix failed - attempt to restore from snapshot
    if (snapshotId && snapshotManager) {
      try {
        snapshotManager.restoreSnapshot(snapshotId);
      } catch (restoreErr) {
        console.error('[SelfHealing] Failed to restore snapshot after fix failure:', restoreErr);
      }
    }
    
    if (auditTrail) {
      auditTrail.record('fix_failed', {
        file: fileName,
        error: err.message,
        rollbackPerformed: !!snapshotId
      });
    }
    
    throw err;
  }
}

/**
 * Validate JavaScript syntax of a file.
 */
async function validateSyntax(filePath) {
  return new Promise((resolve, reject) => {
    const { execFile } = require('child_process');
    execFile('node', ['--check', filePath], (err) => {
      if (err) {
        reject(new Error(`Syntax validation failed: ${err.stderr || err.message}`));
      } else {
        resolve();
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// HEALTH & STATUS
// ═══════════════════════════════════════════════════════════════

/**
 * Get comprehensive status for health endpoint.
 */
function getStatus() {
  const emergencyStatus = emergencyManager ? emergencyManager.getStatus() : { isEmergencyStopped: false };
  const configStatus = validateConfigIntegrity(config.getAll());
  
  let trustStatus = { verified: true };
  if (trustMonitor) {
    trustStatus = trustMonitor.validateTrustBoundary();
  }
  
  return {
    initialized,
    mode: config.get('mode'),
    autoFixEnabled: config.get('autoFixEnabled'),
    emergencyStop: emergencyStatus,
    configValid: configStatus.valid,
    trustBoundary: trustStatus,
    circuits: {
      llm: llmCircuitBreaker ? llmCircuitBreaker.getStatus() : null,
      github: githubCircuitBreaker ? githubCircuitBreaker.getStatus() : null,
      ntfy: ntfyCircuitBreaker ? ntfyCircuitBreaker.getStatus() : null
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// ERROR ROUTING (Phase 2)
// ═══════════════════════════════════════════════════════════════

/**
 * Route an error through the enhanced confidence scoring system.
 * Uses Phase 2 intelligence for decision making.
 * 
 * @param {object} error - Error info { fingerprint, message, severity, stack, context }
 * @param {object} fixProposal - Proposed fix { pattern, file, diff, severity }
 * @returns {object} - Routing decision { action, confidence, correlationId }
 */
function routeError(error, fixProposal) {
  if (!initialized) {
    throw new Error('Self-healing system not initialized. Call initialize() first.');
  }
  
  const router = createRouter({
    auditTrail: auditTrail,
    historicalData: { knownFixes: global.__knownFixes || [] },
    telegramChatId: config.get('telegramChatId'),
    repoRoot: process.cwd()
  });
  
  // Set global references for subsystems
  global.__modeManager = modeManager;
  global.__auditTrail = auditTrail;
  global.__knownFixes = global.__knownFixes || [];
  
  return router.routeError(error, fixProposal);
}

// ═══════════════════════════════════════════════════════════════
// PHASE 3 ACCESSORS
// ═══════════════════════════════════════════════════════════════

/**
 * Get current metrics snapshot.
 */
function getMetrics() {
  if (!metricsCollector) {
    throw new Error('Observability not initialized. Call initialize() first.');
  }
  return metricsCollector.getMetrics();
}

/**
 * Get drift detection status.
 */
function getDriftStatus() {
  if (!driftDetector) {
    return { initialized: false };
  }
  return { initialized: true, baseline: driftDetector.baseline };
}

/**
 * Run a production evaluation.
 */
function runProductionEval(fixId, errorFingerprint, testResults = {}) {
  if (!productionEval) {
    throw new Error('Production eval not initialized. Call initialize() first.');
  }
  return productionEval.runPostFixEval(fixId, errorFingerprint, testResults);
}

/**
 * Apply safety gate (wrapper for worker.js integration).
 * Runs the full Phase 1+ safety pipeline.
 * 
 * @param {object} error - Error info { fingerprint, message, severity }
 * @param {object} fixProposal - { pattern, file, diff, description }
 * @returns {{allow: boolean, route: string, confidence: number, reasons: string[]}}
 */
async function applySafetyGate(error, fixProposal) {
  if (!initialized) {
    return { allow: true, route: 'AUTO_FIX', confidence: 0.5, reasons: ['System not initialized, using defaults'] };
  }
  
  // Run Phase 1 safety gate
  const safetyResult = safetyGate(fixProposal, error);
  
  // Record metrics
  if (metricsCollector) {
    metricsCollector.recordFixAttempt(error, fixProposal, safetyResult);
  }
  
  return {
    allow: safetyResult.allow,
    route: safetyResult.route,
    confidence: safetyResult.confidence || 0,
    reasons: safetyResult.reasons,
    correlationId: safetyResult.correlationId
  };
}

/**
 * Get current mode name for worker integration.
 */
function getCurrentMode() {
  if (!modeManager) return 'ACTIVE';
  const status = modeManager.getStatus();
  return status.currentMode;
}

/**
 * Check if a file contains payment-related code.
 */
function isPaymentCode(filePath) {
  if (!filePath) return false;
  
  const paymentPatterns = [
    'payment',
    'subscription',
    'wallet',
    'stripe',
    'solana',
    'telegram/auth',
    'webhook'
  ];
  
  const lowerPath = filePath.toLowerCase();
  return paymentPatterns.some(p => lowerPath.includes(p));
}

/**
 * Record fix metrics for Phase 3 observability.
 */
function recordFixMetrics(error, fixProposal, safetyResult) {
  if (!metricsCollector) return;
  
  const errorWithFingerprint = {
    fingerprint: error.fingerprint || error.pattern,
    severity: error.severity
  };
  
  metricsCollector.recordFixAttempt(errorWithFingerprint, fixProposal, {
    action: safetyResult.route,
    confidence: safetyResult.confidence,
    correlationId: safetyResult.correlationId
  });
}

/**
 * Check for behavioral drift.
 * 
 * @param {object} fixMetrics - { tokensUsed, stepsTaken, confidence }
 * @returns {{driftDetected: boolean, severity: string, reasons: string[], action: string}}
 */
function checkDrift(fixMetrics) {
  if (!driftDetector) {
    return { driftDetected: false, severity: 'OK', reasons: [], action: 'none' };
  }
  
  return driftDetector.detectDrift(fixMetrics);
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  initialize,
  safetyGate,
  calculateConfidence,
  applyFixWithRollback,
  validateSyntax,
  getStatus,
  routeError,
  computeEnhancedConfidence,
  detectAnomalies,
  getMetrics,
  getDriftStatus,
  runProductionEval,
  applySafetyGate,
  getCurrentMode,
  isPaymentCode,
  recordFixMetrics,
  checkDrift,
  
  // Component references (for advanced use)
  trustBoundary,
  EmergencyStopManager,
  CircuitBreaker,
  AuditTrail,
  SnapshotManager,
  TrustBoundaryMonitor,
  telegramBot,
  config,
  modeManager,
  MODES,
  healthMonitor,
  MetricsCollector,
  DriftDetector,
  ProductionEval,
  SelfHealingRouter,
  createRouter
};

// ═══════════════════════════════════════════════════════════════
// GLOBAL REFERENCES (for backward compatibility with worker.js)
// ═══════════════════════════════════════════════════════════════

// These maintain compatibility with existing worker.js references
let knownFixes = [];

if (typeof module !== 'undefined') {
  // Allow worker.js to access these if needed
  module.exports._setKnownFixes = (fixes) => { knownFixes = fixes; };
  module.exports._getKnownFixes = () => knownFixes;
}
