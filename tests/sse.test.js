const { VALID_CHANNELS, KEEPALIVE_INTERVAL_MS, authenticateBearer, isValidChannel, subscribe, unsubscribe, publishEvent, replayWithLastEventId, keepAliveInterval, subscriberCount, resetSSE } = require('../lib/sse');

// Manual test runner
(async () => {
  console.log('Running SSE Data Streaming (P3.2) tests...\n');
  let allPass = true;
  const check = (name, cond) => {
    console.log(`${cond ? '✅' : '❌'} ${name}`);
    if (!cond) allPass = false;
  };

  resetSSE();

  // 1️⃣ Bearer auth
  check('Valid Bearer authenticates', authenticateBearer('Bearer valid.tok').ok === true);
  check('Missing Bearer rejected', authenticateBearer('no-bearer').ok === false);
  check('Invalid token rejected', authenticateBearer('Bearer bad').ok === false);

  // 2️⃣ Channel validation
  check('Valid channel trades', isValidChannel('trades') === true);
  check('Invalid channel rejected', isValidChannel('other') === false);

  // 3️⃣ Subscribe / publish / subscriber count (isolation)
  const c1 = subscribe('trades', 'user1');
  const c2 = subscribe('trades', 'user2');
  check('Two subscribers on trades', subscriberCount('trades') === 2);
  const ev = publishEvent('trades', { symbol: 'SOL', price: 150 });
  check('Event published with id', typeof ev.id === 'number' && ev.channel === 'trades');

  // 4️⃣ Publish only updates subscribers of that channel
  const c3 = subscribe('pnl', 'user3');
  publishEvent('pnl', { pnl: 500 });
  check('pnl channel isolated (1 subscriber)', subscriberCount('pnl') === 1);
  check('trades channel still has 2', subscriberCount('trades') === 2);

  // 5️⃣ Replay via Last-Event-ID
  publishEvent('trades', { symbol: 'ETH', price: 3000 });
  const replay = replayWithLastEventId('trades', ev.id);
  check('Replay returns events after lastEventId', replay.length === 1);
  check('Replay contains correct data', replay[0].data.symbol === 'ETH');

  // 6️⃣ Keep-alive interval is 30s
  check('Keep-alive interval 30s', keepAliveInterval() === 30_000);
  check('KEEPALIVE_INTERVAL_MS constant', KEEPALIVE_INTERVAL_MS === 30_000);

  // 7️⃣ Unsubscribe reduces count
  unsubscribe('trades', c1);
  check('Unsubscribe reduces count', subscriberCount('trades') === 1);

  console.log(`\n${allPass ? '✅ All SSE tests passed' : '❌ Some tests failed'}`);
  process.exit(allPass ? 0 : 1);
})();