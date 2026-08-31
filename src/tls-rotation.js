class TLSCertificateRotator {
  constructor() {
    this.certs = new Map();
    this.rotationHistory = [];
    this.maxHistory = 1000;
  }

  register(name, certPath, keyPath, expiryDays = 30) {
    this.certs.set(name, {
      certPath,
      keyPath,
      expiryDays,
      lastRotation: 0,
      rotationCount: 0
    });
  }

  checkExpiry(name) {
    const cert = this.certs.get(name);
    if (!cert) return null;

    // Simulated expiry check
    const daysSinceRotation = (Date.now() - cert.lastRotation) / (24 * 60 * 60 * 1000);
    const daysRemaining = cert.expiryDays - daysSinceRotation;

    return {
      name,
      daysRemaining: Math.max(0, daysRemaining),
      needsRotation: daysRemaining < 7,
      urgency: daysRemaining < 3 ? 'critical' : daysRemaining < 7 ? 'high' : 'normal'
    };
  }

  async rotate(name) {
    const cert = this.certs.get(name);
    if (!cert) return { success: false, error: 'Certificate not found' };

    const rotation = {
      name,
      timestamp: Date.now(),
      success: true
    };

    try {
      // Simulated rotation logic
      cert.lastRotation = Date.now();
      cert.rotationCount += 1;
      
      this.rotationHistory.push(rotation);
      if (this.rotationHistory.length > this.maxHistory) this.rotationHistory.shift();
      
      return { success: true, rotatedAt: new Date().toISOString() };
    } catch (err) {
      rotation.success = false;
      rotation.error = err.message;
      this.rotationHistory.push(rotation);
      return { success: false, error: err.message };
    }
  }

  getStats() {
    const stats = [];
    for (const [name, cert] of this.certs) {
      const expiry = this.checkExpiry(name);
      stats.push({
        name,
        expiryDays: cert.expiryDays,
        lastRotation: cert.lastRotation ? new Date(cert.lastRotation).toISOString() : null,
        rotationCount: cert.rotationCount,
        ...expiry
      });
    }
    return stats;
  }
}

module.exports = { TLSCertificateRotator };
