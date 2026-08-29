const { isUnsafe, isUnsafeToken, KNOWN_DANGEROUS_KEYWORDS } = require('../lib/tokenSafety');

// Manual test runner
(async () => {
  console.log('Running Token Safety (P1.6a) tests...\n');

  // 1️⃣ Safe token passes
  try {
    const result = isUnsafe('USD Coin', 1_000_000_000); // 1B supply
    if (result !== false) throw new Error('Expected false for safe token');
    console.log('✅ Safe token passes');
  } catch (e) {
    console.log('❌ Test 1 failed:', e.message);
    process.exit(1);
  }

  // 2️⃣ Dangerous keyword triggers unsafe
  try {
    const result = isUnsafe('RugToken', 100_000);
    if (result !== true) throw new Error('Expected true for "Rug" keyword');
    console.log('✅ Dangerous keyword triggers unsafe');
  } catch (e) {
    console.log('❌ Test 2 failed:', e.message);
    process.exit(1);
  }

  // 3️⃣ Case‑insensitive keyword detection
  try {
    const result = isUnsafe('SCAM COIN', 50_000);
    if (result !== true) throw new Error('Expected true for uppercase SCAM');
    console.log('✅ Keyword detection is case‑insensitive');
  } catch (e) {
    console.log('❌ Test 3 failed:', e.message);
    process.exit(1);
  }

  // 4️⃣ Large supply triggers unsafe (threshold = 1e15)
  try {
    const result = isUnsafe('NormalToken', 2_000_000_000_000_000); // 2e15 > 1e15
    if (result !== true) throw new Error('Expected true for supply > 1e15');
    console.log('✅ Large supply triggers unsafe');
  } catch (e) {
    console.log('❌ Test 4 failed:', e.message);
    process.exit(1);
  }

  // 5️⃣ Known dangerous keywords exposed
  try {
    if (!Array.isArray(KNOWN_DANGEROUS_KEYWORDS)) throw new Error('keywords not array');
    if (!KNOWN_DANGEROUS_KEYWORDS.includes('rug')) throw new Error('missing "rug"');
    console.log('✅ Dangerous keywords exported');
  } catch (e) {
    console.log('❌ Test 5 failed:', e.message);
    process.exit(1);
  }

  console.log('\n✅ All Token Safety (P1.6a) tests passed');
})();