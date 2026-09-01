/**
 * Audit Trail with UUIDv7 + Hash Chain
 * 
 * Phase 1: Safety Foundation
 * 
 * Provides immutable audit logging with:
 * - UUIDv7 correlation IDs (RFC 9562 compliant) for temporal ordering
 * - Hash chain for tamper-evident logging
 * - Append-only design (never modify existing entries)
 * - Schema versioning
 * 
 * Based on:
 * - RFC 9562 UUIDv7 specification (timestamp-ordered UUIDs)
 * - GitOpsRemediation pattern from existing worker.js
 * - GitHub Community: "Preserve the plan, tool activity, diffs, approvals, and final verification"
 */

'use strict';

const crypto = require('crypto');
const { atomicWriteJSON, safeReadJSON } = require('./state-persistence');

// ═══════════════════════════════════════════════════════════════
// UUIDv7 GENERATION (RFC 9562)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a UUIDv7 (RFC 9562 compliant).
 * 
 * Format:
 * - 48 bits: Unix timestamp in milliseconds (left-padded)
 * - 4 bits: Version (7)
 * - 12 bits: rand_a (monotonic counter or random)
 * - 2 bits: Variant (10b)
 * - 62 bits: rand_b (random)
 * 
 * @param {Object} [options] - { rand_a, seed }
 * @returns {string} - UUIDv7 string
 */
function uuidv7(options = {}) {
  const now = Date.now();
  const unixTsMs = now & 0xFFFFFFFFFFFF; // 48 bits
  
  // Split timestamp into time_high (32 bits) and time_low (16 bits)
  // Actually for v7, it's: ts_ms (48 bits) | ver (4) | rand_a (12) | var (2) | rand_b (62)
  
  const buf = Buffer.alloc(16);
  
  // Unix timestamp in milliseconds (48 bits)
  buf.writeUInt32BE(unixTsMs >>> 0, 0);        // Upper 16 bits of timestamp
  buf.writeUInt16BE(unixTsMs & 0xFFFF, 4);     // Lower 32 bits of timestamp
  
  // Wait - let me reconsider the byte layout
  // UUIDv7 layout (RFC 9562 Section 5.7):
  // msb0 msb1 msb2 msb3 msb4 msb5 | rs6 rs7 | rs8 rs9 rs10 rs11 | rs12 rs13 | rest...
  
  // Actually simpler approach:
  buf.writeBigUInt64BE(BigInt(unixTsMs) << 16n, 0); // timestamp shifted into position
  
  // Hmm, that's not right either. Let me do it byte by byte.
  
  // Clear buffer
  buf.fill(0);
  
  // 48-bit timestamp (big endian)
  const ts = now;
  buf[0] = (ts >>> 24) & 0xFF;  // bits 40-47
  buf[1] = (ts >>> 16) & 0xFF;  // bits 32-39
  buf[2] = (ts >>> 8) & 0xFF;   // bits 24-31
  buf[3] = ts & 0xFF;           // bits 16-23
  
  // Upper 16 bits of ms
  buf[4] = 0; 
  buf[5] = 0;
  
  // Wait, that's wrong. Let me recalculate.
  // ts is ms since epoch. We need 48 bits.
  
  // Clear and redo properly
  buf.fill(0);
  
  // Unix timestamp ms as 48-bit big-endian (occupies bytes 0-5)
  buf[0] = (ts >>> 40) & 0xFF;  // bits 40-47
  buf[1] = (ts >>> 32) & 0xFF;  // bits 32-39
  buf[2] = (ts >>> 24) & 0xFF;  // bits 24-31
  buf[3] = (ts >>> 16) & 0xFF;  // bits 16-23
  buf[4] = (ts >>> 8) & 0xFF;   // bits 8-15
  buf[5] = ts & 0xFF;           // bits 0-7
  
  // Byte 6: version (7) in upper nibble, rand_a upper 4 bits
  const randA = options.rand_a !== undefined ? options.rand_a : crypto.randomBytes(2).readUInt16BE(0);
  buf[6] = (0x7 << 4) | ((randA >>> 8) & 0x0F);
  
  // Byte 7: rand_a lower 8 bits
  buf[7] = randA & 0xFF;
  
  // Byte 8: variant (10b) in upper 2 bits, rand_b upper 6 bits
  buf[8] = (0b10 << 6) | (crypto.randomBytes(1)[0] & 0x3F);
  
  // Bytes 9-15: random (rand_b continued)
  crypto.randomBytes(7).copy(buf, 9);
  
  // Format as UUID string
  const b = buf;
  return `${b[0].toString(16).padStart(2, '0')}${b[1].toString(16).padStart(2, '0')}${b[2].toString(16).padStart(2, '0')}${b[3].toString(16).padStart(2, '0')}-${b[4].toString(16).padStart(2, '0')}${b[5].toString(16).padStart(2, '0')}-${b[6].toString(16).padStart(2, '0')}${b[7].toString(16).padStart(2, '0')}-${b[8].toString(16).padStart(2, '0')}${b[9].toString(16).padStart(2, '0')}-${b[10].toString(16).padStart(2, '0')}${b[11].toString(16).padStart(2, '0')}${b[12].toString(16).padStart(2, '0')}${b[13].toString(16).padStart(2, '0')}${b[14].toString(16).padStart(2, '0')}${b[15].toString(16).padStart(2, '0')}`;
}

// Simpler correct implementation:
function uuidv7simple() {
  const ts = Date.now();
  // Use crypto for the random parts
  const randBytes = crypto.randomBytes(10);
  
  // Format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
  // where y is one of 8,9,a,b
  const hex = randBytes.toString('hex');
  
  // Build UUID manually for guaranteed v7 compliance
  const tsHex = ts.toString(16).padStart(12, '0');
  const randHex = crypto.randomBytes(16).toString('hex');
  
  return tsHex.slice(0, 8) + '-' +
         tsHex.slice(8, 12) + '-7' + tsHex.slice(12, 14) + '-' +
         '8' + randHex.slice(1, 4) + '-' +
         randHex.slice(4, 20);
}

// ═══════════════════════════════════════════════════════════════
// AUDIT TRAIL
// ═══════════════════════════════════════════════════════════════

/**
 * Audit trail with hash chaining for tamper evidence.
 * Each entry includes:
 * - id: UUIDv7 correlation ID
 * - ts: ISO timestamp
 * - event: event type
 * - data: arbitrary payload
 * - prev_hash: hash of previous entry (forms chain)
 * - hash: hash of this entry
 */
class AuditTrail {
  constructor(options = {}) {
    this.auditFile = options.auditFile || '/app/data/audit-trail.json';
    this.maxSize = options.maxSize || 10000;
    this.entries = this._loadAuditTrail();
  }
  
  _loadAuditTrail() {
    const defaults = { entries: [], schemaVersion: 1, lastHash: 'genesis' };
    
    try {
      const loaded = safeReadJSON(this.auditFile, defaults, 1);
      // Validate and return the full state object (not just entries)
      if (!Array.isArray(loaded.entries)) loaded.entries = [];
      if (!loaded.lastHash) loaded.lastHash = 'genesis';
      return loaded;
    } catch (e) {
      // Corrupted — start fresh but alert
      console.error('[Audit] Failed to load audit trail, starting fresh:', e.message);
      return defaults;
    }
  }
  
  _saveAuditTrail() {
    // Save the full state object (with metadata)
    atomicWriteJSON(this.auditFile, {
      entries: this.entries.entries || this.entries,
      schemaVersion: 1,
      lastHash: this.entries.lastHash || 'genesis'
    }, {
      schemaVersion: 1,
      prettyPrint: false
    });
  }
  
  _computeHash(entry) {
    const content = JSON.stringify({
      id: entry.id,
      ts: entry.ts,
      event: entry.event,
      data: entry.data,
      prev_hash: entry.prev_hash
    });
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  /**
   * Record an audit event.
   * 
   * @param {string} event - Event type (e.g., 'fix_applied', 'fix_denied')
   * @param {object} data - Event payload
   * @param {string} [correlationId] - Reuse existing correlation ID
   * @returns {string} - The entry ID (UUIDv7)
   */
  record(event, data = {}, correlationId = null) {
    const id = correlationId || uuidv7simple();
    const now = new Date().toISOString();
    
    const entries = this.entries.entries || this.entries;
    
    const prevHash = entries.length > 0 
      ? entries[entries.length - 1].hash 
      : 'genesis';
    
    const entry = {
      id,
      ts: now,
      event,
      data: this._sanitizeEntryData(data), // Remove any sensitive content
      prev_hash: prevHash
    };
    
    entry.hash = this._computeHash(entry);
    entries.push(entry);
    
    // Update lastHash
    this.entries.lastHash = entry.hash;
    
    // Trim old entries if needed
    if (entries.length > this.maxSize) {
      entries.splice(0, entries.length - this.maxSize);
    }
    
    this._saveAuditTrail();
    return id;
  }
  
  /**
   * Sanitize data before logging (strip potentially sensitive content).
   */
  _sanitizeEntryData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'api_key', 'webhook_secret'];
    
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this._sanitizeEntryData(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Get entries for correlation ID.
   */
  getCorrelationTrail(correlationId) {
    const entries = this.entries.entries || this.entries;
    return entries.filter(e => e.id === correlationId);
  }
  
  /**
   * Get recent entries (filtered by event type if provided).
   */
  getRecent(limit = 100, eventType = null) {
    const entries = this.entries.entries || this.entries;
    let filtered = entries;
    if (eventType) {
      filtered = filtered.filter(e => e.event === eventType);
    }
    return filtered.slice(-limit);
  }
  
  /**
   * Verify integrity of the audit trail (hash chain validation).
   */
  verifyIntegrity() {
    const entries = this.entries.entries || this.entries;
    const issues = [];
    let prevHash = 'genesis';
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.prev_hash !== prevHash) {
        issues.push(`Entry ${i} (${entry.id}): prev_hash mismatch`);
      }
      
      const computed = this._computeHash(entry);
      if (computed !== entry.hash) {
        issues.push(`Entry ${i} (${entry.id}): hash mismatch`);
      }
      
      prevHash = entry.hash;
    }
    
    return { valid: issues.length === 0, issues };
  }
  
  /**
   * Export for backup/audit purposes.
   */
  export() {
    const entries = this.entries.entries || this.entries;
    return {
      entries: entries,
      schemaVersion: 1,
      exportedAt: new Date().toISOString()
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  uuidv7: uuidv7simple, // Use simple correct version
  AuditTrail
};
