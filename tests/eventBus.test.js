const { VALID_EVENT_TYPES, isValidType, subscribe, publish, routeToChannel, getHistory, isRedisConnected, resetBus } = require('../lib/eventBus');

// Manual test runner
(async () => {
  console.log('Running Event Bus / Broadcast (P3.3) tests...\n');
  let allPass = true;
  const check = (name, cond) => {
    console.log(`${cond ? '✅' : '❌'} ${name}`);
    if (!cond) allPass = false;
  };

  resetBus();

  // 1️⃣ Event types valid
  check('trade.update is valid', isValidType('trade.update') === true);
  check('pnl.update is valid', isValidType('pnl.update') === true);
  check('invalid type rejected', isValidType('bogus') === false);

  // 2️⃣ Publish + receive
  let received = null;
  const unsub = subscribe('trade.update', (payload) => { received = payload; });
  const ev = publish('trade.update', { symbol: 'SOL', side: 'buy' });
  check('Event published', ev.type === 'trade.update');
  check('Subscriber received payload', received && received.symbol === 'SOL');

  // 3️⃣ Unsubscribe stops delivery
  let count = 0;
  const unsub2 = subscribe('system', () => { count++; });
  publish('system', { msg: 'one' });
  unsub2(); // now unsubscribed
  publish('system', { msg: 'two' });
  check('Unsubscribed callback not called (count stayed 1)', count === 1);

  // 4️⃣ Routing to SSE channels
  check('trade.update -> trades', routeToChannel('trade.update') === 'trades');
  check('pnl.update -> pnl', routeToChannel('pnl.update') === 'pnl');
  check('position.update -> positions', routeToChannel('position.update') === 'positions');
  check('notification -> notifications', routeToChannel('notification') === 'notifications');
  check('session.revoked has no SSE channel', routeToChannel('session.revoked') === null);

  // 5️⃣ Redis "connected" stub
  check('Redis connected', isRedisConnected() === true);

  // 6️⃣ History recorded
  const hist = getHistory('trade.update');
  check('History has trade.update events', hist.length >= 1);
  check('History contains published payload', hist.some(h => h.payload.symbol === 'SOL'));

  console.log(`\n${allPass ? '✅ All Event Bus tests passed' : '❌ Some tests failed'}`);
  process.exit(allPass ? 0 : 1);
})();