class ComplianceReporter {
  constructor(complianceEngine) {
    this.compliance = complianceEngine;
    this.reports = [];
    this.maxReports = 500;
  }

  generateReport(name, auditLog, errorBuffer) {
    const { auditLog: retainedAudit, errorBuffer: retainedErrors } = this.compliance.applyRetention(auditLog, errorBuffer);
    const report = {
      id: 'rpt-' + Date.now(),
      name,
      generatedAt: new Date().toISOString(),
      retentionDays: this.compliance.retentionDays,
      summary: {
        auditEntries: retainedAudit.length,
        errors: retainedErrors.length,
        severityDistribution: this._severityDistribution(retainedErrors),
        topSources: this._topSources(retainedErrors),
        actions: this._actionCounts(retainedAudit)
      },
      details: {
        recentAudit: retainedAudit.slice(-20),
        recentErrors: retainedErrors.slice(-20)
      }
    };
    this.reports.push(report);
    if (this.reports.length > this.maxReports) this.reports.shift();
    return report;
  }

  _severityDistribution(errors) {
    const counts = {};
    for (const e of errors) {
      const s = String(e.severity || 'unknown');
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }

  _topSources(errors, limit = 10) {
    const counts = {};
    for (const e of errors) {
      const src = e.source || 'unknown';
      counts[src] = (counts[src] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([source, count]) => ({ source, count }));
  }

  _actionCounts(auditLog) {
    const counts = {};
    for (const e of auditLog) {
      const a = e.action || 'unknown';
      counts[a] = (counts[a] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([action, count]) => ({ action, count }));
  }

  getRecent(limit = 10) {
    return this.reports.slice(-limit);
  }

  getStats() {
    return { totalReports: this.reports.length };
  }
}

module.exports = { ComplianceReporter };
