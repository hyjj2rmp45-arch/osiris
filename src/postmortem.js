const os = require('os');

class PostmortemGenerator {
  constructor() {
    this.postmortems = [];
    this.maxPostmortems = 500;
  }

  _getTimeline(errors) {
    return errors.map(e => ({
      time: e.timestamp,
      severity: e.severity,
      message: e.message,
      source: e.source,
      correlationId: e.correlationId
    })).sort((a, b) => new Date(a.time) - new Date(b.time));
  }

  _getRootCauses(errors) {
    const causes = new Map();
    for (const err of errors) {
      const key = err.source || 'unknown';
      causes.set(key, (causes.get(key) || 0) + 1);
    }
    return Array.from(causes.entries()).sort((a, b) => b[1] - a[1]).map(([source, count]) => ({ source, count, percentage: ((count / errors.length) * 100).toFixed(1) + '%' }));
  }

  _getRemediation(errors, fixes) {
    const successful = fixes.filter(f => f.success).length;
    const failed = fixes.filter(f => !f.success).length;
    return {
      attempted: fixes.length,
      successful,
      failed,
      successRate: fixes.length > 0 ? ((successful / fixes.length) * 100).toFixed(1) + '%' : 'N/A',
      recommendations: [
        'Review error patterns for common root causes',
        'Consider adding preventive fixes to known-fixes.json',
        'Evaluate if circuit breaker thresholds need adjustment',
        'Check if blast radius limits were appropriate'
      ]
    };
  }

  _buildTemplate(data) {
    const timeline = data.timeline.map(t => '- ' + t.time + ' - SEV' + t.severity + ': ' + t.message).join(os.EOL);
    const rootCauses = data.rootCauses.map(c => '- ' + c.source + ': ' + c.count + ' occurrences (' + c.percentage + ')').join(os.EOL);
    const recommendations = data.remediation.recommendations.map(r => '- ' + r).join(os.EOL);
    const maxSev = data.severity;

    let title = 'Postmortem: ' + data.title;
    if (maxSev >= 4) title = 'SEV1 Postmortem: ' + data.title;
    else if (maxSev === 3) title = 'SEV2 Postmortem: ' + data.title;
    else if (maxSev === 2) title = 'SEV3 Postmortem: ' + data.title;

    let body = '# ' + title + os.EOL + os.EOL;
    body += '## Incident Summary' + os.EOL;
    body += '- **Severity:** SEV' + maxSev + os.EOL;
    body += '- **Duration:** ' + data.duration + os.EOL;
    body += '- **Impact:** ' + data.impact + os.EOL;
    body += '- **Status:** ' + data.status + os.EOL + os.EOL;
    body += '## Timeline' + os.EOL + timeline + os.EOL + os.EOL;
    body += '## Root Cause Analysis' + os.EOL + rootCauses + os.EOL + os.EOL;
    body += '## Remediation' + os.EOL + recommendations + os.EOL + os.EOL;
    body += '## Action Items' + os.EOL;
    body += '1. Immediate: Fix critical issues' + os.EOL;
    body += '2. Short-term: Add preventive measures' + os.EOL;
    body += '3. Long-term: Improve monitoring and alerting' + os.EOL;

    return body;
  }

  async generate(errorBatch, fixBatch) {
    if (!errorBatch || errorBatch.length === 0) return null;

    const maxSev = Math.max(...errorBatch.map(e => e.severity));
    const title = (errorBatch[0].message || 'Unknown').substring(0, 50) + '...';
    const startTime = new Date(errorBatch[0].timestamp);
    const endTime = new Date(errorBatch[errorBatch.length - 1].timestamp);
    const duration = ((endTime - startTime) / 1000).toFixed(1) + 's';

    const data = {
      title,
      severity: maxSev,
      duration,
      impact: errorBatch.length + ' errors affected',
      status: 'resolved',
      timeline: this._getTimeline(errorBatch),
      rootCauses: this._getRootCauses(errorBatch),
      remediation: this._getRemediation(errorBatch, fixBatch)
    };

    const content = this._buildTemplate(data);
    const entry = {
      id: 'pm-' + Date.now(),
      timestamp: new Date().toISOString(),
      severity: maxSev,
      title,
      duration,
      errorCount: errorBatch.length,
      fixCount: fixBatch.length,
      content
    };

    this.postmortems.push(entry);
    if (this.postmortems.length > this.maxPostmortems) this.postmortems.shift();

    return entry;
  }

  getRecent(limit = 5) {
    return this.postmortems.slice(-limit);
  }

  getStats() {
    const bySeverity = {};
    for (const pm of this.postmortems) {
      bySeverity[pm.severity] = (bySeverity[pm.severity] || 0) + 1;
    }
    return {
      total: this.postmortems.length,
      bySeverity
    };
  }
}

module.exports = { PostmortemGenerator };
