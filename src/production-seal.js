class ProductionSeal {
  constructor() {
    this.checks = [];
    this.passed = false;
    this.lastCheck = 0;
  }

  addCheck(name, fn) {
    this.checks.push({ name, fn });
  }

  async verify() {
    this.lastCheck = Date.now();
    const results = [];
    for (const check of this.checks) {
      try {
        const result = await check.fn();
        results.push({ name: check.name, pass: Boolean(result) });
      } catch (err) {
        results.push({ name: check.name, pass: false, error: err.message });
      }
    }
    this.passed = results.every(r => r.pass);
    return { passed: this.passed, checkedAt: new Date().toISOString(), checks: results };
  }

  isReady() {
    return this.passed;
  }
}

module.exports = { ProductionSeal };
