/**
 * WebSocket Control Server – Phase 3 (P3.1)
 *
 * Models the WebSocket connection lifecycle and command protocol without a
 * real socket transport:
 *   - JWT-based connection auth (invalid token → "1008 close code")
 *   - Command protocol: COMMAND / RESPONSE / ERROR
 *   - session.create, session.revoke commands
 *   - Connection tracking & cleanup per user
 *
 * In production this runs behind a real WebSocket endpoint (e.g., Next.js
 * route handler). This stub provides the auth, validation, and state logic.
 */

const crypto = require('crypto');

const CLOSE_CODES = {
  POLICY_VIOLATION: 1008
};

// In-memory: userId -> { connections: Set<connId>, sessions: Set<sessionId> }
const connectionState = new Map();

// Simulated valid JWT check — production verifies real signed JWTs.
function isJwtValid(token) {
  if (typeof token !== 'string' || token.length === 0) return false;
  // Placeholder: a token starting with "valid." is considered valid.
  return token.startsWith('valid.');
}

/**
 * Authenticate a connection with a JWT.
 * @param {string} token
 * @returns {Object} { ok, userId?, closeCode? }
 */
function authenticateConnection(token) {
  if (!isJwtValid(token)) {
    return { ok: false, closeCode: CLOSE_CODES.POLICY_VIOLATION };
  }
  // Derive a deterministic userId from the token (stub).
  const userId = crypto.createHash('sha256').update(token).digest('hex').slice(0, 12);
  return { ok: true, userId };
}

/**
 * Validate a command against the allowed command set.
 * @param {Object} cmd - { type, ... }
 * @returns {boolean}
 */
function validateCommand(cmd) {
  if (!cmd || typeof cmd !== 'object') return false;
  if (typeof cmd.type !== 'string') return false;
  return ['session.create', 'session.revoke'].includes(cmd.type);
}

/**
 * Execute a validated command for a user.
 * @param {Object} connection
 * @param {Object} cmd
 * @returns {Object} { status: 'RESPONSE'|'ERROR', ... }
 */
function executeCommand(connection, cmd) {
  if (!validateCommand(cmd)) {
    return { status: 'ERROR', error: 'INVALID_COMMAND' };
  }
  const { userId } = connection;
  const state = getOrCreateState(userId);

  if (cmd.type === 'session.create') {
    const sessionId = `ses-${crypto.randomBytes(4).toString('hex')}`;
    state.sessions.add(sessionId);
    return { status: 'RESPONSE', command: cmd.type, sessionId };
  }

  if (cmd.type === 'session.revoke') {
    const { sessionId } = cmd;
    if (!sessionId || !state.sessions.has(sessionId)) {
      return { status: 'ERROR', error: 'SESSION_NOT_FOUND' };
    }
    state.sessions.delete(sessionId);
    return { status: 'RESPONSE', command: cmd.type, sessionId, revoked: true };
  }

  return { status: 'ERROR', error: 'UNKNOWN_COMMAND' };
}

/**
 * Register a new connection for a user.
 * @param {string} userId
 * @returns {string} connection id
 */
function trackConnection(userId) {
  const state = getOrCreateState(userId);
  const connId = `conn-${crypto.randomBytes(4).toString('hex')}`;
  state.connections.add(connId);
  return connId;
}

/**
 * Remove a connection (disconnect cleanup).
 * @param {string} userId
 * @param {string} connId
 */
function cleanupConnection(userId, connId) {
  const state = connectionState.get(userId);
  if (state) state.connections.delete(connId);
}

/**
 * Number of active connections for a user.
 * @param {string} userId
 * @returns {number}
 */
function activeConnectionCount(userId) {
  return connectionState.get(userId)?.connections.size || 0;
}

/**
 * Internal helper.
 */
function getOrCreateState(userId) {
  if (!connectionState.has(userId)) {
    connectionState.set(userId, { connections: new Set(), sessions: new Set() });
  }
  return connectionState.get(userId);
}

/**
 * Reset all connection state (test helper).
 */
function resetConnections() {
  connectionState.clear();
}

module.exports = {
  CLOSE_CODES,
  authenticateConnection,
  validateCommand,
  executeCommand,
  trackConnection,
  cleanupConnection,
  activeConnectionCount,
  resetConnections
};