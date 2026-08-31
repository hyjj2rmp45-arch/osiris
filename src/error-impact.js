class ErrorImpactScorer {
  constructor() {
    this.scores = new Map();
    this.maxEntries = 10000;
  }

  score(error) {
    const key = error.source + ':' + error.message;
    const now = Date.now();
    const entry = this.scores.get(key) || { count: 0, last: now, severitySum: 0, maxSeverity: 0 };

    entry.count += 1;
    entry.last = now;
    entry.severitySum += Number(error.severity) || 3;
    entry.maxSeverity = Math.max(entry.maxSeverity, Number(error.severity) || 3);

    this.scores.set(key, entry);

    const frequency = Math.min(entry.count, 50) / 50;
    const severity = entry.maxSeverity / 5;
    const recency = Math.max(0, 1 - (now - entry.last) / (24 * 60 * 60 * 1000));

    return Math.min(1, (frequency * 0.4) + (severity * 0.35) + (recency * 0.25));
  }

  getTop(limit = 20) {
    return Array.from(this.scores.entries())
      .map(([key, entry]) => ({
        key,
        ...entry,
        score: Math.min(1, (Math.min(entry.count, 50) / 50) * 0.4 + (entry.maxSeverity / 5) * 0.35 + Math.max(0, 1 - (Date.now() - entry.last) / (24 * 60 * 60 * 1000)) * 0.25)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  getStats() {
    const entries = Array.from(this.scores.values());
    return {
      trackedErrors: entries.length,
      totalOccurrences: entries.reduce((sum, e) => sum + e.count, 0),
      avgSeverity: entries.length ? (entries.reduce((sum, e) => sum + e.severitySum, 0) / entries.reduce((sum, e) => sum + e.count, 0)).toFixed(2) : '0.00'
    };
  }
}

module.exports = { ErrorImpactScorer };
