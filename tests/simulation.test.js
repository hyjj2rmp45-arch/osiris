const { simulateSwap, simulateBundle } = require('../lib/simulation');

// Manual test runner
(async () => {
  console.log('Running Simulation Engine tests...\n');

  // 1️⃣ simulateSwap returns expected structure
  try {
    const result = await simulateSwap({
      inputMint: 'So1111111111111111111111111111111111111112',
      outputMint: 'EPjFWdd5AufqSSqeM2qN1dSPD2oUphcFF1m1bWeeAX7Su',
      amount: 1_000_000,
      slippageBps: 50
    });
    if (!result.estimatedAmountOut) throw new Error('missing estimatedAmountOut');
    if (typeof result.priceImpactPct !== 'number') throw new Error('priceImpactPct not a number');
    if (typeof result.mevRiskScore !== 'number') throw new Error('mevRiskScore not a number');
    console.log('✅ simulateSwap returns expected structure');
  } catch (e) {
    console.log('❌ simulateSwap test failed:', e.message);
    process.exit(1);
  }

  // 2️⃣ simulateBundle returns aggregated results
  try {
    const txs = [
      { inputMint: 'So1111111111111111111111111111111111111112', outputMint: 'EPjFWdd5AufqSSqeM2qN1dSPD2oUphcFF1m1bWeeAX7Su', amount: 1_000_000, slippageBps: 50 },
      { inputMint: 'So1111111111111111111111111111111111111112', outputMint: 'EPjFWdd5AufqSSqeM2qN1dSPD2oUphcFF1m1bWeeAX7Su', amount: 2_000_000, slippageBps: 50 }
    ];
    const bundle = await simulateBundle(txs);
    if (!bundle.transactions || bundle.transactions.length !== 2) throw new Error('transactions array missing');
    if (typeof bundle.aggregatePriceImpactPct !== 'number') throw new Error('aggregatePriceImpactPct not a number');
    if (typeof bundle.aggregateMevRiskScore !== 'number') throw new Error('aggregateMevRiskScore not a number');
    console.log('✅ simulateBundle returns aggregated results');
  } catch (e) {
    console.log('❌ simulateBundle test failed:', e.message);
    process.exit(1);
  }

  console.log('\n✅ All Simulation Engine tests passed');
})();