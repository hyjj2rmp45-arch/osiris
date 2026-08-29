const { calculateFee, DEFAULT_FEE_BPS, DEFAULT_FEE_MAX_LAMPORTS } = require('../lib/fees');

// Manual test runner
(async () => {
  console.log('Running Fee calculator tests...\n');

  // 1️⃣ Default percent applied
  const amount = 1_000_000; // 1 SOL in lamports
  const fee = calculateFee(amount);
  const expected = Math.floor((amount * DEFAULT_FEE_BPS) / 10_000); // 2500 lamports
  const pass1 = fee === expected;
  console.log(`${pass1 ? '✅' : '❌'} Default fee (${fee} == ${expected}): ${pass1 ? 'PASS' : 'FAIL'}`);

  // 2️⃣ Cap respected
  const hugeAmount = 1_000_000_000_000; // very large trade
  const cappedFee = calculateFee(hugeAmount);
  const pass2 = cappedFee <= DEFAULT_FEE_MAX_LAMPORTS;
  console.log(`${pass2 ? '✅' : '❌'} Cap respected (fee ${cappedFee} <= max ${DEFAULT_FEE_MAX_LAMPORTS}): ${pass2 ? 'PASS' : 'FAIL'}`);

  // 3️⃣ Zero amount → zero fee
  const zeroFee = calculateFee(0);
  const pass3 = zeroFee === 0;
  console.log(`${pass3 ? '✅' : '❌'} Zero amount → 0 fee: ${pass3 ? 'PASS' : 'FAIL'}`);

  // 4️⃣ Custom overrides work
  const custom = calculateFee(500_000, 0, { feeBps: 50, maxLamports: 10_000 });
  const expectedCustom = Math.floor((500_000 * 50) / 10_000); // 2500
  const pass4 = custom === expectedCustom;
  console.log(`${pass4 ? '✅' : '❌'} Custom overrides (${custom} == ${expectedCustom}): ${pass4 ? 'PASS' : 'FAIL'}`);

  const allPass = pass1 && pass2 && pass3 && pass4;
  console.log(`\n${allPass ? '✅ All fee tests passed' : '❌ Some fee tests failed'}`);
  process.exit(allPass ? 0 : 1);
})();