const fs = require('fs');
const path = require('path');

class BackupIntegrityVerifier {
  constructor(backupDir = path.join(__dirname, '..', '.backups')) {
    this.backupDir = backupDir;
  }

  verify(fileName) {
    const filePath = path.join(this.backupDir, fileName);
    if (!fs.existsSync(filePath)) {
      return { file: fileName, valid: false, error: 'missing' };
    }

    try {
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        return { file: fileName, valid: false, error: 'empty' };
      }

      let content;
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch {
        return { file: fileName, valid: false, error: 'unreadable' };
      }

      try {
        JSON.parse(content);
      } catch {
        return { file: fileName, valid: false, error: 'invalid_json' };
      }

      return {
        file: fileName,
        valid: true,
        size: stats.size,
        mtime: stats.mtime.toISOString()
      };
    } catch (err) {
      return { file: fileName, valid: false, error: err.message };
    }
  }

  verifyAll() {
    if (!fs.existsSync(this.backupDir)) return [];
    return fs.readdirSync(this.backupDir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(f => this.verify(f));
  }

  getSummary() {
    const results = this.verifyAll();
    const valid = results.filter(r => r.valid).length;
    const invalid = results.filter(r => !r.valid);
    return {
      total: results.length,
      valid,
      invalid: invalid.length,
      failures: invalid.slice(0, 10)
    };
  }
}

module.exports = { BackupIntegrityVerifier };
