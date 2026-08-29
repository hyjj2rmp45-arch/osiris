/**
 * Event Bus / Broadcast System – Phase 3 (P3.3)
 *
 * Internal event bus with Redis pub/sub for multi-instance broadcast.
 * Event types: trade.update, pnl.update, position.update, session.revoked,
 * notification, system.
 *
 * In production the publish/subscribe layer is backed by Redis pub/sub so
 * multiple PM2 workers share the bus. This stub provides an in-process bus
 * with an optional channel-routing hook (for SSE).
 */

const VALID_EVENT_TYPES = [
  'trade.update',
  'pnl.update',
  'position.update',
  'session.revoked',
  'notification',
  'system'
];

// In-process subscriber registry: type -> Set<callback>
const subscribers = new Map();
// Event history (for routing/replay): Array of { type, payload, at }
const history = [];

/**
 * Validate an event type.
 * @param {string} type
 * @returns {boolean}
 */
function isValidType(type) {
  return VALID_EVENT_TYPES.includes(type);
}

/**
 * Subscribe to an event type.
 * @param {string} type
 * @param {Function} callback - (payload, eventContext) => void
 * @returns {Function} unsubscribe function
 */
function subscribe(type, callback) {
  if (!isValidType(type)) throw new Error('INVALID_EVENT_TYPE');
  if (!subscribers.has(type)) subscribers.set(type, new Set());
  subscribers.get(type).add(callback);
  return () => subscribers.get(type).delete(callback);
}

/**
 * Publish an event to all subscribers of its type.
 * Also records to history and (in production) publishes to Redis pub/sub.
 * @param {string} type
 * @param {Object} payload
 * @param {Object} [routing] - optional SSE channel routing hint
 * @returns {Object} event descriptor
 */
function publish(type, payload, routing = {}) {
  if (!isValidType(type)) throw new Error('INVALID_EVENT_TYPE');
  const event = { type, payload, routing, at: new Date().toISOString() };
  history.push(event);

  const callbacks = subscribers.get(type) || new Set();
  for (const cb of callbacks) {
    // wrap to protect the bus from subscriber errors
    try { cb(payload, event.routing); } catch (e) { /* ignore subscriber error */ }
  }
  return event;
}

/**
 * Route an event to an SSE channel (in production this dispatches to Redis
 * subscribers, which then push to the matching SSE channel).
 * @param {string} type
 * @returns {string|null} the SSE channel this event should go to, or null
 */
function routeToChannel(type) {
  const map = {
    'trade.update': 'trades',
    'pnl.update': 'pnl',
    'position.update': 'positions',
    'notification': 'notifications'
  };
  return map[type] || null;
}

/**
 * Get event history (optionally filtered by type).
 * @param {string} [type]
 * @returns {Array<Object>}
 */
function getHistory(type) {
  return type ? history.filter(e => e.type === type) : history.slice();
}

/**
 * Whether Redis pub/sub layer is "connected" (stub).
 * @returns {boolean}
 */
function isRedisConnected() {
  return true;
}

/**
 * Reset the bus (test helper).
 */
function resetBus() {
  subscribers.clear();
  history.length = 0;
}

module.exports = {
  VALID_EVENT_TYPES,
  isValidType,
  subscribe,
  publish,
  routeToChannel,
  getHistory,
  isRedisConnected,
  resetBus
};