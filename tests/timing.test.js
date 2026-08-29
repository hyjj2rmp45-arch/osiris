const { BUDGETS, setAlertHook, startSpan, endSpan, checkBudget, computeP99, getBudgets, resetTiming } = require('../lib/timing');

// Manual test runner
(async () => {
  console.log('Running Latency Budget & Alerting (P3.6) tests...\n');
  let allPass = true;
  const check = (name, cond) => {
    console.log(`${cond ? '✅' : '❌'} ${name}`);
    if (!cond) allPass = false;
  };

  resetTiming();

  // 1️⃣ Budgets defined
  check('Copy budget = 500ms', getBudgets().copy === 500);
  check('Standard budget = 2000ms', getBudgets().standard === 2000);

  // 2️⃣ checkBudget breach detection
  check('Under budget not breached', checkBudget('copy', 400).breached === false);
  check('Over budget breached', checkBudget('copy', 600).breached === true);
  check('Standard over 2s breached', checkBudget('standard', 2500).breached === true);

  // 3️⃣ Timing spans record latency
  startSpan('span-1', 'standard');
  await new Promise(r => setTimeout(r, 10));
  const res = endSpan('span-1');
  check('Span records latency', res.latencyMs >= 10);
  check('Span not breached (10ms < 2s)', res.breached === false);

  // 4️⃣ p99 computed over recorded spans
  for (let i = 0; i < 10; i++) {
    startSpan(`s-${i}`, 'standard');
    await new Promise(r => setTimeout(r, i));
    endSpan(`s-${i}`);
  }
  const p99 = computeP99();
  check('p99 computed', typeof p99 === 'number');

  // 5️⃣ Alert fires on breach (via Date.now patch)
  let alerted = null;
  setAlertHook((a) => { alerted = a; });
  const originalNow = Date.now;
  // Simulate a span that takes 3000ms
  let fakeNow = 1000;
  Date.now = () => fakeNow;
  startSpan('breach', 'copy');
  fakeNow = 1000 + 3000; // +3000ms > 500 budget
  const breachRes = endSpan('breach');
  Date.now = originalNow;
  check('Breach detected', breachRes.breached === true);
  check('Alert hook fired', alerted !== null && alerted.breached === true);

  console.log(`\n${allPass ? '✅ All Latency/Timing tests passed' : '❌ Some tests failed'}`);
  process.exit(allPass ? 0 : 1);
})();