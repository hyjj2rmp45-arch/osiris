const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DisasterRecoveryBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '..', '.backups');
    this.maxBackups = 30;
    this.lastBackup = 0;
    this.backupIntervalMs = 24 * 60 * 60 * 1000; // 24 hours
  }

  ensureDir() {
    if (!fs.existsSync(this.backupDir)) fs.mkdirSync(this.backupDir, { recursive: true });
  }

  createBackup(label) {
    this.ensureDir();
    const timestamp = Date.now();
    const safeLabel = (label || 'snapshot').replace(/[^a-z0-9_-]/gi, '_');
    const backupPath = path.join(this.backupDir, `backup_${safeLabel}_${timestamp}.json`);
    const payload = {
      timestamp,
      label: safeLabel,
      auditLog: [],
      errorBuffer: [],
      config: {
        featureFlags: featureFlags ? featureFlags.getConfig() : null,
        compliance: complianceEngine ? complianceEngine.getStatus() : null
      }
    };
    try {
      fs.writeFileSync(backupPath, JSON.stringify(payload, null, 2));
      this.prune();
      this.lastBackup = timestamp;
      return { success: true, path: backupPath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  prune() {
    if (!fs.existsSync(this.backupDir)) return;
    const files = fs.readdirSync(this.backupDir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .sort()
      .reverse();
    for (const stale of files.slice(this.maxBackups)) {
      try { fs.unlinkSync(path.join(this.backupDir, stale)); } catch {}
    }
  }

  listBackups() {
    if (!fs.existsSync(this.backupDir)) return [];
    return fs.readdirSync(this.backupDir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .sort()
      .slice(-this.maxBackups);
  }

  shouldBackup() {
    return Date.now() - this.lastBackup > this.backupIntervalMs;
  }
}

module.exports = { DisasterRecoveryBackup };
