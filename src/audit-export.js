class AuditExporter {
  constructor() {
    this.exports = [];
    this.maxExports = 1000;
  }

  async exportJSON(auditLog, limit = 1000) {
    const entries = auditLog.slice(-limit);
    const exportEntry = {
      id: 'export-' + Date.now(),
      format: 'json',
      timestamp: new Date().toISOString(),
      count: entries.length,
      data: entries
    };
    this.exports.push(exportEntry);
    if (this.exports.length > this.maxExports) this.exports.shift();
    return exportEntry;
  }

  async exportCSV(auditLog, limit = 1000) {
    const entries = auditLog.slice(-limit);
    const headers = 'timestamp,action,errorId,pattern,severity,source,details';
    const rows = entries.map(e => [
      e.timestamp || '',
      e.action || '',
      e.errorId || '',
      e.pattern || '',
      e.severity || '',
      e.source || '',
      (e.details || '').replace(/"/g, '""')
    ].map(v => '"' + v + '"').join(','));
    
    const csv = [headers, ...rows].join('\n');
    const exportEntry = {
      id: 'export-' + Date.now(),
      format: 'csv',
      timestamp: new Date().toISOString(),
      count: entries.length,
      data: csv
    };
    this.exports.push(exportEntry);
    return exportEntry;
  }

  getRecentExports(limit = 10) {
    return this.exports.slice(-limit);
  }
}

module.exports = { AuditExporter };
