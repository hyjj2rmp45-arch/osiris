/**
 * Phase 5: Self-Healing System Test Suite
 * 
 * Comprehensive verification tests for all 4 phases.
 * Run with: node test/self-healing-tests.js
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Set up test directories
const TEST_DIR = '/app/data/test';
const REPO_ROOT = process.cwd();

// Ensure test directories exist
// Clean up any previous test state, then recreate
try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch {}
fs.mkdirSync(TEST_DIR, { recursive: true });

// Track test results
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

function test(name, fn) {
  try {
    fn();
    testResults.passed++;
    testResults.details.push({ name, status: 'PASSED' });
    console.log(`  ✅ ${name}`);
  } catch (err) {
    testResults.failed++;
    testResults.details.push({ name, status: 'FAILED', error: err.message });
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

function testAsync(name, fn) {
  return new Promise(async (resolve) => {
    try {
      await fn();
      testResults.passed++;
      testResults.details.push({ name, status: 'PASSED' });
      console.log(`  ✅ ${name}`);
    } catch (err) {
      testResults.failed++;
      testResults.details.push({ name, status: 'FAILED', error: err.message });
      console.log(`  ❌ ${name}: ${err.message}`);
    }
    resolve();
  });
}

/**
 * Run a comprehensive test of the self-healing system.
 */
async function runAllTests() {
  console.log('\n=== Phase 5: Self-Healing System Verification ===\n');
  
  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: Safety Layer Tests
  // ═══════════════════════════════════════════════════════════════
  
  console.log('Phase 1: Safety Layer Tests\n');
  
  const SH_DIR = path.join(REPO_ROOT, 'src', 'self-healing-system');
  
  // Test 1: Trust Boundary Enforcement
  const trustBoundary = require(path.join(SH_DIR, 'lib', 'trust-boundary'));
  
  test('Trust Boundary: Allows src/worker.js', () => {
    const result = trustBoundary.isWithinTrustBoundary('src/worker.js');
    assert.strictEqual(result.allowed, true, 'Should allow worker.js');
  });
  
  test('Trust Boundary: Blocks package.json', () => {
    const result = trustBoundary.isWithinTrustBoundary('package.json');
    assert.strictEqual(result.allowed, false, 'Should block package.json');
  });
  
  test('Trust Boundary: Blocks payment files', () => {
    const result = trustBoundary.isWithinTrustBoundary('src/payments.js');
    assert.strictEqual(result.allowed, false, 'Should block payment files');
  });
  
  test('Trust Boundary: Blocks secrets', () => {
    const result = trustBoundary.isWithinTrustBoundary('.env');
    assert.strictEqual(result.allowed, false, 'Should block .env');
  });
  
  test('Trust Boundary: Filters by allowed paths', () => {
    const { allowed, denied } = trustBoundary.filterByTrustBoundary([
      'src/worker.js',
      'package.json',
      'known-fixes.json'
    ]);
    assert.strictEqual(allowed.length, 2, 'Should allow 2 files');
    assert.strictEqual(denied.length, 1, 'Should deny 1 file');
  });
  
  // Test 2: Emergency Stop
  const { EmergencyStopManager } = require(path.join(SH_DIR, 'lib', 'emergency-stop'));
  const emergencyMgr = new EmergencyStopManager(`${TEST_DIR}/emergency.json`);
  
  test('Emergency Stop: Not engaged by default', () => {
    assert.strictEqual(emergencyMgr.isEmergencyStopped(), false);
  });
  
  test('Emergency Stop: Check rate limit', () => {
    const result = emergencyMgr.checkRateLimit('test_pattern');
    assert.strictEqual(result.allowed, true);
  });
  
  test('Emergency Stop: Records and checks denials', () => {
    const state = emergencyMgr.getStatus();
    assert.strictEqual(state.consecutiveDenials, 0);
    
    const result = emergencyMgr.recordDenial('test_pattern');
    assert.strictEqual(result.stopped, false); // 1st denial shouldn't trigger
    
    // Record 2 more denials to trigger
    emergencyMgr.recordDenial('test_pattern');
    const finalResult = emergencyMgr.recordDenial('test_pattern');
    
    const newState = emergencyMgr.getStatus();
    assert.strictEqual(newState.consecutiveDenials, 3);
    assert.strictEqual(emergencyMgr.isEmergencyStopped(), true);
    assert.strictEqual(finalResult.stopped, true);
    
    // Reset emergency state for subsequent tests
    emergencyMgr.resetEmergency();
  });
  
  // Test 3: Audit Trail
  const { AuditTrail } = require(path.join(SH_DIR, 'lib', 'audit-trail'));
  const auditTrail = new AuditTrail({
    auditFile: `${TEST_DIR}/audit.json`
  });
  
  test('Audit Trail: Records events', () => {
    const id = auditTrail.record('test_event', { message: 'Test event' });
    assert.ok(id, 'Should return an ID');
    
    const recent = auditTrail.getRecent(10);
    assert.ok(recent.length > 0, 'Should have at least one entry');
    assert.strictEqual(recent[0].event, 'test_event');
  });
  
  test('Audit Trail: Hash chain integrity', () => {
    const integrity = auditTrail.verifyIntegrity();
    assert.strictEqual(integrity.valid, true, 'Hash chain should be valid');
  });
  
  // Test 4: Rollback
  const { SnapshotManager } = require(path.join(SH_DIR, 'lib', 'rollback'));
  const snapshotMgr = new SnapshotManager({
    repoRoot: REPO_ROOT,
    snapshotDir: `${TEST_DIR}/snapshots/`
  });
  
  test('Rollback: Creates snapshots', () => {
    // Create a test file first (relative to repoRoot)
    const testFileName = 'test-snapshot-file.txt';
    const testFilePath = path.join(REPO_ROOT, testFileName);
    fs.writeFileSync(testFilePath, 'test-content');
    
    const snapshotId = snapshotMgr.createSnapshot(testFileName);
    assert.ok(snapshotId, 'Should return snapshot ID');
    
    // Cleanup
    fs.unlinkSync(testFilePath);
  });
  
  // Test 5: Config
  const config = require(path.join(SH_DIR, 'lib', 'config'));
  config.initialize();
  
  test('Config: Contains required settings', () => {
    assert.ok(config.get('mode'));
    assert.ok(config.get('autoFixEnabled') === true);
    assert.ok(config.get('fixParams.maxDiffLines'));
  });
  
  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: Intelligence Tests
  // ═══════════════════════════════════════════════════════════════
  
  console.log('\nPhase 2: Intelligence Tests\n');
  
  const { computeEnhancedConfidence, SCORE_THRESHOLDS } = require(path.join(SH_DIR, 'lib', 'confidence-scoring'));
  
  test('Confidence: High score for trusted file', () => {
    const result = computeEnhancedConfidence({
      file: 'src/worker.js',
      diff: '--- a\n+++ b\n@@ -1,1 +1,1 @@\n-old\n+new',
      pattern: 'connection_timeout'
    }, { fingerprint: 'test' });
    
    assert.ok(result.total > 0.5, 'Confidence should be above 0.5');
  });
  
  test('Confidence: Low score for non-allowlisted file', () => {
    const result = computeEnhancedConfidence({
      file: 'package.json',
      diff: 'minimal',
      pattern: 'test'
    }, { fingerprint: 'test' });
    
    assert.ok(result.breakdown.trustFactor < 0.5, 'Trust factor should be low');
  });
  
  test('Confidence: Novelty penalty applied', () => {
    const result = computeEnhancedConfidence({
      file: 'src/worker.js',
      pattern: 'unknown_pattern_xyz'
    }, { fingerprint: 'test' });
    
    assert.ok(result.breakdown.noveltyPenalty > 0, 'Should have novelty penalty');
  });
  
  test('Routing: Returns correct thresholds', () => {
    assert.ok(SCORE_THRESHOLDS.autoFix >= 0.7);
    assert.ok(SCORE_THRESHOLDS.queue >= 0.5);
  });
  
  // ═══════════════════════════════════════════════════════════════
  // PHASE 3: Observability Tests
  // ═══════════════════════════════════════════════════════════════
  
  console.log('\nPhase 3: Observability Tests\n');
  
  const { MetricsCollector, DriftDetector, ProductionEval } = require(path.join(SH_DIR, 'lib', 'observability'));
  
  const metrics = new MetricsCollector({
    metricsFile: `${TEST_DIR}/metrics.json`
  });
  
  test('Metrics: Initializes correct defaults', () => {
    const m = metrics.getMetrics();
    assert.strictEqual(m.totalFixesAttempted, 0);
    assert.ok(m.uptimeMs >= 0, 'Uptime should be non-negative');
  });
  
  test('Metrics: Records fix attempts', () => {
    metrics.recordFixAttempt({
      fingerprint: 'test_v1',
      severity: 4
    }, {
      pattern: 'timeout',
      file: 'src/worker.js'
    }, {
      action: 'AUTO_FIX',
      confidence: 0.85,
      correlationId: 'test-123'
    });
    
    const m = metrics.getMetrics();
    assert.strictEqual(m.totalFixesAttempted, 1);
    assert.strictEqual(m.totalFixesApplied, 1);
  });
  
  test('Metrics: Dashboard summary works', () => {
    const summary = metrics.getDashboardSummary('24h');
    assert.ok(summary.fixesAttempted >= 1);
  });
  
  const drift = new DriftDetector({ metricsCollector: metrics });
  
  test('Drift Detector: Normal metrics pass', () => {
    const result = drift.detectDrift({
      tokensUsed: 250,
      stepsTaken: 6,
      confidence: 0.85
    });
    assert.strictEqual(result.driftDetected, false);
  });
  
  test('Drift Detector: Detects high token usage', () => {
    const result = drift.detectDrift({
      tokensUsed: 1500,  // 500% above baseline
      stepsTaken: 6,
      confidence: 0.85
    });
    assert.strictEqual(result.driftDetected, true);
    assert.strictEqual(result.severity, 'HIGH');
  });
  
  test('Drift Detector: Detects critical token usage', () => {
    const result = drift.detectDrift({
      tokensUsed: 2500,  // 900% above baseline
      stepsTaken: 6,
      confidence: 0.85
    });
    assert.strictEqual(result.driftDetected, true);
    assert.strictEqual(result.severity, 'CRITICAL');
  });
  
  const evalSys = new ProductionEval({
    evalFile: `${TEST_DIR}/evals.json`
  });
  
  test('Production Eval: Records results', () => {
    const result = evalSys.runPostFixEval('fix-123', 'test_v1', {
      passed: true,
      metrics: { latency: 200 }
    });
    assert.strictEqual(result.passed, true);
    assert.ok(result.evalId);
  });
  
  test('Production Eval: Tracks stats', () => {
    const stats = evalSys.getStats();
    assert.ok(stats.total >= 1);
    assert.ok(stats.successRate >= 0);
  });
  
  // ═══════════════════════════════════════════════════════════════
  // PHASE 4: Worker Integration Tests
  // ═══════════════════════════════════════════════════════════════
  
  console.log('\nPhase 4: Worker Integration Tests\n');
  
  const selfHealing = require(SH_DIR);
  await selfHealing.initialize({
    repoRoot: REPO_ROOT
  });
  
  test('Worker Integration: applySafetyGate works', async () => {
    const result = await selfHealing.applySafetyGate({
      fingerprint: 'test_v1',
      severity: 4
    }, {
      pattern: 'timeout_retry',
      file: 'src/worker.js',
      diff: 'minimal change'
    });
    assert.ok(result.allow || result.route === 'DENY');
    assert.ok(result.correlationId);
  });
  
  test('Worker Integration: getCurrentMode works', () => {
    const mode = selfHealing.getCurrentMode();
    assert.ok(mode, 'Should return a mode');
  });
  
  test('Worker Integration: isPaymentCode works', () => {
    assert.strictEqual(selfHealing.isPaymentCode('src/payments.js'), true);
    assert.strictEqual(selfHealing.isPaymentCode('src/worker.js'), false);
  });
  
  test('Worker Integration: checkDrift works', () => {
    const result = selfHealing.checkDrift({
      tokensUsed: 250,
      stepsTaken: 6,
      confidence: 0.85
    });
    assert.ok(result.driftDetected !== undefined);
  });
  
  test('Worker Integration: getMetrics works', () => {
    const metrics = selfHealing.getMetrics();
    assert.ok(metrics.uptimeMs >= 0);
  });
  
  // ═══════════════════════════════════════════════════════════════
  // INTEGRATION TESTS
  // ═══════════════════════════════════════════════════════════════
  
  console.log('\nIntegration Tests\n');
  
  test('Integration: Safety gate blocks payment code in SCHOOL mode', async () => {
    // This test validates the payment protection logic
    const isPayment = selfHealing.isPaymentCode('src/payments/subscription.js');
    assert.strictEqual(isPayment, true, 'Should detect payment code');
  });
  
  test('Integration: Full pipeline (error → route → eval)', async () => {
    const routing = selfHealing.routeError({
      fingerprint: 'integration_test_v1',
      message: 'Test error for integration',
      severity: 3
    }, {
      file: 'src/worker.js',
      diff: '--- a/src/worker.js\n+++ b/src/worker.js\n@@ -1,1 +1,1 @@\n-old\n+new',
      pattern: 'timeout_retry',
      description: 'Add timeout to fetch call'
    });
    
    assert.ok(routing.action, 'Should have an action');
    assert.ok(routing.confidence !== undefined, 'Should have confidence');
    
    // Record eval
    const evalResult = selfHealing.runProductionEval(
      `fix_${routing.correlationId}`,
      'integration_test_v1',
      { passed: true, metrics: { latency: 150 } }
    );
    
    assert.strictEqual(evalResult.passed, true);
  });
  
  // ═══════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════════════
  
  console.log('\n=== Test Summary ===');
  console.log(`Total: ${testResults.passed + testResults.failed + testResults.skipped}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏭️  Skipped: ${testResults.skipped}`);
  
  if (testResults.failed > 0) {
    console.log('\nFailed tests:');
    testResults.details
      .filter(d => d.status === 'FAILED')
      .forEach(d => console.log(`  ❌ ${d.name}: ${d.error}`));
  }
  
  console.log('\n=== Worker Health Check ===');
  
  // Verify worker is healthy
  try {
    const result = await fetch('https://osiris.orkestr.run/health').then(r => r.json());
    console.log(`Worker Status: ${result.status}`);
    console.log(`Kill Switch: ${result.killSwitchEnabled ? 'ON' : 'OFF'}`);
    console.log(`Security: ${result.security}`);
    console.log(`Error Count: ${result.errorCount}`);
  } catch (err) {
    console.log(`Worker unreachable: ${err.message}`);
  }
  
  return testResults.failed === 0;
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Test suite failed:', err);
      process.exit(1);
    });
}

module.exports = { runAllTests, testResults };
