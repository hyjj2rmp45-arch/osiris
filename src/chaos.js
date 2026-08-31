class ChaosEngine {
  constructor() {
    this.experiments = [];
    this.running = false;
    this.maxHistory = 500;
  }

  schedule(experiment) {
    this.experiments.push({
      id: 'chaos-' + Date.now(),
      name: experiment.name || 'Unnamed',
      pattern: experiment.pattern || null,
      severity: experiment.severity || [3, 4, 5],
      action: experiment.action || null,
      probability: Number(experiment.probability) || 0.1,
      cooldownMs: Number(experiment.cooldownMs) || 24 * 60 * 60 * 1000,
      lastRun: 0,
      enabled: Boolean(experiment.enabled) || false
    });
  }

  findExperiment(error) {
    if (!this.experiments.length) return null;
    const text = (error.message + ' ' + (error.source || '')).toLowerCase();
    return this.experiments.find(ex => {
      if (!ex.enabled) return false;
      if (!ex.severity.includes(error.severity)) return false;
      if (ex.pattern && !ex.pattern.test(text)) return false;
      const now = Date.now();
      if (now - ex.lastRun < ex.cooldownMs) return false;
      return Math.random() < ex.probability;
    }) || null;
  }

  async run(experiment, error) {
    experiment.lastRun = Date.now();
    console.log('[chaos] Running:', experiment.name, 'for', error.id);
    
    try {
      if (experiment.action && typeof experiment.action === 'function') {
        await experiment.action(error);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = { ChaosEngine };
