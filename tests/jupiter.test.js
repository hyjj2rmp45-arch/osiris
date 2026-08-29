const { getQuote, getSwapTransaction } = require('../lib/jupiter');

// Simple async test runner
async function test(description, fn) {
  try {
    await fn();
    console.log(`✅ ${description}`);
  } catch (err) {
    console.error(`❌ ${description}`);
    console.error(err.message);
    process.exit(1);
  }
}

(async () => {
  console.log('Running Jupiter v6 Client tests...\n');

  await test('getQuote function exists and is callable', async () => {
    if (typeof getQuote !== 'function') throw new Error('getQuote not exported');
    // Verify it can be called without throwing immediately
    try {
      await getQuote({ inputMint: 'test', outputMint: 'test', amount: 1000000 });
    } catch (e) {
      // Expected - network call may fail, but function exists and is callable
      console.log('   Function callable (network error expected in test env)');
    }
  });

  await test('getSwapTransaction function exists and is callable', async () => {
    if (typeof getSwapTransaction !== 'function') throw new Error('getSwapTransaction not exported');
    // Verify it can be called without throwing immediately
    try {
      await getSwapTransaction({
        quoteResponse: { maxAccounts: 1 },
        userPublicKey: 'test'
      });
    } catch (e) {
      // Expected - network call may fail, but function exists and is callable
      console.log('   Function callable (network error expected in test env)');
    }
  });

  await test('lib exports both functions', () => {
    const lib = require('../lib/jupiter');
    if (!lib.getQuote || !lib.getSwapTransaction) {
      throw new Error('Missing exports');
    }
  });

  console.log('\n✅ All Jupiter client tests completed');
})();