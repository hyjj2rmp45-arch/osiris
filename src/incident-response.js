class IncidentResponseAutomation {
  constructor() {
    this.incidents = [];
    this.maxIncidents = 1000;
  }

  create(error, fix, runbook) {
    const incident = {
      id: 'inc-' + Date.now(),
      errorId: error.id,
      severity: error.severity,
      message: error.message,
      source: error.source,
      correlationId: error.correlationId,
      fix: fix ? fix.description : null,
      runbook: runbook ? runbook.name : null,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.incidents.push(incident);
    if (this.incidents.length > this.maxIncidents) this.incidents.shift();
    return incident;
  }

  updateStatus(id, status) {
    const incident = this.incidents.find(i => i.id === id);
    if (!incident) return null;
    incident.status = status;
    incident.updatedAt = new Date().toISOString();
    return incident;
  }

  getOpen() {
    return this.incidents.filter(i => i.status === 'open');
  }

  getRecent(limit = 20) {
    return this.incidents.slice(-limit);
  }

  getStats() {
    const open = this.incidents.filter(i => i.status === 'open').length;
    const resolved = this.incidents.filter(i => i.status === 'resolved').length;
    return { total: this.incidents.length, open, resolved };
  }
}

module.exports = { IncidentResponseAutomation };
