class KeyRotationPolicy {
  constructor() {
    this.keys = new Map();
    this.rotationHistory = [];
    this.maxHistory = 1000;
  }

  register(name, createdAt, maxAgeMs = 90 * 24 * 60 * 60 * 1000, owner) {
    this.keys.set(name, {
      createdAt: new Date(createdAt).getTime(),
      maxAgeMs,
      owner: owner || 'unknown',
      rotatedAt: new Date(createdAt).getTime(),
      rotationCount: 0
    });
  }

  needsRotation(name) {
    const key = this.keys.get(name);
    if (!key) return null;
    const age = Date.now() - key.createdAt;
    const remaining = key.maxAgeMs - age;
    return {
      name,
      owner: key.owner,
      ageMs: age,
      remainingMs: Math.max(0, remaining),
      needsRotation: remaining <= 0,
      urgency: remaining <= 0 ? 'critical' : remaining < 7 * 24 * 60 * 60 * 1000 ? 'high' : remaining < 30 * 24 * 60 * 60 * 1000 ? 'medium' : 'low'
    };
  }

  rotate(name) {
    const key = this.keys.get(name);
    if (!key) return { success: false, error: 'Key not found' };
    const rotation = { name, timestamp: Date.now(), success: true };
    key.rotatedAt = Date.now();
    key.rotationCount += 1;
    this.rotationHistory.push(rotation);
    if (this.rotationHistory.length > this.maxHistory) this.rotationHistory.shift();
    return { success: true, rotatedAt: new Date().toISOString() };
  }

  getStats() {
    const stats = [];
    for (const [name, key] of this.keys) {
      const status = this.needsRotation(name);
      stats.push({ name, owner: key.owner, rotationCount: key.rotationCount, ...status });
    }
    return stats;
  }
}

module.exports = { KeyRotationPolicy };
