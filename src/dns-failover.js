class DNSFailover {
  constructor() {
    this.endpoints = [];
    this.healthCheckIntervalMs = 30000;
    this.lastCheck = 0;
  }

  register(name, primary, fallbacks = []) {
    this.endpoints.push({
      name,
      primary,
      fallbacks: fallbacks.slice(0, 3),
      currentIndex: 0,
      healthy: true,
      lastCheck: 0
    });
  }

  getActive(name) {
    const ep = this.endpoints.find(e => e.name === name);
    if (!ep) return null;
    const candidates = [ep.primary, ...ep.fallbacks];
    return candidates[ep.currentIndex] || candidates[0];
  }

  async check(name) {
    const ep = this.endpoints.find(e => e.name === name);
    if (!ep) return null;

    const result = {
      name,
      active: this.getActive(name),
      healthy: ep.healthy,
      lastCheck: new Date().toISOString()
    };

    // Simulated health check
    if (!ep.healthy) {
      const next = (ep.currentIndex + 1) % ([ep.primary, ...ep.fallbacks].length);
      ep.currentIndex = next;
      ep.healthy = true;
      result.failedOver = true;
    }

    ep.lastCheck = Date.now();
    return result;
  }
}

module.exports = { DNSFailover };
