const { isHoneypot, hasLiquidityLock, detectRugPull } = require('../lib/mevProtection');

// Manual test runner
(async () => {
  console.log('Running MEV Protection checks...\n');

  // 1️⃣ isHoneypot – should return false for unknown addresses
  try {
    const result = isHoneypot('0x1234567890abcdef');
    const pass = result === false;
    console.log(`${pass ? '✅' : '❌'} isHoneypot returns false for unknown address: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (e) {
    console.log('❌ isHoneypot threw:', e.message);
  }

  // 2️⃣ hasLiquidityLock – should return false (placeholder)
  try {
    const result = hasLiquidityLock('0x1234567890abcdef');
    const pass = result === false;
    console.log(`${pass ? '✅' : '❌'} hasLiquidityLock returns false: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (e) {
    console.log('❌ hasLiquidityLock threw:', e.message);
  }

  // 3️⃣ detectRugPull – should return false (placeholder)
  try {
    const result = detectRugPull('0x1234567890abcdef');
    const pass = result === false;
    console.log(`${pass ? '✅' : '❌'} detectRugPull returns false: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (e) {
    console.log('❌ detectRugPull threw:', e.message);
  }

  // 4️⃣ isHoneypot – should return true for known honeypot if we add one (but set is empty)
  // Since KNOWN_HONEY_POT_ADDRESSES is empty, it will always be false.
  // We can test that the function works by temporarily adding? Not needed.

  console.log('\n✅ All MEV Protection checks completed');
})();