class RootCauseAnalyzer {
  constructor() {
    this.clusters = new Map();
    this.maxClusters = 500;
  }

  _tokenize(text) {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  _clusterKey(text) {
    const tokens = this._tokenize(text);
    const stop = new Set(['the','and','for','with','from','that','this','into','your','have','been','will','error','failed','failed']);
    const meaningful = tokens.filter(t => !stop.has(t)).slice(0, 6);
    return meaningful.join('|') || 'unknown';
  }

  analyze(errors) {
    const clusters = new Map();

    for (const error of errors) {
      const key = this._clusterKey(error.message + ' ' + (error.source || ''));
      const entry = clusters.get(key) || {
        key,
        count: 0,
        severities: [],
        sources: new Set(),
        first: error.timestamp,
        last: error.timestamp,
        samples: []
      };

      entry.count += 1;
      entry.severities.push(Number(error.severity) || 3);
      if (error.source) entry.sources.add(error.source);
      entry.last = error.timestamp;
      if (entry.samples.length < 5) entry.samples.push({ message: error.message, source: error.source, timestamp: error.timestamp });

      clusters.set(key, entry);
    }

    return Array.from(clusters.values())
      .map(c => ({
        ...c,
        sources: Array.from(c.sources),
        avgSeverity: c.severities.reduce((a, b) => a + b, 0) / c.severities.length
      }))
      .sort((a, b) => b.count - a.count);
  }

  getTopCauses(limit = 10) {
    return Array.from(this.clusters.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

module.exports = { RootCauseAnalyzer };
