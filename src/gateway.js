class APIGateway {
  constructor() {
    this.routes = [];
    this.rateLimits = new Map();
    this.maxRequestsPerMinute = 120;
  }

  addRoute(method, path, handler, options = {}) {
    this.routes.push({
      method: method.toUpperCase(),
      path,
      handler,
      auth: options.auth || false,
      rateLimit: options.rateLimit || this.maxRequestsPerMinute,
      allowedOrigins: options.allowedOrigins || []
    });
  }

  checkRateLimit(key) {
    const now = Date.now();
    const window = now - 60000;
    const bucket = this.rateLimits.get(key) || { count: 0, windowStart: now };
    
    if (bucket.windowStart < window) {
      bucket.count = 0;
      bucket.windowStart = now;
    }
    
    bucket.count += 1;
    this.rateLimits.set(key, bucket);
    
    return bucket.count <= this.maxRequestsPerMinute;
  }

  getCorsHeaders(allowedOrigins, origin) {
    if (allowedOrigins.includes(origin)) {
      return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      };
    }
    return { 'Access-Control-Allow-Origin': '*' };
  }

  getStatus() {
    return {
      routes: this.routes.length,
      rateLimitEntries: this.rateLimits.size,
      maxRequestsPerMinute: this.maxRequestsPerMinute
    };
  }
}

module.exports = { APIGateway };
