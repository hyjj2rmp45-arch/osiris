class DependencyUpdateChecker {
  constructor() {
    this.lastCheck = 0;
    this.checkIntervalMs = 24 * 60 * 60 * 1000;
    this.outdated = [];
    this.critical = [];
  }

  recordOutdated(name, current, wanted, latest, severity = 'patch') {
    this.outdated.push({
      name,
      current,
      wanted,
      latest,
      severity,
      detectedAt: new Date().toISOString()
    });
    if (severity === 'major' || severity === 'critical') {
      this.critical.push({ name, current, wanted, latest, severity });
    }
  }

  getOutdated() {
    return this.outdated.slice(-100);
  }

  getCritical() {
    return this.critical.slice(-50);
  }

  shouldCheck() {
    return Date.now() - this.lastCheck > this.checkIntervalMs;
  }

  markChecked() {
    this.lastCheck = Date.now();
  }

  getStats() {
    return {
      lastCheck: this.lastCheck ? new Date(this.lastCheck).toISOString() : null,
      outdatedCount: this.outdated.length,
      criticalCount: this.critical.length
    };
  }
}

module.exports = { DependencyUpdateChecker };
