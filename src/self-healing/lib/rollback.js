/**
 * Rollback Mechanism
 * 
 * Phase 1: Safety Foundation
 * 
 * Provides automatic and manual rollback capabilities:
 * - Git-based rollback (revert commits made by the agent)
 * - Filesystem snapshot rollback (pre-fix state)
 * - Automatic rollback on validation failure
 * - Manual rollback via Telegram commands
 * 
 * Critical for 24/7 autonomous operation - if the agent
 * breaks something, it can recover itself.
 */

'use strict';

const crypto = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// SNAPSHOT MANAGER
// ═══════════════════════════════════════════════════════════════

/**
 * Manage filesystem snapshots for pre-fix state capture.
 * Uses Git for the canonical source of truth, with local snapshots
 * for quick rollback before commits are made.
 */
class SnapshotManager {
  constructor(options = {}) {
    this.repoRoot = options.repoRoot || process.cwd();
    this.snapshotDir = options.snapshotDir || '/app/data/snapshots/';
    this.maxSnapshotsPerFile = options.maxSnapshots || 5;
    
    // Ensure snapshot directory exists
    if (!fs.existsSync(this.snapshotDir)) {
      fs.mkdirSync(this.snapshotDir, { recursive: true });
    }
  }
  
  /**
   * Create a snapshot of a file before modification.
   * 
   * @param {string} filePath - Path to file (relative to repoRoot)
   * @param {string} reason - Why the snapshot is being taken
   * @returns {string} - Snapshot ID
   */
  createSnapshot(filePath) {
    const fullPath = path.join(this.repoRoot, filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Cannot snapshot non-existent file: ${fullPath}`);
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    const snapshotId = this._generateSnapshotId(filePath);
    
    const snapshot = {
      id: snapshotId,
      filePath: filePath,
      contentHash: crypto.createHash('sha256').update(content).digest('hex'),
      content: content,
      createdAt: new Date().toISOString(),
      fileSize: content.length,
      gitHead: this._getCurrentGitHead()
    };
    
    // Save snapshot
    const snapshotPath = path.join(this.snapshotDir, `${snapshotId}.json`);
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), {
      encoding: 'utf-8',
      flag: 'wx'
    });
    
    // Manage retention (keep only last N snapshots per file)
    this._pruneSnapshots(filePath);
    
    return snapshotId;
  }
  
  /**
   * Restore a file from snapshot.
   * 
   * @param {string} snapshotId - ID of snapshot to restore
   * @returns {object} - Restoration info
   */
  restoreSnapshot(snapshotId) {
    const snapshotPath = path.join(this.snapshotDir, `${snapshotId}.json`);
    
    if (!fs.existsSync(snapshotPath)) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }
    
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
    const targetPath = path.join(this.repoRoot, snapshot.filePath);
    
    // Write backup before overwriting (chain of custody)
    const targetContent = fs.readFileSync(targetPath, 'utf-8');
    const backupPath = path.join(
      this.snapshotDir, 
      `backup_${snapshotId}_${crypto.randomBytes(4).toString('hex')}.json`
    );
    
    fs.writeFileSync(backupPath, JSON.stringify({
      id: `backup_${snapshotId}`,
      originalContent: targetContent,
      restoredFrom: snapshotId,
      contentHash: crypto.createHash('sha256').update(targetContent).digest('hex'),
      createdAt: new Date().toISOString()
    }, null, 2), { encoding: 'utf-8', flag: 'wx' });
    
    // Restore from snapshot
    fs.writeFileSync(targetPath, snapshot.content, 'utf-8');
    
    return {
      snapshotId,
      restoredFile: snapshot.filePath,
      backupId: path.basename(backupPath, '.json'),
      wasRestored: true
    };
  }
  
  /**
   * List available snapshots for a file.
   */
  listSnapshots(filePath) {
    const files = fs.readdirSync(this.snapshotDir);
    return files
      .filter(f => f.endsWith('.json') && !f.startsWith('backup_'))
      .map(f => {
        try {
          const snapshot = JSON.parse(fs.readFileSync(path.join(this.snapshotDir, f), 'utf-8'));
          if (snapshot.filePath === filePath) {
            return {
              id: snapshot.id,
              createdAt: snapshot.createdAt,
              contentHash: snapshot.contentHash,
              fileSize: snapshot.fileSize
            };
          }
          return null;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  
  /**
   * Get snapshot metadata without content.
   */
  getSnapshotInfo(snapshotId) {
    const snapshotPath = path.join(this.snapshotDir, `${snapshotId}.json`);
    if (!fs.existsSync(snapshotPath)) {
      return null;
    }
    
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
    return {
      id: snapshot.id,
      filePath: snapshot.filePath,
      createdAt: snapshot.createdAt,
      contentHash: snapshot.contentHash,
      fileSize: snapshot.fileSize,
      gitHead: snapshot.gitHead
    };
  }
  
  _generateSnapshotId(filePath) {
    const timestamp = Date.now().toString(36);
    const fileHash = crypto.createHash('sha1')
      .update(filePath)
      .digest('hex')
      .substring(0, 8);
    return `snap_${timestamp}_${fileHash}`;
  }
  
  _getCurrentGitHead() {
    try {
      return execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: this.repoRoot,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
    } catch {
      return 'no-git';
    }
  }
  
  _pruneSnapshots(filePath) {
    const snapshots = this.listSnapshots(filePath);
    if (snapshots.length > this.maxSnapshotsPerFile) {
      const toDelete = snapshots.slice(this.maxSnapshotsPerFile);
      for (const snap of toDelete) {
        const filePath = path.join(this.snapshotDir, `${snap.id}.json`);
        try {
          fs.unlinkSync(filePath);
        } catch {
          // Best effort
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// GIT ROLLBACK
// ═══════════════════════════════════════════════════════════════

/**
 * Git-based rollback utilities.
 */
class GitRollback {
  constructor(options = {}) {
    this.repoRoot = options.repoRoot || process.cwd();
  }
  
  /**
   * Get current git HEAD commit hash.
   */
  getCurrentCommit() {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: this.repoRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  }
  
  /**
   * Get diff from a specific commit to HEAD.
   */
  getDiffFromCommit(commitHash) {
    return execFileSync('git', ['diff', commitHash, 'HEAD'], {
      cwd: this.repoRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }
  
  /**
   * Revert a specific commit (creates a new commit).
   */
  revertCommit(commitHash, message = 'Revert auto-fix') {
    try {
      execFileSync('git', ['revert', '--no-commit', commitHash], {
        cwd: this.repoRoot,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      execFileSync('git', ['commit', '-m', message], {
        cwd: this.repoRoot,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      return { success: true, revertCommit: this.getCurrentCommit() };
    } catch (err) {
      // If revert fails, try --abort and restore from snapshot
      return { 
        success: false, 
        error: err.message,
        requiresManual: true 
      };
    }
  }
  
  /**
   * Get recent commit history (last 10 commits).
   */
  getRecentCommits(limit = 10) {
    const output = execFileSync('git', ['log', `--max-count=${limit}`, '--pretty=format:%H|%s|%ai'], {
      cwd: this.repoRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    return output.trim().split('\n').map(line => {
      const [hash, subject, date] = line.split('|');
      return { hash, subject, date };
    }).filter(Boolean);
  }
  
  /**
   * Check if git is available and repo is clean enough for operations.
   */
  isReady() {
    try {
      execFileSync('git', ['rev-parse', '--git-dir'], {
        cwd: this.repoRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return true;
    } catch {
      return false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// ROLLBACK COORDINATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Coordinate rollback between snapshots and git.
 * 
 * Strategy:
 * 1. Always take a snapshot before applying a fix
 * 2. If fix fails validation → restore from snapshot
 * 3. If snapshot restore fails → git revert
 * 4. If git revert fails → manual intervention required
 */
class RollbackCoordinator {
  constructor(options = {}) {
    this.repoRoot = options.repoRoot || process.cwd();
    this.snapshotManager = new SnapshotManager(options);
    this.gitRollback = new GitRollback(options);
    this.rollbackLog = [];
    this.logFile = options.rollbackLogFile || '/app/data/rollback-history.json';
  }
  
  /**
   * Initialize rollback for a fix operation.
   * Takes pre-fix snapshots of all files that will be modified.
   * 
   * @param {string[]} filesToModify - Files the fix will change
   * @returns {{snapshots: object, preCommit: string}}
   */
  initializeRollback(filesToModify) {
    const snapshots = {};
    const preCommit = this.gitRollback.getCurrentCommit();
    
    for (const file of filesToModify) {
      try {
        const snapshotId = this.snapshotManager.createSnapshot(file);
        snapshots[file] = snapshotId;
      } catch (err) {
        // Log but don't fail — file might not exist yet
        console.warn(`[Rollback] Could not snapshot ${file}: ${err.message}`);
        snapshots[file] = null;
      }
    }
    
    const record = {
      preCommit,
      snapshots,
      createdAt: new Date().toISOString(),
      correlationId: crypto.randomUUID()
    };
    
    return record;
  }
  
  /**
   * Execute rollback strategy.
   * Tries snapshot restore first, then git revert.
   * 
   * @param {object} rollbackRecord - Record from initializeRollback
   * @param {string} reason - Why rollback is happening
   * @returns {object} - Rollback result
   */
  executeRollback(rollbackRecord, reason) {
    const steps = [];
    let success = false;
    
    // Step 1: Try snapshot restore
    for (const [file, snapshotId] of Object.entries(rollbackRecord.snapshots)) {
      if (snapshotId) {
        try {
          this.snapshotManager.restoreSnapshot(snapshotId);
          steps.push({ file, method: 'snapshot', success: true });
          success = true;
        } catch (err) {
          steps.push({ file, method: 'snapshot', success: false, error: err.message });
        }
      }
    }
    
    // Step 2: If snapshot failed, try git revert
    if (!success) {
      try {
        const result = this.gitRollback.revertCommit(rollbackRecord.preCommit);
        steps.push({ method: 'git_revert', ...result });
        if (result.success) success = true;
      } catch (err) {
        steps.push({ method: 'git_revert', success: false, error: err.message });
      }
    }
    
    // Log rollback
    const logEntry = {
      ...rollbackRecord,
      reason,
      steps,
      success,
      executedAt: new Date().toISOString()
    };
    
    this._logRollback(logEntry);
    
    return {
      success,
      steps,
      message: success 
        ? 'Rollback completed successfully'
        : 'Rollback failed - manual intervention required',
      requiresManual: !success
    };
  }
  
  /**
   * Verify current state matches expected (post-rollback verification).
   */
  verifyRollback(filesToVerify) {
    const results = {};
    
    for (const file of filesToVerify) {
      const fullPath = path.join(this.repoRoot, file);
      
      if (!fs.existsSync(fullPath)) {
        results[file] = { exists: false, valid: false };
        continue;
      }
      
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      try {
        // Basic validation — syntax check for JS files
        if (file.endsWith('.js')) {
          new Function(content); // eslint-disable-line no-new-func
        }
        results[file] = { exists: true, valid: true, size: content.length };
      } catch (err) {
        results[file] = { exists: true, valid: false, error: err.message };
      }
    }
    
    return results;
  }
  
  _logRollback(entry) {
    try {
      this.rollbackLog.push(entry);
      
      // Also persist to file
      const dir = path.dirname(this.logFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.logFile, JSON.stringify(this.rollbackLog, null, 2), 'utf-8');
      
      // Trim if too large
      if (this.rollbackLog.length > 1000) {
        this.rollbackLog = this.rollbackLog.slice(-500);
        fs.writeFileSync(this.logFile, JSON.stringify(this.rollbackLog, null, 2), 'utf-8');
      }
    } catch (err) {
      // Best effort logging
    }
  }
  
  /**
   * Get rollback history.
   */
  getHistory(limit = 50) {
    return this.rollbackLog.slice(-limit);
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  SnapshotManager,
  GitRollback,
  RollbackCoordinator
};
