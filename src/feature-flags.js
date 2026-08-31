class FeatureFlags {
  constructor() {
    this.flags = new Map();
    this.defaults = {
      enableAutoFix: true,
      enableQueueDrain: true,
      enableSelfHealing: true,
      enableMLClassification: true,
      enableRunbooks: true,
      enablePostmortem: true,
      maxAutoFixSeverity: 5,
      requireApprovalAbove: 3
    };
    
    for (const [key, value] of Object.entries(this.defaults)) {
      this.flags.set(key, value);
    }
  }

  isEnabled(key) {
    return this.flags.get(key) ?? false;
  }

  set(key, value) {
    this.flags.set(key, Boolean(value));
    return this.isEnabled(key);
  }

  reset(key) {
    if (key in this.defaults) {
      this.flags.set(key, this.defaults[key]);
    }
    return this.isEnabled(key);
  }

  getAll() {
    return Object.fromEntries(this.flags);
  }

  getConfig() {
    return {
      enableAutoFix: this.isEnabled('enableAutoFix'),
      enableQueueDrain: this.isEnabled('enableQueueDrain'),
      enableSelfHealing: this.isEnabled('enableSelfHealing'),
      enableMLClassification: this.isEnabled('enableMLClassification'),
      enableRunbooks: this.isEnabled('enableRunbooks'),
      enablePostmortem: this.isEnabled('enablePostmortem'),
      maxAutoFixSeverity: this.flags.get('maxAutoFixSeverity'),
      requireApprovalAbove: this.flags.get('requireApprovalAbove')
    };
  }
}

module.exports = { FeatureFlags };
