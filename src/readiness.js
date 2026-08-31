class ProductionReadiness {
  constructor() {
    this.checks = [];
    this.results = new Map();
    this.lastRun = 0;
  }

  register(name, checkFn) {
    this.checks.push({ name, fn: checkFn });
  }

  async runAll() {
    this.lastRun = Date.now();
    for (const check of this.checks) {
      try {
        const result = await check.fn();
        this.results.set(check.name, { pass: Boolean(result), checkedAt: new Date().toISOString() });
      } catch (err) {
        this.results.set(check.name, { pass: false, error: err.message, checkedAt: new Date().toISOString() });
      }
    }
    return this.getSummary();
  }

  getSummary() {
    const entries = Array.from(this.results.entries()).map(([name, result]) => ({ name, ...result }));
    const passed = entries.filter(e => e.pass).length;
    return { total: entries.length, passed, failed: entries.length - passed, checks: entries };
  }
}

module.exports = { ProductionReadiness };
