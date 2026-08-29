const { deriveATA, createATA, closeATA } = require('../lib/ata');

// Manual test runner
(async () => {
  console.log('Running ATA management tests...\n');

  // 1️⃣ deriveATA returns deterministic address (sync)
  try {
    const wallet = 'E5siK5K...demo...';
    const token = 'So1111111111111111111111111111111111111112';
    const atA = deriveATA(wallet, token);
    if (!atA) throw new Error('deriveATA returned falsy');
    if (atA.length !== 44) throw new Error(`Expected length 44, got ${atA.length}`);
    console.log('✅ deriveATA returns deterministic address');
  } catch (e) {
    console.log('❌ deriveATA test failed:', e.message);
    process.exit(1);
  }

  // 2️⃣ createATA returns formatted transaction stub (async)
  try {
    const wallet = 'E5siK5K...demo...';
    const token = 'So1111111111111111111111111111111111111112';
    const tx = await createATA(wallet, token);
    if (typeof tx !== 'string' || !tx.startsWith('tx_')) throw new Error('createATA did not return tx_*');
    console.log('✅ createATA returns formatted transaction stub');
  } catch (e) {
    console.log('❌ createATA test failed:', e.message);
    process.exit(1);
  }

  // 3️⃣ closeATA returns formatted transaction stub (async)
  try {
    const wallet = 'E5siK5K...demo...';
    const token = 'So1111111111111111111111111111111111111112';
    const tx = await closeATA(wallet, token);
    if (typeof tx !== 'string' || !tx.startsWith('tx_')) throw new Error('closeATA did not return tx_*');
    console.log('✅ closeATA returns formatted transaction stub');
  } catch (e) {
    console.log('❌ closeATA test failed:', e.message);
    process.exit(1);
  }

  console.log('\n✅ All ATA tests passed');
})();