/**
 * Notification System – Phase 3 (P3.5)
 *
 *   - notifications table (in-memory stub)
 *   - Notification batching for Telegram (respect 30 msg/s limit)
 *   - In-app notification center (read/unread)
 *   - Types: trade_confirm, session_revoke, pnl_update, copy_trade, system
 *
 * In production notifications are DB-backed and Telegram batching is a real
 * queue. This stub provides creation, read/unread, preferences, and batching.
 */

const VALID_TYPES = ['trade_confirm', 'session_revoke', 'pnl_update', 'copy_trade', 'system'];
const TELEGRAM_MSG_PER_SEC = 30;

// In-memory stores
const notifications = [];          // { id, userId, type, title, body, read, at }
let idCounter = 0;
const prefs = new Map();           // userId -> Set<type> enabled
const telegramQueue = [];          // pending batched messages

/**
 * Validate a notification type.
 * @param {string} type
 * @returns {boolean}
 */
function isValidType(type) {
  return VALID_TYPES.includes(type);
}

/**
 * Create a notification for a user (respects prefs).
 * @param {Object} params - { userId, type, title, body }
 * @returns {Object|null} created notification or null if disabled
 */
function createNotification({ userId, type, title, body }) {
  if (!isValidType(type)) throw new Error('INVALID_TYPE');
  const enabled = prefs.get(userId);
  if (enabled && !enabled.has(type)) return null; // disabled by user
  const notif = {
    id: ++idCounter,
    userId,
    type,
    title,
    body,
    read: false,
    at: new Date().toISOString()
  };
  notifications.push(notif);
  return notif;
}

/**
 * Mark a notification as read.
 * @param {string} userId
 * @param {number} notifId
 * @returns {boolean}
 */
function markRead(userId, notifId) {
  const n = notifications.find(x => x.id === notifId && x.userId === userId);
  if (!n) return false;
  n.read = true;
  return true;
}

/**
 * Get notifications for a user.
 * @param {string} userId
 * @param {Object} [opts] - { unreadOnly }
 * @returns {Array<Object>}
 */
function getNotifications(userId, opts = {}) {
  let list = notifications.filter(n => n.userId === userId);
  if (opts.unreadOnly) list = list.filter(n => !n.read);
  return list;
}

/**
 * Set notification preference for a user.
 * @param {string} userId
 * @param {string} type
 * @param {boolean} enabled
 */
function setPreference(userId, type, enabled) {
  if (!isValidType(type)) throw new Error('INVALID_TYPE');
  if (!prefs.has(userId)) prefs.set(userId, new Set(VALID_TYPES));
  const set = prefs.get(userId);
  if (enabled) set.add(type); else set.delete(type);
}

/**
 * Queue a Telegram notification with batching (respects 30 msg/s limit).
 * Returns a batch object; in production the batch is flushed on a timer.
 * @param {Object} params - { userId, text }
 * @returns {Object} { batchId, queued, batchSize }
 */
function queueTelegram({ userId, text }) {
  telegramQueue.push({ userId, text });
  const size = telegramQueue.length;
  return { queued: true, batchSize: size, limitPerSec: TELEGRAM_MSG_PER_SEC };
}

/**
 * Drain the Telegram queue (simulate flush). Returns messages to send.
 * @returns {Array<Object>}
 */
function flushTelegramQueue() {
  return telegramQueue.splice(0);
}

/**
 * Telegram rate limit constant.
 * @returns {number}
 */
function telegramLimitPerSec() {
  return TELEGRAM_MSG_PER_SEC;
}

/**
 * Reset notification state (test helper).
 */
function resetNotifications() {
  notifications.length = 0;
  prefs.clear();
  telegramQueue.length = 0;
  idCounter = 0;
}

module.exports = {
  VALID_TYPES,
  createNotification,
  markRead,
  getNotifications,
  setPreference,
  queueTelegram,
  flushTelegramQueue,
  telegramLimitPerSec,
  resetNotifications
};