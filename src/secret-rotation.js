class SecretRotationEnforcer {
  constructor() {
    this.secrets = new Map();
    this.rotationHistory = [];
    this.maxHistory = 1000;
  }

  register(name, currentValue, maxAgeMs = 90 * 24 * 60 * 60 * 1000) {
    this.secrets.set(name, {
      currentValue,
      maxAgeMs,
      rotatedAt: Date.now(),
      rotationCount: 0
    });
  }

  needsRotation(name) {
    const secret = this.secrets.get(name);
    if (!secret) return null;
    const age = Date.now() - secret.rotatedAt;
    const remaining = secret.maxAgeMs - age;
    return {
      name,
      ageMs: age,
      remainingMs: Math.max(0, remaining),
      needsRotation: remaining <= 0,
      urgency: remaining <= 0 ? 'critical' : remaining < 7 * 24 * 60 * 60 * 1000 ? 'high' : 'normal'
    };
  }

  rotate(name, newValue) {
    const secret = this.secrets.get(name);
    if (!secret) return { success: false, error: 'Secret not found' };
    
    const rotation = {
      name,
      timestamp: Date.now(),
      success: true
    };
    
    secret.currentValue = newValue;
    secret.rotatedAt = Date.now();
    secret.rotationCount += 1;
    
    this.rotationHistory.push(rotation);
    if (this.rotationHistory.length > this.maxHistory) this.rotationHistory.shift();
    
    return { success: true, rotatedAt: new Date().toISOString() };
  }

  getStats() {
    const stats = [];
    for (const [name, secret] of this.secrets) {
      const status = this.needsRotation(name);
      stats.push({
        name,
        rotationCount: secret.rotationCount,
        ...status
      });
    }
    return stats;
  }
}

module.exports = { SecretRotationEnforcer };
