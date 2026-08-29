const { submitBundle, getBundleStatus } = require('../lib/jito');

// Manual test runner
(async () => {
  console.log('Running Jito client checks...\n');

  // 1️⃣ submitBundle – should resolve with a bundleId
  try {
    const result = await submitBundle({
      transactions: ['tx1base64', 'tx2base64'],
      tipLamports: 5000,
      signerPublicKey: 'E5siK5K...demo...'
    });
    console.log('✅ submitBundle resolved:', result);
  } catch (e) {
    console.log('⚠️ submitBundle threw:', e.message);
  }

  // 2️⃣ getBundleStatus – should resolve with status
  try {
    const status = await getBundleStatus('dummy-bundle-id');
    console.log('✅ getBundleStatus resolved:', status);
  } catch (e) {
    console.log('⚠️ getBundleStatus threw:', e.message);
  }

  console.log('\n✅ All Jito checks completed');
})();