const { withRetry, createRetryWrapper } = require('../lib/retry');

// Manual test runner
(async () => {
  console.log('Running Retry / Backoff tests...\n');

  // 1️⃣ withRetry succeeds on first try
  try {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      return 'ok';
    });
    if (result !== 'ok') throw new Error('unexpected result');
    if (calls !== 1) throw new Error(`expected 1 call, got ${calls}`);
    console.log('✅ withRetry succeeds on first try');
  } catch (e) {
    console.log('❌ withRetry test 1 failed:', e.message);
    process.exit(1);
  }

  // 2️⃣ withRetry retries on failure and eventually succeeds
  try {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 3) throw new Error('fail');
      return 'success';
    }, { retries: 5, baseDelay: 10, jitter: false });
    if (result !== 'success') throw new Error('unexpected result');
    if (attempts !== 3) throw new Error(`expected 3 attempts, got ${attempts}`);
    console.log('✅ withRetry retries on failure and succeeds');
  } catch (e) {
    console.log('❌ withRetry test 2 failed:', e.message);
    process.exit(1);
  }

  // 3️⃣ withRetry throws after exhausting retries
  try {
    let attempts = 0;
    await withRetry(async () => {
      attempts++;
      throw new Error('always fail');
    }, { retries: 2, baseDelay: 10, jitter: false });
    throw new Error('should have thrown');
  } catch (e) {
    if (e.message !== 'always fail') throw new Error(`expected 'always fail', got '${e.message}'`);
    console.log('✅ withRetry throws after exhausting retries');
  }

  // 4️⃣ createRetryWrapper wraps a function
  try {
    let calls = 0;
    const fn = async (x) => {
      calls++;
      if (calls < 2) throw new Error('fail');
      return x * 2;
    };
    const wrapped = createRetryWrapper(fn, { retries: 3, baseDelay: 10, jitter: false });
    const result = await wrapped(5);
    if (result !== 10) throw new Error('unexpected result');
    if (calls !== 2) throw new Error(`expected 2 calls, got ${calls}`);
    console.log('✅ createRetryWrapper wraps function correctly');
  } catch (e) {
    console.log('❌ createRetryWrapper test failed:', e.message);
    process.exit(1);
  }

  console.log('\n✅ All Retry / Backoff tests passed');
})();