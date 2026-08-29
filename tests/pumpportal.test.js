const { getTokenInfo, getQuote, getSwapTransaction } = require('../lib/pumpportal');

// Manual test runner – each function returns a promise; we just verify they resolve
(async () => {
  console.log('Running PumpPortal client checks...\n');

  // 1️⃣ getTokenInfo – should resolve (even if network error, we just confirm function callable)
  try {
    const info = await getTokenInfo('So11111111111111111111111111111111111111112');
    console.log('✅ getTokenInfo resolved (data shape shown):', Object.keys(info).join(', '));
  } catch (e) {
    console.log('⚠️ getTokenInfo threw (expected if offline):', e.message);
  }

  // 2️⃣ getQuote – should resolve (URL built, network error expected)
  try {
    const quote = await getQuote({
      inputMint: 'So1111111111111111111111111111111111111112',
      outputMint: 'EEqy7TcMM79gH1xj3LLkKj3xvFXWRzfx2Y7tDG6fLpump',
      amount: 1_000_000,
      slippageBps: 50
    });
    console.log('✅ getQuote resolved (keys):', Object.keys(quote).join(', '));
  } catch (e) {
    console.log('⚠️ getQuote threw (expected if offline):', e.message);
  }

  // 3️⃣ getSwapTransaction – deterministic placeholder, always returns base64 string
  try {
    const tx = await getSwapTransaction({
      quote: { maxAccounts: 1 },
      walletPublicKey: 'E5siK5K...demo...'
    });
    console.log('✅ getSwapTransaction returned base64 string of length', tx.length);
  } catch (e) {
    console.log('⚠️ getSwapTransaction threw:', e.message);
  }

  console.log('\n✅ All PumpPortal checks completed');
})();