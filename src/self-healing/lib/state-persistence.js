/**
 * Atomic State Persistence
 * 
 * Phase 1: Safety Foundation
 * 
 * Provides atomic file writes for all persistent state.
 * Uses the write-to-temp-then-rename pattern which is atomic on POSIX systems.
 * Includes schema versioning and corruption-resistant loading.
 * 
 * Design goals:
 * - NEVER corrupt state file on crash mid-write
 * - Validate schema on load (reject corrupted state)
 * - Auto-recover to safe defaults on corruption
 * - Minimize I/O by batching changes
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Atomically write JSON state to a file.
 * Uses temp file + rename pattern for atomicity.
 * 
 * @param {string} filePath - Target file path
 * @param {object} data - Data to serialize
 * @param {object} [options] - { schemaVersion, prettyPrint }
 * @throws {Error} If write fails
 */
function atomicWriteJSON(filePath, data, options = {}) {
  const writeData = {
    _schemaVersion: options.schemaVersion || 1,
    _writtenAt: new Date().toISOString(),
    ...data
  };
  
  const content = options.prettyPrint !== false 
    ? JSON.stringify(writeData, null, 2)
    : JSON.stringify(writeData);
  
  const dir = path.dirname(filePath);
  
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write to temp file
  const tmpFile = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  
  try {
    fs.writeFileSync(tmpFile, content, {
      encoding: 'utf-8',
      flag: 'wx',  // Exclusive create - fail if exists (prevents collision)
      mode: 0o600
    });
    
    // Atomic rename (on POSIX, rename is atomic)
    fs.renameSync(tmpFile, filePath);
    
  } catch (err) {
    // Clean up temp file if it exists
    try {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    } catch (cleanupErr) {
      // Best effort cleanup
    }
    throw err;
  }
}

/**
 * Safely read and validate JSON state.
 * Returns safe defaults if file is missing or corrupted.
 * 
 * @param {string} filePath - State file path
 * @param {object} defaults - Default values to use if load fails
 * @param {number} [expectedSchemaVersion] - Expected schema version
 * @returns {object} - Parsed state or defaults
 */
function safeReadJSON(filePath, defaults, expectedSchemaVersion = 1) {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return defaults;
  }
  
  try {
    const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
    
    // Handle empty file
    if (!content.trim()) {
      return defaults;
    }
    
    const parsed = JSON.parse(content);
    
    // Validate schema version
    const schemaVersion = parsed._schemaVersion || 1;
    if (schemaVersion !== expectedSchemaVersion) {
      // Schema mismatch — could be migration needed or corruption
      // For now, return defaults to fail-safe
      console.warn(`[State] Schema version mismatch for ${filePath}: expected ${expectedSchemaVersion}, got ${schemaVersion}. Using defaults.`);
      return defaults;
    }
    
    // Reconstruct data (strip metadata)
    const data = { ...parsed };
    delete data._schemaVersion;
    delete data._writtenAt;
    
    return data;
    
  } catch (err) {
    // JSON parse error or read error
    console.warn(`[State] Failed to load ${filePath}: ${err.message}. Using defaults.`);
    return defaults;
  }
}

/**
 * Create a managed state store with automatic persistence.
 * 
 * @param {string} stateFile - Path to state file
 * @param {object} initialState - Default state
 * @param {number} [schemaVersion=1] - Schema version for validation
 * @returns {object} - State manager instance
 */
function createStateManager(stateFile, initialState, schemaVersion = 1) {
  // Load initial state
  let state = safeReadJSON(stateFile, initialState, schemaVersion);
  
  // Ensure loaded state has all expected fields
  state = { ...initialState, ...state };
  
  return {
    /**
     * Get a value by key path (e.g., "rateLimitTracker.fingerprint123")
     */
    get(keyPath) {
      return keyPath.split('.').reduce((obj, key) => obj?.[key], state);
    },
    
    /**
     * Set a value by key path and persist immediately.
     * For batched updates, use .batch() instead.
     */
    set(keyPath, value) {
      const keys = keyPath.split('.');
      const last = keys.pop();
      const target = keys.reduce((obj, key) => {
        if (!obj[key]) obj[key] = {};
        return obj[key];
      }, state);
      target[last] = value;
      
      atomicWriteJSON(stateFile, state, { schemaVersion });
      return state;
    },
    
    /**
     * Batch update multiple keys, then persist once.
     * @param {object} updates - { "path.to.key": value, ... }
     */
    batch(updates) {
      for (const [keyPath, value] of Object.entries(updates)) {
        const keys = keyPath.split('.');
        const last = keys.pop();
        const target = keys.reduce((obj, key) => {
          if (!obj[key]) obj[key] = {};
          return obj[key];
        }, state);
        target[last] = value;
      }
      atomicWriteJSON(stateFile, state, { schemaVersion });
      return state;
    },
    
    /**
     * Get full state snapshot.
     */
    getState() {
      return state;
    },
    
    /**
     * Replace entire state and persist.
     */
    replaceState(newState) {
      state = { ...newState };
      atomicWriteJSON(stateFile, state, { schemaVersion });
      return state;
    },
    
    /**
     * Persist current state to disk.
     */
    save() {
      atomicWriteJSON(stateFile, state, { schemaVersion });
      return state;
    },
    
    /**
     * Reset to initial state and persist.
     */
    reset() {
      state = { ...initialState };
      atomicWriteJSON(stateFile, state, { schemaVersion });
      return state;
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

/**
 * Check health of a state file (file exists, valid JSON, correct schema).
 * 
 * @param {string} stateFile - Path to check
 * @param {number} expectedSchemaVersion - Expected version
 * @returns {{healthy: boolean, issue?: string}}
 */
function checkStateHealth(stateFile, expectedSchemaVersion = 1) {
  if (!fs.existsSync(stateFile)) {
    return { healthy: true, issue: 'File not yet created (will use defaults)' };
  }
  
  try {
    const content = fs.readFileSync(stateFile, 'utf-8');
    if (!content.trim()) {
      return { healthy: false, issue: 'File is empty' };
    }
    
    const parsed = JSON.parse(content);
    
    if (parsed._schemaVersion !== expectedSchemaVersion) {
      return { 
        healthy: false, 
        issue: `Schema version mismatch: expected ${expectedSchemaVersion}, got ${parsed._schemaVersion || 'missing'}`
      };
    }
    
    return { healthy: true, issue: null };
    
  } catch (err) {
    return { healthy: false, issue: `Parse error: ${err.message}` };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  atomicWriteJSON,
  safeReadJSON,
  createStateManager,
  checkStateHealth
};
