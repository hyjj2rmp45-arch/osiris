const { isHoneypot, isRugPull } = require('../lib/honeypot');

// Manual test runner
(async () => {
  console.log('Running Honeypot detection tests...\n');

  // 1️⃣ isHoneypot returns false for safe token
  try {
    const result = isHoneypot('So1111111111111111111111111111111111111112', 'USD Coin');
    if (result !== false) throw new Error('Expected false for safe token');
    console.log('✅ isHoneypot returns false for safe token');
  } catch (e) {
    console.log('❌ isHoneypot test 1 failed:', e.message);
    process.exit(1);
  }

  // 2️⃣ isHoneypot returns true for token with risky keyword
  try {
    const result = isHoneypot('0xdeadbeef', 'HoneyPot Token');
    if (result !== true) throw new Error('Expected true for honeypot token');
    console.log('✅ isHoneypot returns true for token with "honeypot" keyword');
  } catch (e) {
    console.log('❌ isHoneypot test 2 failed:', e.message);
    process.exit(1);
  }

  // 3️⃣ isHoneypot is case‑insensitive
  try {
    const result = isHoneypot('0xcafebabe', 'SCAM COIN');
    if (result !== true) throw new Error('Expected true for uppercase SCAM');
    console.log('✅ isHoneypot is case‑insensitive');
  } catch (e) {
    console.log('❌ isHoneypot test 3 failed:', e.message);
    process.exit(1);
  }

  // 4️⃣ isRugPull behaves same as isHoneypot (placeholder)
  try {
    const safe = isRugPull('So1111111111111111111111111111111111111112', 'USDC');
    const risky = isRugPull('0xbad', 'RugPullToken');
    if (safe !== false) throw new Error('Expected false for safe token');
    if (risky !== true) throw new Error('Expected true for risky token');
    console.log('✅ isRugPull matches isHoneypot behavior');
  } catch (e) {
    console.log('❌ isRugPull test failed:', e.message);
    process.exit(1);
  }

  console.log('\n✅ All Honeypot detection tests passed');
})();