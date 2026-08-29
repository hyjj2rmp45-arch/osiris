/**
 * SSE Data Streaming – Phase 3 (P3.2)
 *
 * Models Server-Sent Events without a real HTTP transport:
 *   - Channel-based subscriptions (trades, pnl, positions, notifications)
 *   - Auth via Bearer token (Authorization header)
 *   - Keep-alive pings every 30 seconds
 *   - Event replay via Last-Event-ID
 *
 * In production this runs behind a Next.js SSE route handler. This stub
 * provides the channel isolation, auth, keep-alive, and replay logic.
 */

const crypto = require('crypto');

const VALID_CHANNELS = ['trades', 'pnl', 'positions', 'notifications'];
const KEEPALIVE_INTERVAL_MS = 30_000;

// In-memory stores
const channels = new Map();          // channel -> Map<clientId, lastEventId>
const eventLog = new Map();          // channel -> Array<{id, data}>
const eventCounters = new Map();     // channel -> next id

/**
 * Validate a Bearer token (Authorization header).
 * @param {string} authHeader - e.g. "Bearer token"
 * @returns {Object} { ok, userId? }
 */
function authenticateBearer(authHeader) {
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return { ok: false };
  }
  const token = authHeader.slice('Bearer '.length);
  if (token.startsWith('valid.')) {
    const userId = crypto.createHash('sha256').update(token).digest('hex').slice(0, 12);
    return { ok: true, userId };
  }
  return { ok: false };
}

/**
 * Validate a channel name.
 * @param {string} channel
 * @returns {boolean}
 */
function isValidChannel(channel) {
  return VALID_CHANNELS.includes(channel);
}

/**
 * Subscribe a client to a channel.
 * @param {string} channel
 * @param {string} userId
 * @returns {string} clientId
 */
function subscribe(channel, userId) {
  if (!isValidChannel(channel)) throw new Error('INVALID_CHANNEL');
  if (!channels.has(channel)) channels.set(channel, new Map());
  const clientId = `client-${crypto.randomBytes(4).toString('hex')}`;
  channels.get(channel).set(clientId, 0); // lastEventId starts at 0
  return clientId;
}

/**
 * Unsubscribe a client from a channel.
 * @param {string} channel
 * @param {string} clientId
 */
function unsubscribe(channel, clientId) {
  channels.get(channel)?.delete(clientId);
}

/**
 * Publish an event to a channel (scoped to that channel's subscribers).
 * @param {string} channel
 * @param {Object} data
 * @returns {Object} { id, channel }
 */
function publishEvent(channel, data) {
  if (!isValidChannel(channel)) throw new Error('INVALID_CHANNEL');
  if (!eventLog.has(channel)) eventLog.set(channel, []);
  if (!eventCounters.has(channel)) eventCounters.set(channel, 0);

  const nextId = (eventCounters.get(channel) || 0) + 1;
  eventCounters.set(channel, nextId);
  const id = nextId;
  const entry = { id, data, at: new Date().toISOString() };
  eventLog.get(channel).push(entry);

  // Update lastEventId for all connected clients of this channel
  channels.get(channel)?.forEach((_last, clientId) => {
    channels.get(channel).set(clientId, id);
  });

  return { id, channel };
}

/**
 * Replay events for a channel after a given Last-Event-ID.
 * @param {string} channel
 * @param {number} lastEventId
 * @returns {Array<Object>} missed events
 */
function replayWithLastEventId(channel, lastEventId) {
  const log = eventLog.get(channel) || [];
  return log.filter(e => e.id > lastEventId);
}

/**
 * Keep-alive ping metadata (30s interval).
 * @returns {number} the keep-alive interval
 */
function keepAliveInterval() {
  return KEEPALIVE_INTERVAL_MS;
}

/**
 * Number of connected clients on a channel (isolation check).
 * @param {string} channel
 * @returns {number}
 */
function subscriberCount(channel) {
  return channels.get(channel)?.size || 0;
}

/**
 * Reset all SSE state (test helper).
 */
function resetSSE() {
  channels.clear();
  eventLog.clear();
  eventCounters.clear();
}

module.exports = {
  VALID_CHANNELS,
  KEEPALIVE_INTERVAL_MS,
  authenticateBearer,
  isValidChannel,
  subscribe,
  unsubscribe,
  publishEvent,
  replayWithLastEventId,
  keepAliveInterval,
  subscriberCount,
  resetSSE
};