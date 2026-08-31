class ComplianceEngine {
  constructor() {
    this.retentionDays = 90;
    this.anonymizeFields = ['email', 'ip', 'userId', 'phone'];
    this.enabled = true;
  }

  applyRetention(auditLog, errorBuffer) {
    if (!this.enabled) return { auditLog, errorBuffer };
    const cutoff = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
    const retainedAudit = auditLog.filter(e => new Date(e.timestamp || 0).getTime() > cutoff);
    const retainedErrors = errorBuffer.filter(e => new Date(e.timestamp || 0).getTime() > cutoff);
    return { auditLog: retainedAudit, errorBuffer: retainedErrors };
  }

  anonymize(entry) {
    if (!entry || typeof entry !== 'object') return entry;
    const clone = Object.assign({}, entry);
    for (const field of this.anonymizeFields) {
      if (clone[field]) clone[field] = '[REDACTED]';
    }
    return clone;
  }

  redactPayload(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    const clone = Object.assign({}, payload);
    for (const field of this.anonymizeFields) {
      if (clone[field]) clone[field] = '[REDACTED]';
    }
    return clone;
  }

  getStatus() {
    return {
      enabled: this.enabled,
      retentionDays: this.retentionDays,
      anonymizeFields: this.anonymizeFields
    };
  }
}

module.exports = { ComplianceEngine };
