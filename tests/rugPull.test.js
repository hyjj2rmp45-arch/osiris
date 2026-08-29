const { isRugPull, riskScore, getKeywords } = require('../lib/rugPull');

// Manual test runner
(async () => {
  console.log('Running Rug Pull Detection (P1.6b) tests...\n');

  // 1️⃣ Safe token returns false
  try {
    const result = isRugPull('So1111111111111111111111111111111111111112', 'USD Coin');
    if (result !== false) throw new Error('Expected false for safe token');
    console.log('✅ Safe token returns false');
  } catch (e) {
    console.log('❌ Test 1 failed:', e.message);
    process.exit(1);
  }

  // 2️⃣ Token with keyword 'rug' returns true
  try {
    const result = isRugPull('0xdead', 'RugToken');
    if (result !== true) throw new Error('Expected true for token containing "rug"');
    console.log('✅ Token with "rug" returns true');
  } catch (e) {
    console.log('❌ Test 2 failed:', e.message);
    process.exit(1);
  }

  // 3️⃣ Token with multiple keywords gives higher score
  try {
    const score = riskScore('Super Rug Pull Scam');
    if (score < 60) throw new Error(`Expected score >=60, got ${score}`);
    console.log('✅ Multiple keywords increase risk score');
  } catch (e) {
    console.log('❌ Test 3 failed:', e.message);
    process.exit(1);
  }

  // 4️⃣ getKeywords returns the array
  try {
    const keywords = getKeywords();
    if (!Array.isArray(keywords)) throw new Error('getKeywords should return array');
    if (!keywords.includes('rugpull')) throw new Error('missing "rugpull" keyword');
    console.log('✅ getKeywords returns expected array');
  } catch (e) {
    console.log('❌ Test 4 failed:', e.message);
    process.exit(1);
  }

  console.log('\n✅ All Rug Pull Detection (P1.6b) tests passed');
})();