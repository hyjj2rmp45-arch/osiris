class GoldenSignalsDashboard {
  constructor() {
    this.snapshots = [];
    this.maxSnapshots = 1000;
  }

  record(latencyMs, isError, requestCount) {
    this.snapshots.push({
      time: Date.now(),
      latencyMs: Number(latencyMs) || 0,
      isError: Boolean(isError),
      requestCount: Number(requestCount) || 0
    });
    if (this.snapshots.length > this.maxSnapshots) this.snapshots.shift();
  }

  getSummary(windowMs = 60 * 60 * 1000) {
    const now = Date.now();
    const recent = this.snapshots.filter(s => s.time >= now - windowMs);
    if (!recent.length) return { windowMs, sampleSize: 0 };

    const latencies = recent.map(s => s.latencyMs).sort((a, b) => a - b);
    const errors = recent.filter(s => s.isError).length;
    const requests = recent.reduce((sum, s) => sum + s.requestCount, 0);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p99Latency = latencies[Math.floor(latencies.length * 0.99)] || latencies[latencies.length - 1];

    return {
      windowMs,
      sampleSize: recent.length,
      requests,
      errors,
      errorRate: requests ? ((errors / requests) * 100).toFixed(2) + '%' : '0%',
      latency: { avg: avgLatency.toFixed(2), p99: p99Latency },
      status: errors / Math.max(1, recent.length) > 0.1 ? 'degraded' : 'healthy'
    };
  }

  getHistory(limit = 50) {
    return this.snapshots.slice(-limit);
  }
}

module.exports = { GoldenSignalsDashboard };
