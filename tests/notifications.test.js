const { VALID_TYPES, createNotification, markRead, getNotifications, setPreference, queueTelegram, flushTelegramQueue, telegramLimitPerSec, resetNotifications } = require('../lib/notifications');

// Manual test runner
(async () => {
  console.log('Running Notification System (P3.5) tests...\n');
  let allPass = true;
  const check = (name, cond) => {
    console.log(`${cond ? '✅' : '❌'} ${name}`);
    if (!cond) allPass = false;
  };

  resetNotifications();

  // 1️⃣ Create notification on event
  const n = createNotification({ userId: 'user1', type: 'trade_confirm', title: 'Fill', body: 'SOL buy' });
  check('Notification created', n !== null && n.read === false);
  check('Has id', typeof n.id === 'number');

  // 2️⃣ Invalid type rejected
  let threw = false;
  try { createNotification({ userId: 'user1', type: 'bogus', title: 'x', body: 'y' }); } catch (e) { threw = true; }
  check('Invalid type rejected', threw === true);

  // 3️⃣ Mark read / unread filtering
  createNotification({ userId: 'user1', type: 'system', title: 'Sys', body: 'hi' });
  const unread = getNotifications('user1', { unreadOnly: true });
  check('Two unread initially', unread.length === 2);
  markRead('user1', n.id);
  check('Unread count drops after read', getNotifications('user1', { unreadOnly: true }).length === 1);

  // 4️⃣ Preferences respected (disable pnl_update)
  setPreference('user2', 'pnl_update', false);
  const skipped = createNotification({ userId: 'user2', type: 'pnl_update', title: 'PnL', body: 'big' });
  check('Disabled type not created', skipped === null);
  const allowed = createNotification({ userId: 'user2', type: 'system', title: 'Sys', body: 'ok' });
  check('Enabled type created', allowed !== null);

  // 5️⃣ Telegram batching respects 30/s limit
  const q = queueTelegram({ userId: 'user1', text: 'hello' });
  queueTelegram({ userId: 'user1', text: 'world' });
  check('Batch queue grows', q.batchSize === 1); // first queue had 1 at call time
  check('Telegram limit constant', telegramLimitPerSec() === 30);
  const flushed = flushTelegramQueue();
  check('Queue drains', flushed.length === 2);

  console.log(`\n${allPass ? '✅ All Notification System tests passed' : '❌ Some tests failed'}`);
  process.exit(allPass ? 0 : 1);
})();