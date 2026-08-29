const { DEFAULT_SETTINGS, getSettings, updateSettings, isPaperTrading, resetSettings } = require('../lib/userSettings');

// Manual test runner
(async () => {
  console.log('Running User Settings (P2.5) tests...\n');
  let allPass = true;
  const check = (name, cond) => {
    console.log(`${cond ? '✅' : '❌'} ${name}`);
    if (!cond) allPass = false;
  };

  resetSettings();

  // 1️⃣ Defaults returned for new user
  const defaults = getSettings('user-1');
  check('Defaults returned', defaults.defaultSlippageBps === 50);
  check('Paper trading off by default', defaults.paperTrading === false);

  // 2️⃣ Settings persisted per user (partial update)
  const updated = updateSettings('user-1', { defaultSlippageBps: 100, paperTrading: true });
  check('Slippage updated', updated.defaultSlippageBps === 100);
  check('Paper trading on', updated.paperTrading === true);
  check('Persisted across reads', getSettings('user-1').defaultSlippageBps === 100);

  // 3️⃣ Different user keeps defaults (isolation)
  check('Other user unaffected', getSettings('user-2').defaultSlippageBps === 50);

  // 4️⃣ isPaperTrading reflects setting
  check('isPaperTrading true', isPaperTrading('user-1') === true);
  check('isPaperTrading false for other', isPaperTrading('user-2') === false);

  // 5️⃣ Invalid slippage rejected
  let threw = false;
  try { updateSettings('user-1', { defaultSlippageBps: -5 }); } catch (e) { threw = true; }
  check('Negative slippage rejected', threw === true);

  // 6️⃣ Unknown setting rejected
  threw = false;
  try { updateSettings('user-1', { notARealSetting: true }); } catch (e) { threw = true; }
  check('Unknown setting rejected', threw === true);

  // 7️⃣ Boolean validation
  threw = false;
  try { updateSettings('user-1', { notificationsEnabled: 'yes' }); } catch (e) { threw = true; }
  check('Non-boolean rejected', threw === true);

  console.log(`\n${allPass ? '✅ All User Settings tests passed' : '❌ Some tests failed'}`);
  process.exit(allPass ? 0 : 1);
})();