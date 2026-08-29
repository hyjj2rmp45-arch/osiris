// Mock Redis so tests don't attempt a real connection (rate limiter fails OPEN on error).
jest.mock('../src/lib/redis', () => {
  const redis = {
    multi: () => {
      const chain = {
        zadd: () => chain,
        zremrangebyscore: () => chain,
        expire: () => chain,
        exec: () =>
          Promise.resolve([
            ['OK'],
            [0, '0'],
            [0, '0'], // zcard -> 0 trades in window -> allowed
            [1, 'OK'],
          ]),
      };
      return chain;
    },
    error: undefined,
  };
  return { __esModule: true, default: redis, redis };
});

// Mock metrics so collectors don't accumulate between runs.
jest.mock('../src/lib/metrics', () => ({
  register: { contentType: 'text/plain; version=0.0.4', metrics: () => Promise.resolve('') },
  tradeVolumeCounter: { inc: () => {} },
  tradesTotalCounter: { inc: () => {} },
  feeRevenueCounter: { inc: () => {} },
  breakerTripCounter: { inc: () => {} },
  rateLimitBlockedCounter: { inc: () => {} },
  activeSessionsGauge: { inc: () => {}, dec: () => {} },
  tradeDurationHistogram: { observe: () => {} },
}));

const { executeCopyTrade } = require('../src/lib/copy-trading-flow');

describe('E2E: Webhook -> Trade -> Payout', () => {
  it('should process a valid webhook and return a confirmation with payout', async () => {
    const webhookPayload = JSON.stringify({
      event: 'new_trade',
      data: {
        sourceWallet: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        targetWallet: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        tradeAmount: 150,
        tradePercentage: 75,
        copyDirection: 'long',
        timestamp: Date.now(),
        sourceTxSignature: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        metadata: {
          protocol: 'pump',
          poolAddress: '0xpool1111111111111111111111111111111111111111',
          inputMint: '0xinputaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          outputMint: '0xoutputbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        },
      },
      signature: '0xmockwebhooksignature',
      timestamp: Date.now(),
      metadata: {
        source: 'pump-portal',
        ip: '1.2.3.4',
      },
    });

    const tierLimits = {
      maxPositionSize: 5000,
      minTradeSize: 10,
      copyPercentage: 100,
    };

    const signerAddress = '0xcccccccccccccccccccccccccccccccccccccccc';
    const result = await executeCopyTrade(webhookPayload, signerAddress, tierLimits);

    expect(result.success).toBe(true);
    expect(result.confirmation).toBeDefined();
    expect(result.confirmation.status).toBe('success');
    expect(result.confirmation.explorerLink.startsWith('https://explorer.solana.com/tx/')).toBe(true);
    console.log('E2E test passed:', JSON.stringify(result.confirmation, null, 2));
  });
});