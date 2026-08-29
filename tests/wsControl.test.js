const { CLOSE_CODES, authenticateConnection, validateCommand, executeCommand, trackConnection, cleanupConnection, activeConnectionCount, resetConnections } = require('../lib/wsControl');

// Manual test runner
(async () => {
  console.log('Running WebSocket Control Server (P3.1) tests...\n');
  let allPass = true;
  const check = (name, cond) => {
    console.log(`${cond ? '✅' : '❌'} ${name}`);
    if (!cond) allPass = false;
  };

  resetConnections();

  // 1️⃣ Valid JWT authenticates
  const auth = authenticateConnection('valid.token123');
  check('Valid JWT authenticates', auth.ok === true && typeof auth.userId === 'string');

  // 2️⃣ Invalid JWT rejected with 1008
  const bad = authenticateConnection('invalid-token');
  check('Invalid JWT rejected', bad.ok === false);
  check('Close code 1008', bad.closeCode === CLOSE_CODES.POLICY_VIOLATION);

  // 3️⃣ Empty token rejected
  check('Empty token rejected', authenticateConnection('').ok === false);

  // 4️⃣ Commands validated
  check('session.create is valid', validateCommand({ type: 'session.create' }) === true);
  check('session.revoke is valid', validateCommand({ type: 'session.revoke', sessionId: 'x' }) === true);
  check('Unknown command invalid', validateCommand({ type: 'other' }) === false);
  check('Null command invalid', validateCommand(null) === false);

  // 5️⃣ session.create executes
  const conn = { userId: 'user1' };
  const createRes = executeCommand(conn, { type: 'session.create' });
  check('session.create returns RESPONSE', createRes.status === 'RESPONSE');
  check('session.create returns sessionId', typeof createRes.sessionId === 'string');

  // 6️⃣ session.revoke works for created session
  const revokeRes = executeCommand(conn, { type: 'session.revoke', sessionId: createRes.sessionId });
  check('session.revoke succeeds', revokeRes.status === 'RESPONSE' && revokeRes.revoked === true);

  // 7️⃣ session.revoke unknown session errors
  const revokeBad = executeCommand(conn, { type: 'session.revoke', sessionId: 'nope' });
  check('session.revoke unknown errors', revokeBad.status === 'ERROR');

  // 8️⃣ Connection tracking & cleanup
  const userId = authenticateConnection('valid.another').userId;
  const c1 = trackConnection(userId);
  const c2 = trackConnection(userId);
  check('Two connections tracked', activeConnectionCount(userId) === 2);
  cleanupConnection(userId, c1);
  check('Cleanup reduces count', activeConnectionCount(userId) === 1);

  console.log(`\n${allPass ? '✅ All WebSocket Control tests passed' : '❌ Some tests failed'}`);
  process.exit(allPass ? 0 : 1);
})();