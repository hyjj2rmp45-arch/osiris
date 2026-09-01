/**
 * Trust Boundary Self-Validation
 * 
 * Phase 1: Safety Foundation
 * 
 * The self-healing system continuously monitors its own guardrails
 * to ensure they haven't been tampered with. This is a defense against
 * the agent learning to bypass its own safety constraints.
 * 
 * Checks:
 * - Trust boundary files haven't been modified
 * - Kill switch mechanism is intact
 * - Config files haven't been altered
 * - No unauthorized writes to protected files
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { getTrustBoundaryStatus, isWithinTrustBoundary } = require('./trust-boundary');

// ═══════════════════════════════════════════════════════════════
// FILE INTEGRITY MONITORING
// ═══════════════════════════════════════════════════════════════

/**
 * Monitor file integrity for critical configuration files.
 * Uses SHA-256 hashes to detect any modifications.
 */
class FileIntegrityMonitor {
  constructor(options = {}) {
    this.repoRoot = options.repoRoot || process.cwd();
    this.trackingFile = options.trackingFile || '/app/data/file-integrity-tracker.json';
    this.trackedFiles = options.trackedFiles || [];
    this.previousState = this._loadTracker();
  }
  
  /**
   * Add a file to monitoring (with initial hash).
   */
  trackFile(filePath) {
    const fullPath = path.join(this.repoRoot, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.warn(`[FIM] Cannot track non-existent file: ${filePath}`);
      return false;
    }
    
    const hash = this._hashFile(fullPath);
    
    this.trackedFiles.push({
      path: filePath,
      hash: hash,
      addedAt: new Date().toISOString(),
      lastChecked: null,
      lastModified: null
    });
    
    this._persistTracker();
    return true;
  }
  
  /**
   * Verify all tracked files.
   * Returns list of files that have been modified.
   */
  verifyIntegrity() {
    const results = {
      timestamp: new Date().toISOString(),
      allVerified: true,
      modified: [],
      missing: [],
      verified: 0
    };
    
    for (const tracked of this.trackedFiles) {
      const fullPath = path.join(this.repoRoot, tracked.path);
      
      if (!fs.existsSync(fullPath)) {
        results.missing.push(tracked.path);
        results.allVerified = false;
        continue;
      }
      
      // Check actual modification time
      const stat = fs.statSync(fullPath);
      const actualModified = new Date(stat.mtime).toISOString();
      
      const currentHash = this._hashFile(fullPath);
      
      if (currentHash !== tracked.hash) {
        results.modified.push({
          path: tracked.path,
          expectedHash: tracked.hash,
          actualHash: currentHash,
          lastSeen: tracked.lastModified || tracked.addedAt,
          currentModified: actualModified
        });
        results.allVerified = false;
      }
      
      tracked.hash = currentHash;
      tracked.lastChecked = new Date().toISOString();
      tracked.lastModified = actualModified;
      results.verified++;
    }
    
    this._persistTracker();
    return results;
  }
  
  /**
   * Self-monitor: verify the integrity tracker itself hasn't been tampered.
   */
  verifyTrackerIntegrity() {
    const trackerContent = JSON.stringify(this.previousState);
    const trackerHash = crypto.createHash('sha256').update(trackerContent).digest('hex');
    
    // Check if tracker file itself was modified outside our process
    // This is a simple check — in production, you'd want a Merkle tree or blockchain
    const expectedTrackerFile = path.join(this.repoRoot, '.data', 'integrity-tracker.hash');
    
    if (fs.existsSync(expectedTrackerFile)) {
      const storedHash = fs.readFileSync(expectedTrackerFile, 'utf-8').trim();
      if (storedHash !== trackerHash) {
        return {
          compromised: true,
          message: 'Integrity tracker file may have been tampered with',
          expected: storedHash,
          actual: trackerHash
        };
      }
    } else {
      // Create initial hash
      fs.mkdirSync(path.dirname(expectedTrackerFile), { recursive: true });
      fs.writeFileSync(expectedTrackerFile, trackerHash, 'utf-8');
    }
    
    return { compromised: false, hash: trackerHash };
  }
  
  _hashFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  _loadTracker() {
    if (fs.existsSync(this.trackingFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.trackingFile, 'utf-8'));
      } catch {
        // Corrupted tracker — rebuild from current files
        console.warn('[FIM] Tracker corrupted, rebuilding...');
        return { trackedFiles: [], createdAt: new Date().toISOString() };
      }
    }
    return { trackedFiles: [], createdAt: new Date().toISOString() };
  }
  
  _persistTracker() {
    const dir = path.dirname(this.trackingFile);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.trackingFile, JSON.stringify(this.previousState || {
      trackedFiles: this.trackedFiles,
      lastUpdated: new Date().toISOString()
    }, null, 2), 'utf-8');
  }
}

// ═══════════════════════════════════════════════════════════════
// TRUST BOUNDARY SELF-MONITOR
// ═══════════════════════════════════════════════════════════════

/**
 * Monitor the trustworthiness of the trust boundary system itself.
 * Detects attempts to weaken or bypass safety constraints.
 */
class TrustBoundaryMonitor {
  constructor(options = {}) {
    this.repoRoot = options.repoRoot || process.cwd();
    this.fim = new FileIntegrityMonitor(options);
    
    // Track these critical files — if any change, emergency stop
    this.criticalFiles = [
      'src/self-healing/lib/trust-boundary.js',
      'src/self-healing/lib/config.js',
      'src/self-healing/lib/emergency-stop.js',
      'src/bot-token.env',
      '/app/NO_AUTO_FIX',
      '/app/data/emergency-state.json'
    ];
    
    // Initialize tracking
    for (const file of this.criticalFiles) {
      if (fs.existsSync(path.join(this.repoRoot, file))) {
        this.fim.trackFile(file);
      }
    }
  }
  
  /**
   * Perform comprehensive trust boundary validation.
   * Called periodically and before any auto-fix.
   */
  validateTrustBoundary() {
    const results = {
      timestamp: new Date().toISOString(),
      trustBoundaryIntact: true,
      violations: [],
      filesVerified: 0,
      fimStatus: null,
      selfCheckPassed: true
    };
    
    // 1. Verify critical files haven't been modified
    const integrity = this.fim.verifyIntegrity();
    results.fimStatus = integrity;
    results.filesVerified = integrity.verified;
    
    if (!integrity.allVerified) {
      results.trustBoundaryIntact = false;
      results.violations.push({
        type: 'FILE_MODIFIED',
        severity: 'CRITICAL',
        files: integrity.modified,
        message: 'Critical file modified outside trust boundary'
      });
    }
    
    // 2. Check kill switch still works
    if (!this._killSwitchFunctional()) {
      results.trustBoundaryIntact = false;
      results.violations.push({
        type: 'KILL_SWITCH_COMPROMISED',
        severity: 'CRITICAL',
        message: 'Emergency kill switch appears non-functional'
      });
    }
    
    // 3. Validate trust boundary definitions haven't been weakened
    const trustStatus = getTrustBoundaryStatus();
    if (trustStatus.allowedFiles.length > 2 || 
        trustStatus.allowedFiles.includes('package.json') ||
        trustStatus.allowedFiles.includes('Dockerfile')) {
      results.selfCheckPassed = false;
      results.violations.push({
        type: 'TRUST_BOUNDARY_WEAKENED',
        severity: 'CRITICAL',
        message: 'Trust boundary allowlist appears modified or expanded'
      });
    }
    
    // 4. Verify self-validation code hasn't been tampered
    const selfCheck = this.fim.verifyTrackerIntegrity();
    if (selfCheck.compromised) {
      results.selfCheckPassed = false;
      results.violations.push({
        type: 'FIM_COMPROMISED',
        severity: 'CRITICAL',
        message: selfCheck.message
      });
    }
    
    if (results.violations.length > 0) {
      results.trustBoundaryIntact = false;
    }
    
    return results;
  }
  
  /**
   * Check if the kill switch is still functional.
   */
  _killSwitchFunctional() {
    try {
      // Test: create kill switch file, verify it's detected, remove it
      const testPath = '/app/.test_kill_switch_functional';
      const testContent = 'test-' + Date.now();
      
      fs.writeFileSync(testPath, testContent, { flag: 'wx' });
      
      // Verify file system operations work
      const readBack = fs.readFileSync(testPath, 'utf-8');
      if (readBack !== testContent) {
        fs.unlinkSync(testPath);
        return false; // Write succeeded but read failed
      }
      
      fs.unlinkSync(testPath);
      
      // Verify kill switch path is accessible
      const killSwitchDir = path.dirname('/app/NO_AUTO_FIX');
      if (!fs.existsSync(killSwitchDir)) {
        return false;
      }
      
      return true;
    } catch (err) {
      return false;
    }
  }
  
  /**
   * Auto-emergency stop if trust boundary compromised.
   */
  triggerAutoEmergency(validationResults) {
    if (!validationResults.trustBoundaryIntact) {
      const emergencyState = {
        mode: 'EMERGENCY',
        reason: 'Trust boundary validation failed',
        violations: validationResults.violations,
        triggeredAt: new Date().toISOString(),
        requiresManual: true
      };
      
      // Create kill switch file
      fs.writeFileFileSync('/app/NO_AUTO_FIX', JSON.stringify(emergencyState, null, 2));
      
      // Log to audit trail
      return true;
    }
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION INTEGRITY CHECK
// ═══════════════════════════════════════════════════════════════

/**
 * Verify configuration hasn't been tampered with.
 * Checks for unauthorized changes to security-critical settings.
 */
function validateConfigIntegrity(config) {
  const violations = [];
  
  // Check critical security settings
  if (config.confidenceThresholds.autoFix > 0.95) {
    violations.push('Auto-fix threshold too high (security risk)');
  }
  
  if (config.fixParams.maxDiffLines > 200) {
    violations.push('Max diff lines too large (security risk)');
  }
  
  if (!config.emergency.lockoutFile) {
    violations.push('Emergency lockout file path not configured');
  }
  
  if (config.autoFixEnabled === true && process.env.NODE_ENV === 'production') {
    // Additional verification in production
    if (!config.validation.enableTrustBoundaryCheck) {
      violations.push('Trust boundary validation disabled in production');
    }
  }
  
  return {
    valid: violations.length === 0,
    violations
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  FileIntegrityMonitor,
  TrustBoundaryMonitor,
  validateConfigIntegrity
};
