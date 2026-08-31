class SecretManagementIntegration {
  constructor() {
    this.providers = [];
    this.cache = new Map();
    this.maxCacheAgeMs = 5 * 60 * 1000;
  }

  registerProvider(name, fetchFn) {
    this.providers.push({ name, fetchFn });
  }

  async getSecret(name) {
    const cached = this.cache.get(name);
    if (cached && Date.now() - cached.fetchedAt < this.maxCacheAgeMs) {
      return cached.value;
    }

    for (const provider of this.providers) {
      try {
        const value = await provider.fetchFn(name);
        if (value !== undefined && value !== null) {
          this.cache.set(name, { value, fetchedAt: Date.now(), provider: provider.name });
          return value;
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  invalidate(name) {
    if (name) this.cache.delete(name);
    else this.cache.clear();
  }

  getStats() {
    return {
      providers: this.providers.length,
      cachedSecrets: this.cache.size,
      maxCacheAgeMs: this.maxCacheAgeMs
    };
  }
}

module.exports = { SecretManagementIntegration };
