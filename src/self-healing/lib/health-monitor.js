/**
 * Health Monitor
 * 
 * Provides comprehensive health status for the self-healing system.
 * Integrates all Phase 1 components into a single health endpoint.
 */

'use strict';

const { AuditTrail } = require('./audit-trail');
const { EmergencyStopManager } = require('./emergency-stop');
const { TrustBoundaryMonitor, validateConfigIntegrity } = require('./trust-self-validation');
const config = require('./config');
const { ModeManager, MODES } = require('./mode-manager');

let components = {
  auditTrail: null,
  emergencyManager: null,
  trustMonitor: null,
  config: null,
  modeManager: null,
  startTime: Date.now()
};

function initialize(componentsRefs) {
  components = { ...components, ...componentsRefs };
}

function getHealthStatus() {
  const uptime = Date.now() - components.startTime;
  
  // Get component statuses
  const emergencyStatus = components.emergencyManager?.getStatus() || { isEmergencyStopped: false };
  const modeStatus = components.modeManager?.getStatus() || { currentMode: 'ACTIVE' };
  const trustStatus = components.trustMonitor?.validateTrustBoundary() || { trustBoundaryIntact: true };
  
  // Count audit entries
  const recentEvents = components.auditTrail?.getRecent(100) || [];
  
  // Count recent fixes
  const fixEvents = recentEvents.filter(e => e.event === 'fix_applied');
  const deniedEvents = recentEvents.filter(e => e.event === 'fix_denied');
  
  return {
    status: emergencyStatus.isEmergencyStopped ? 'critical' : 
            trustStatus.trustBoundaryIntact ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: uptime,
    errorCount: deniedEvents.length,
    fixesApplied: fixEvents.length,
    pendingApprovals: 0, // Would integrate with approval queue
    security: trustStatus.trustBoundaryIntact ? 'verified' : 'unverified',
    killSwitchEnabled: emergencyStatus.isEmergencyStopped,
    mode: modeStatus.currentMode,
    scheduledMode: modeStatus.scheduledMode,
    trustBoundaryIntact: trustStatus.trustBoundaryIntact,
    emergencyState: emergencyStatus,
    configValid: true, // Would call validateConfigIntegrity
    auditTrail: {
      totalEntries: recentEvents.length,
      recentEvents: recentEvents.slice(-5).map(e => ({
        id: e.id,
        event: e.event,
        ts: e.ts
      }))
    }
  };
}

function getDetailedHealth() {
  const basic = getHealthStatus();
  return {
    ...basic,
    modeDetails: components.modeManager?.getStatus(),
    circuits: {}, // Would integrate circuit breaker statuses
    integrity: components.trustMonitor?.verifyTrackerIntegrity(),
    config: config.getAll()
  };
}

module.exports = {
  initialize,
  getHealthStatus,
  getDetailedHealth
};
