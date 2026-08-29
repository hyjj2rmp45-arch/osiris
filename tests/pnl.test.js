const { setPublishHook, openPosition, computeRealizedPnl, computeUnrealizedPnl, getPosition, resetPNL } = require('../lib/pnl');

// Manual test runner
(async () => {
  console.log('Running Real-Time PNL (P3.4) tests...\n');
  let allPass = true;
  const check = (name, cond) => {
    console.log(`${cond ? '✅' : '❌'} ${name}`);
    if (!cond) allPass = false;
  };

  resetPNL();

  // 1️⃣ Realized PNL after trade completion
  openPosition('pos-1', 100, 1000); // entry 100, size 1000
  const realized = computeRealizedPnl({ positionId: 'pos-1', exitPrice: 150, sizeLamports: 1000 });
  check('Realized PNL computed', realized.realizedPnlLamports === 500); // (150-100)/100*1000
  check('PNL percentage correct', realized.pnlPct === 50);

  // 2️⃣ Unrealized PNL updates on price change
  openPosition('pos-2', 100, 1000);
  const unreal = computeUnrealizedPnl('pos-2', 120);
  check('Unrealized PNL computed', unreal.unrealizedPnlLamports === 200);
  check('Unrealized PNL pct', unreal.pnlPct === 20);

  // 3️⃣ Events streamed to SSE via hook
  let events = [];
  setPublishHook((payload) => events.push(payload));
  openPosition('pos-3', 100, 1000);
  computeUnrealizedPnl('pos-3', 110);
  computeRealizedPnl({ positionId: 'pos-3', exitPrice: 130, sizeLamports: 1000 });
  check('PNL events published', events.length === 2);
  check('Event type is pnl.update', events.every(e => e.type === 'pnl.update'));
  check('Has realized event', events.some(e => e.reason === 'realized'));
  check('Has unrealized event', events.some(e => e.reason === 'unrealized'));

  // 4️⃣ Position state consistent after close
  check('Position removed after close', getPosition('pos-3') === null);
  check('Open position still tracked', getPosition('pos-2') !== null);

  // 5️⃣ Unrealized on unknown position errors
  let threw = false;
  try { computeUnrealizedPnl('nope', 10); } catch (e) { threw = true; }
  check('Unknown position errors', threw === true);

  console.log(`\n${allPass ? '✅ All Real-Time PNL tests passed' : '❌ Some tests failed'}`);
  process.exit(allPass ? 0 : 1);
})();