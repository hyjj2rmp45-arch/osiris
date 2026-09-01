/**
 * Configuration Management
 * 
 * Phase 1: Safety Foundation
 * 
 * Centralized configuration with:
 * - Runtime-reloadable settings
 * - Environment variable overrides
 * - Schema validation
 * - Sensitive defaults
 * 
 * Security note:
 * All config is read-only at runtime. 
 * No config value should ever trigger a file system write to protected areas.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const DEFAULT_CONFIG = Object.freeze({
  // Core mode control
  mode: 'AUTO',                    // AUTO | MANUAL | EMERGENCY
  autoFixEnabled: true,
  
  // Confidence thresholds
  confidenceThresholds: {
    autoFix: 0.85,                // Fix without PR review
    queue: 0.70,                 // Queue for human approval
    escalate: 0.50,              // Escalate to human
    deny: 0.0                  // Always deny
  },
  
  // Fix parameters
  fixParams: {
    maxDiffLines: 120,           // Max lines changed per fix (Microsoft .NET standard)
    maxFilesTouched: 1,         // Max number of files modified
    maxAttemptsPerFingerprint: 3,
    timeToLiveHours: 24,        // Fix attempt TTL
    retryDelayMs: 5000          // Delay between retry attempts
  },
  
  // Trust boundary (redundant with trust-boundary.js, but for health endpoint)
  trustBoundary: {
    allowedPaths: [
      'src/worker.js',
      'known-fixes.json'
    ],
    deniedPaths: [
      '.github/',
      'package.json',
      'package-lock.json',
      'pnpm-lock.yaml',
      '.env',
      'Dockerfile',
      'tsconfig.json'
    ]
  },
  
  // Circuit breaker configuration
  circuitBreaker: {
    llm: {
      failureThreshold: 3,
      cooldownMs: 60000,
      timeoutMs: 10000
    },
    github: {
      failureThreshold: 3,
      cooldownMs: 60000,
      timeoutMs: 10000
    },
    ntfy: {
      failureThreshold: 5,
      cooldownMs: 30000,
      timeoutMs: 5000
    }
  },
  
  // Emergency stop configuration
  emergency: {
    consecutiveDenialsLimit: 3,
    sessionDenialsLimit: 6,
    sessionHours: 24,
    cooldownHours: 1,
    lockoutFile: '/app/NO_AUTO_FIX'
  },
  
  // Monitoring configuration
  monitoring: {
    healthEndpoint: true,
    enableMetrics: true,
    alertOnFix: true,
    alertOnDeny: true,
    alertOnEscalate: true
  },
  
  // State persistence configuration
  state: {
    emergencyStateFile: '/app/data/emergency-state.json',
    auditFile: '/app/data/audit-trail.json',
    pendingApprovalsFile: '/app/data/pending-approvals.json',
    fixOutcomeFile: '/app/data/fix-outcomes.json'
  },
  
  // Validation configuration
  validation: {
    enableSyntaxCheck: true,
    enableDangerousPatternCheck: true,
    enableTrustBoundaryCheck: true,
    enablePostFixValidation: true
  },
  
  // Logging configuration
  logging: {
    level: 'info',
    enableAuditTrail: true,
    enableMetrics: true,
    logFilePath: '/app/data/logs/self-healing.log'
  }
});

// ═══════════════════════════════════════════════════════════════
// ENVIRONMENT VARIABLE OVERRIDES
// ═══════════════════════════════════════════════════════════════

/**
 * Map of environment variable names to config paths.
 * Allows override without modifying config file.
 */
const ENV_MAPPINGS = Object.freeze({
  OSIRIS_MODE: 'mode',
  OSIRIS_AUTO_FIX_ENABLED: 'autoFixEnabled',
  OSIRIS_CONFIDENCE_AUTO_FIX: ['confidenceThresholds', 'autoFix'],
  OSIRIS_CONFIDENCE_QUEUE: ['confidenceThresholds', 'queue'],
  OSIRIS_CONFIDENCE_ESCALATE: ['confidenceThresholds', 'escalate'],
  OSIRIS_MAX_DIFF_LINES: ['fixParams', 'maxDiffLines'],
  OSIRIS_MAX_FILES_TOUCHED: ['fixParams', 'maxFilesTouched'],
  OSIRIS_MAX_ATTEMPTS: ['fixParams', 'maxAttemptsPerFingerprint'],
  OSIRIS_LOCKOUT_FILE: ['emergency', 'lockoutFile'],
  OSIRIS_CONSECUTIVE_DENIALS_LIMIT: ['emergency', 'consecutiveDenialsLimit'],
  OSIRIS_SESSION_DENIALS_LIMIT: ['emergency', 'sessionDenialsLimit'],
  OSIRIS_LOG_LEVEL: ['logging', 'level'],
  OSIRIS_AUDIT_FILE: ['state', 'auditFile'],
  OSIRIS_HEALTH_ENDPOINT: ['monitoring', 'healthEndpoint']
});

// ═══════════════════════════════════════════════════════════════
// CONFIG MANAGER
// ═══════════════════════════════════════════════════════════════

/**
 * Configuration manager with env override support.
 * 
 * Usage:
 *   const config = require('./config');
 *   config.load();        // Load from file + env
 *   config.get('mode');   // Get value
 *   config.get('fixParams.maxAttemptsPerFingerprint');
 */
class ConfigManager {
  constructor(configFile = null) {
    this.configFile = configFile;
    this.config = null;
  }
  
  /**
   * Load configuration from defaults + env vars + optional file.
   * 
   * @param {string} [configFile] - Optional config file path
   * @returns {object} - Loaded configuration
   */
  load(configFile = this.configFile) {
    // Start with defaults
    this.config = this._deepClone(DEFAULT_CONFIG);
    
    // Apply env overrides
    this._applyEnvOverrides();
    
    // Apply file config if provided
    if (configFile && fs.existsSync(configFile)) {
      this._applyFileConfig(configFile);
    }
    
    // Validate final config
    this._validateConfig();
    
    return this.config;
  }
  
  _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  
  _applyEnvOverrides() {
    for (const [envVar, configPath] of Object.entries(ENV_MAPPINGS)) {
      const envValue = process.env[envVar];
      if (envValue !== undefined) {
        // Set the value at the config path
        if (Array.isArray(configPath)) {
          // Nested path like ['confidenceThresholds', 'autoFix']
          let target = this.config;
          for (let i = 0; i < configPath.length - 1; i++) {
            target = target[configPath[i]];
          }
          target[configPath[configPath.length - 1]] = this._parseEnvValue(envValue);
        } else {
          // Simple path
          this.config[configPath] = this._parseEnvValue(envValue);
        }
      }
    }
  }
  
  _parseEnvValue(value) {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    if (value.toLowerCase() === 'null') return null;
    if (value.toLowerCase() === 'undefined') return undefined;
    
    // Try number
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
    
    return value; // String
  }
  
  _applyFileConfig(configFile) {
    try {
      const content = fs.readFileSync(configFile, 'utf-8');
      const fileConfig = JSON.parse(content);
      
      // Deep merge (file config overrides defaults)
      this.config = this._deepMerge(this.config, fileConfig);
    } catch (err) {
      console.warn(`[Config] Failed to load config file ${configFile}: ${err.message}. Using defaults.`);
    }
  }
  
  _deepMerge(target, source) {
    if (typeof source !== 'object' || source === null) {
      return source;
    }
    
    if (typeof target !== 'object' || target === null) {
      return this._deepClone(source);
    }
    
    for (const key of Object.keys(source)) {
      target[key] = this._deepMerge(target[key], source[key]);
    }
    
    return target;
  }
  
  _validateConfig() {
    const errors = [];
    
    // Validate confidence thresholds
    const ct = this.config.confidenceThresholds;
    if (ct.autoFix > 1 || ct.autoFix < 0) errors.push('confidenceThresholds.autoFix must be 0-1');
    if (ct.queue > 1 || ct.queue < 0) errors.push('confidenceThresholds.queue must be 0-1');
    if (ct.escalate > 1 || ct.escalate < 0) errors.push('confidenceThresholds.escalate must be 0-1');
    
    // Ensure thresholds are ordered
    if (ct.autoFix < ct.queue) errors.push('autoFix threshold cannot be below queue threshold');
    if (ct.queue < ct.escalate) errors.push('queue threshold cannot be below escalate threshold');
    
    // Validate max diff lines
    if (this.config.fixParams.maxDiffLines > 120) {
      errors.push(`maxDiffLines (${this.config.fixParams.maxDiffLines}) exceeds safe limit of 120`);
    }
    
    if (errors.length > 0) {
      console.warn(`[Config] Validation warnings:`, errors);
      // Don't throw — use config with warnings
    }
  }
  
  /**
   * Get a config value using dot notation.
   * @param {string} path - Dot notation path (e.g., "fixParams.maxAttemptsPerFingerprint")
   * @param {*} [defaultValue] - Default value if not found
   * @returns {*} - Config value
   */
  get(path, defaultValue = undefined) {
    if (!this.config) {
      this.load();
    }
    
    return path.split('.').reduce((obj, key) => obj?.[key], this.config) || defaultValue;
  }
  
  /**
   * Get the full config object.
   */
  getAll() {
    if (!this.config) {
      this.load();
    }
    return this._deepClone(this.config);
  }
  
  /**
   * Get config for a specific component.
   */
  getComponent(component) {
    if (!this.config) {
      this.load();
    }
    
    return this.config[component] || {};
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════

const configManager = new ConfigManager();

/**
 * Initialize the config manager.
 * Must be called once at application startup.
 */
function initialize(configFile = null) {
  return configManager.load(configFile);
}

/**
 * Get a config value.
 */
function get(path, defaultValue) {
  return configManager.get(path, defaultValue);
}

/**
 * Get the full config.
 */
function getAll() {
  return configManager.getAll();
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  initialize,
  get,
  getAll,
  ConfigManager,
  DEFAULT_CONFIG
};
