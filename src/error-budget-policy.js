class ErrorBudgetPolicyEngine {
  constructor() {
    this.policies = [];
    this.violations = [];
    this.maxViolations = 1000;
  }

  addPolicy(name, options = {}) {
    this.policies.push({
      name,
      windowMs: Number(options.windowMs) || 60 * 60 * 1000,
      maxErrors: Number(options.maxErrors) || 10,
      severityThreshold: Number(options.severityThreshold) || 4,
      action: options.action || 'alert',
      enabled: Boolean(options.enabled) !== false
    });
  }

  evaluate(errorCount, severity, windowMs) {
    const violations = [];
    for (const policy of this.policies) {
      if (!policy.enabled) continue;
      if (severity < policy.severityThreshold) continue;
      if (errorCount > policy.maxErrors) {
        const violation = {
          policy: policy.name,
          action: policy.action,
          errorCount,
          maxErrors: policy.maxErrors,
          severity,
          windowMs,
          timestamp: new Date().toISOString()
        };
        violations.push(violation);
        this.violations.push(violation);
        if (this.violations.length > this.maxViolations) this.violations.shift();
      }
    }
    return violations;
  }

  getRecentViolations(limit = 20) {
    return this.violations.slice(-limit);
  }

  getStats() {
    return {
      policies: this.policies.length,
      violations: this.violations.length
    };
  }
}

module.exports = { ErrorBudgetPolicyEngine };
