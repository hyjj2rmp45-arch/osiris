class SLOBurnRateAlerting {
  constructor() {
    this.windows = [];
    this.maxWindows = 1000;
    this.defaultWindowMs = 60 * 60 * 1000; // 1 hour
  }

  recordError(severity) {
    this.windows.push({ time: Date.now(), severity: Number(severity) || 3 });
    if (this.windows.length > this.maxWindows) this.windows.shift();
  }

  compute(windowMs) {
    windowMs = Number(windowMs) || this.defaultWindowMs;
    const now = Date.now();
    const cutoff = now - windowMs;
    const recent = this.windows.filter(w => w.time >= cutoff);
    const errorCount = recent.length;
    const bySeverity = {};
    for (const w of recent) {
      const s = String(w.severity);
      bySeverity[s] = (bySeverity[s] || 0) + 1;
    }
    return { windowMs, errorCount, bySeverity, sampledAt: new Date(now).toISOString() };
  }

  getAlert(windowMs) {
    const data = this.compute(windowMs);
    const threshold = Math.max(1, Math.floor(windowMs / 60000)); // 1 error per minute baseline
    if (data.errorCount >= threshold * 5) return { level: 'critical', message: 'Burn rate critically high' };
    if (data.errorCount >= threshold * 2) return { level: 'warning', message: 'Burn rate elevated' };
    return { level: 'normal', message: 'Burn rate normal' };
  }
}

module.exports = { SLOBurnRateAlerting };
