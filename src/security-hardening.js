class SecurityHardening {
  constructor() {
    this.suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /\.\.[\/\\]/g,
      /union\s+select/gi,
      /drop\s+table/gi
    ];
    this.sensitiveFields = ['password', 'secret', 'token', 'apiKey', 'privateKey', 'hmac', 'authorization'];
  }

  redactSensitive(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const clone = Object.assign({}, obj);
    for (const key of Object.keys(clone)) {
      const lower = key.toLowerCase();
      if (this.sensitiveFields.some(f => lower.includes(f))) {
        clone[key] = '[REDACTED]';
      } else if (typeof clone[key] === 'string') {
        clone[key] = this.redactString(clone[key]);
      }
    }
    return clone;
  }

  redactString(str) {
    let out = str;
    for (const pattern of this.suspiciousPatterns) {
      out = out.replace(pattern, '[REDACTED]');
    }
    return out;
  }

  isSuspicious(payload) {
    const text = JSON.stringify(payload);
    return this.suspiciousPatterns.some(p => p.test(text));
  }

  addSecureHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  }

  validateSeverity(severity) {
    const n = Number(severity);
    if (!Number.isInteger(n) || n < 1 || n > 5) return false;
    return true;
  }
}

module.exports = { SecurityHardening };
