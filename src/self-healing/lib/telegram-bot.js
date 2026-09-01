/**
 * Telegram Bot Integration (Dedicated Security Bot)
 * 
 * Phase 1: Safety Foundation
 * 
 * This is a SEPARATE bot from the main trading bot.
 * Its sole purpose is:
 * 1. Send security alerts to you immediately
 * 2. Accept manual commands for emergency control
 * 3. Provide status reporting and rollback capabilities
 * 
 * Security properties:
 * - Read-only access to self-healing system
 * - Only authorized chat ID can send commands
 * - No access to trading functions
 * - Separate token from main trading bot
 */

'use strict';

const https = require('https');
const { safeReadJSON, atomicWriteJSON } = require('./state-persistence');

// ═══════════════════════════════════════════════════════════════
// TELEGRAM CLIENT
// ═══════════════════════════════════════════════════════════════

/**
 * Minimal Telegram Bot API client.
 * Uses webhook or polling mode.
 */
class TelegramClient {
  constructor(options = {}) {
    this.botToken = options.botToken;
    this.chatId = options.chatId;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.webhookUrl = options.webhookUrl || null;
    this.lastUpdateId = 0;
    
    if (!this.botToken) {
      throw new Error('Telegram bot token is required');
    }
  }
  
  /**
   * Send a message to the configured chat.
   */
  async sendMessage(text, options = {}) {
    const payload = {
      chat_id: options.chatId || this.chatId,
      text: text,
      parse_mode: options.parseMode || 'HTML',
      disable_notification: options.disableNotification || false
    };
    
    if (options.replyToMessageId) {
      payload.reply_to_message_id = options.replyToMessageId;
    }
    
    return this._apiRequest('sendMessage', payload);
  }
  
  /**
   * Send an alert message (urgent, always notifies).
   */
  async sendAlert(text, options = {}) {
    return this.sendMessage(`🚨 ${text}`, {
      ...options,
      disableNotification: false,
      parseMode: 'HTML'
    });
  }
  
  /**
   * Send a notification message (non-urgent).
   */
  async sendNotification(text, options = {}) {
    return this.sendMessage(text, {
      ...options,
      disableNotification: true,
      parseMode: 'HTML'
    });
  }
  
  /**
   * Send a media message (photo, document).
   */
  async sendMedia(mediaType, media, caption = '', options = {}) {
    const payload = {
      chat_id: options.chatId || this.chatId,
      [mediaType]: media,
      caption: caption,
      parse_mode: 'HTML'
    };
    
    const methodName = mediaType === 'photo' ? 'sendPhoto' : 'sendDocument';
    return this._apiRequest(methodName, payload);
  }
  
  /**
   * Set webhook for receiving updates.
   */
  async setWebhook(webhookUrl) {
    this.webhookUrl = webhookUrl;
    return this._apiRequest('setWebhook', { url: webhookUrl });
  }
  
  /**
   * Get updates via long polling (for local dev/testing).
   */
  async getUpdates(limit = 100, timeout = 0) {
    const params = {
      offset: this.lastUpdateId + 1,
      limit: limit,
      timeout: timeout
    };
    
    const result = await this._apiRequest('getUpdates', params);
    
    if (result.ok && result.result.length > 0) {
      this.lastUpdateId = result.result[result.result.length - 1].update_id;
    }
    
    return result;
  }
  
  /**
   * Process incoming commands.
   */
  async processCommand(command, args, message) {
    const handlers = {
      '/status': () => this._handleStatus(message),
      '/stop': () => this._handleEmergencyStop(message),
      '/resume': () => this._handleResume(message),
      '/history': () => this._handleHistory(message),
      '/rollback': () => this._handleRollback(message),
      '/help': () => this._handleHelp(message),
      '/health': () => this._handleHealth(message)
    };
    
    const handler = handlers[command];
    if (handler) {
      return await handler(args, message);
    }
    
    return this.sendMessage(`❓ Unknown command: ${command}\nUse /help for available commands.`);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // COMMAND HANDLERS
  // ═══════════════════════════════════════════════════════════════

  async _handleStatus(args, message) {
    // Import here to avoid circular dependencies
    const { getHealthStatus } = require('./health-monitor');
    const { EmergencyStopManager } = require('./emergency-stop');
    
    const emergencyState = new EmergencyStopManager();
    const health = getHealthStatus();
    
    let statusText = `🔍 <b>OSIRIS Self-Healing Status</b>\n\n`;
    statusText += `Mode: ${health.mode}\n`;
    statusText += `Auto-Fix: ${health.autoFixEnabled ? '✅ ENABLED' : '❌ DISABLED'}\n`;
    statusText += `Emergency Stop: ${emergencyState.isEmergencyStopped() ? '🚨 ACTIVE' : '✅ CLEAR'}\n`;
    statusText += `Fixes Applied (24h): ${health.fixesApplied24h}\n`;
    statusText += `Fixes Queued: ${health.pendingApprovals}\n`;
    statusText += `Circuit Breakers:\n`;
    
    for (const [name, status] of Object.entries(health.circuits)) {
      const icon = status.isOpen ? '🔴' : '🟢';
      statusText += `  ${icon} ${name}: ${status.state}\n`;
    }
    
    return this.sendMessage(statusText);
  }
  
  async _handleEmergencyStop(args, message) {
    const { EmergencyStopManager } = require('./emergency-stop');
    const { AuditTrail } = require('./audit-trail');
    
    const audit = new AuditTrail();
    const emergency = new EmergencyStopManager();
    
    // Create kill switch file
    const reason = args && args.length > 0 ? args.join(' ') : 'manual_activation_by_telegram';
    
    emergency.engageKillSwitch(reason);
    
    audit.record('kill_switch_engaged', {
      source: 'telegram_command',
      chat_id: message?.chat?.id || 'unknown',
      reason: reason
    });
    
    return this.sendAlert(`🚨 Emergency Stop ENGAGED by you via Telegram\nReason: ${reason}`);
  }
  
  async _handleResume(args, message) {
    const { EmergencyStopManager } = require('./emergency-stop');
    const { AuditTrail } = require('./audit-trail');
    
    const audit = new AuditTrail();
    const emergency = new EmergencyStopManager();
    
    emergency.disengageKillSwitch('manual_deactivation_by_telegram');
    emergency.resetEmergency();
    
    audit.record('kill_switch_disengaged', {
      source: 'telegram_command',
      chat_id: message?.chat?.id || 'unknown'
    });
    
    return this.sendNotification(`✅ Emergency Stop CLEARED\nAuto-fix system is now active.`);
  }
  
  async _handleHistory(args, message) {
    const count = args && args[0] ? parseInt(args[0]) : 10;
    const { AuditTrail } = require('./audit-trail');
    
    const audit = new AuditTrail();
    const recent = audit.getRecent(count);
    
    if (recent.length === 0) {
      return this.sendMessage(`📜 No recent activity in audit log.`);
    }
    
    let historyText = `📜 <b>Recent Activity (last ${count} events)</b>\n\n`;
    
    for (const entry of recent.reverse()) {
      const time = new Date(entry.ts).toLocaleString('en-US', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      historyText += `<code>${time}</code> ${entry.event}\n`;
    }
    
    return this.sendMessage(historyText);
  }
  
  async _handleRollback(args, message) {
    const { RollbackCoordinator } = require('./rollback');
    
    const coordinator = new RollbackCoordinator();
    const history = coordinator.getHistory();
    
    if (history.length === 0) {
      return this.sendMessage(`🔄 No rollback history available.`);
    }
    
    const last = history[history.length - 1];
    let rollbackText = `🔄 <b>Last Rollback</b>\n\n`;
    rollbackText += `Time: ${new Date(last.executedAt).toLocaleString()}\n`;
    rollbackText += `Reason: ${last.reason}\n`;
    rollbackText += `Success: ${last.success ? '✅ YES' : '❌ NO'}\n`;
    
    if (last.requiresManual) {
      rollbackText += `\n⚠️ <b>MANUAL INTERVENTION REQUIRED</b>`;
    }
    
    return this.sendMessage(rollbackText);
  }
  
  async _handleHelp(args, message) {
    const helpText = `🔧 <b>OSIRIS Security Bot Commands</b>\n\n` +
      `/status - Show current system status\n` +
      `/history [N] - Show last N audit events\n` +
      `/rollback - Show last rollback info\n` +
      `/health - Detailed health check\n\n` +
      `🚨 <b>EMERGENCY</b>\n` +
      `/stop [reason] - Engage kill switch\n` +
      `/resume - Clear kill switch\n\n` +
      `📝 <b>INFO</b>\n` +
      `/help - Show this help message`;
      
    return this.sendMessage(helpText);
  }
  
  async _handleHealth(args, message) {
    const { getHealthStatus } = require('./health-monitor');
    const health = getHealthStatus();
    
    let healthText = `🏥 <b>Health Check</b>\n\n`;
    healthText += `Uptime: ${this._formatUptime(health.uptime)}\n`;
    healthText += `Error Count: ${health.errorCount}\n`;
    healthText += `Security: ${health.securityStatus}\n`;
    healthText += `Kill Switch: ${health.killSwitchEnabled ? 'ACTIVE' : 'Clear'}\n`;
    
    const integrity = health.integrityCheck;
    if (integrity) {
      healthText += `Integrity: ${integrity.allVerified ? '✅ PASS' : '❌ FAIL'}\n`;
      if (!integrity.allVerified) {
        healthText += `Modified files: ${integrity.modifiedFiles?.join(', ') || 'unknown'}\n`;
      }
    }
    
    return this.sendMessage(healthText);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  _formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  }
  
  async _apiRequest(method, payload) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(payload);
      
      const options = {
        hostname: 'api.telegram.org',
        path: `/bot${this.botToken}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 10000
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ ok: false, error: 'Parse error' });
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Telegram API timeout'));
      });
      
      req.write(postData);
      req.end();
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON INITIALIZATION
// ═══════════════════════════════════════════════════════════════

let telegramClient = null;
let authorizedChatIds = new Set();

/**
 * Initialize Telegram client with secure credentials.
 */
function initialize(botToken, chatId) {
  if (!botToken) {
    console.error('[Telegram] Bot token not provided - notifications disabled');
    return null;
  }
  
  try {
    telegramClient = new TelegramClient({
      botToken: botToken,
      chatId: chatId
    });
    
    // Load authorized chat IDs from secure storage
    const authFile = '/app/data/telegram-authorized-chats.json';
    const authData = safeReadJSON(authFile, { chats: [chatId], schemaVersion: 1 }, 1);
    authorizedChatIds = new Set(authData.chats || [chatId]);
    
    return telegramClient;
  } catch (err) {
    console.error('[Telegram] Failed to initialize:', err.message);
    return null;
  }
}

/**
 * Check if a chat ID is authorized to send commands.
 */
function isAuthorized(chatId) {
  return authorizedChatIds.has(chatId);
}

/**
 * Get the initialized Telegram client.
 */
function getClient() {
  return telegramClient;
}

/**
 * Send security alert via Telegram.
 */
async function alert(message, options = {}) {
  if (!telegramClient) {
    console.warn('[Telegram] Client not initialized - alert dropped');
    return;
  }
  
  return telegramClient.sendAlert(message, options);
}

/**
 * Send non-critical notification via Telegram.
 */
async function notify(message, options = {}) {
  if (!telegramClient) {
    console.warn('[Telegram] Client not initialized - notification dropped');
    return;
  }
  
  return telegramClient.sendNotification(message, options);
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  TelegramClient,
  initialize,
  isAuthorized,
  getClient,
  alert,
  notify
};
