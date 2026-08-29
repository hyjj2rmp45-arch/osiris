import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @solana/web3.js with Connection + Keypair support for VersionedTransaction
vi.mock('@solana/web3.js', async () => {
  const actual = await vi.importActual('@solana/web3.js');

  return {
    ...actual,
    Keypair: class {
      static fromSecretKey(secret: Uint8Array) {
        return {
          publicKey: { toBase58: () => 'MockPubkey11111111111111111111111111111111' },
          sign: vi.fn(),
        };
      }
    },
    Connection: class {
      constructor(rpcUrl?: string, commitment?: any) {
        this.getLatestBlockhash = vi.fn().mockResolvedValue({
          blockhash: 'test-blockhash',
        });
        this.sendTransaction = vi.fn().mockResolvedValue('test-signature' as any);
        this.getConfirmedTransaction = vi.fn().mockResolvedValue({
          meta: { err: null },
          slot: 12345,
          blockTime: Date.now() / 1000
        });
        this.simulateTransaction = vi.fn().mockResolvedValue({ value: { err: null } } as any);
      }
    },
    TransactionMessage: {
      compile: vi.fn().mockReturnValue({
        serialize: () => Buffer.from('test-message'),
      }),
      compileToV0Message: vi.fn().mockReturnValue({
        serialize: () => Buffer.from('test-v0-message'),
      }),
    },
    VersionedTransaction: class {
      constructor(message: any) {
        this.message = message;
        this.signatures = [];
      }
      sign(signers: any[]) {
        this.signatures = signers.map(() => Buffer.from('signature'));
      }
      serialize() {
        return Buffer.from('serialized-tx');
      }
    }
  };
});

// Mock trade-intent-service
vi.mock('@/services/trade-intent-service', () => ({
  tradeIntentService: {
    getById: vi.fn().mockResolvedValue({ id: 1, status: 'pending' }),
    updateStatus: vi.fn().mockResolvedValue(undefined),
  }
}));

// Mock config
vi.mock('@/lib/config', () => ({
  getEnv: vi.fn(() => ({
    HELIUS_API_KEY: 'test-helius-key',
    SOLANA_RPC_URL: 'https://test.rpc',
    PHANTOM_SOL_ADDRESS: 'test-sol-address',
    PHANTOM_USDC_ADDRESS: 'test-usdc-address',
  }))
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }
}));

// Mock safety manager
vi.mock('@/lib/safety-manager', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }
}));

// Mock crypto DEK
vi.mock('@/lib/crypto/dek', () => ({
  dekService: {
    decrypt: vi.fn().mockResolvedValue(new Uint8Array(64)),
  }
}));

// Mock trade-intent-state-machine
vi.mock('@/lib/trade-intent-state-machine', () => ({
  TradeIntentStatus: {
    PENDING: 'pending',
    QUEUED: 'queued',
    BUILDING: 'building',
    SIGNING: 'signing',
    SUBMITTED: 'submitted',
    CONFIRMED: 'confirmed',
    FAILED: 'failed',
    CANCELED: 'canceled',
  },
  canTransition: vi.fn().mockReturnValue(true),
  transition: vi.fn(),
  isTerminal: vi.fn().mockReturnValue(false),
}));

// Import after mocks
const { HeliusSender, sendHeliusTransaction } = await import('@/services/helius/sender');

describe('HeliusSender', () => {
  let sender: InstanceType<typeof HeliusSender>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    sender = new HeliusSender() as InstanceType<typeof HeliusSender>;
  });

  // Initialization

  it('should initialize with correct RPC URL', () => {
    expect((sender as any).connection).toBeDefined();
  });

  it('should initialize with custom RPC URL', () => {
    const customSender = new HeliusSender('https://custom.rpc');
    expect((customSender as any).connection).toBeDefined();
  });

  it('should initialize with trade intent ID', () => {
    const intentSender = new HeliusSender(undefined, 42);
    expect(intentSender).toBeDefined();
  });

  // getRecentBlockhash

  it('should get recent blockhash', async () => {
    const result = await sender.getRecentBlockhash();
    expect(result).toHaveProperty('blockhash');
    expect(result).toHaveProperty('feeCalculator');
    expect(result.blockhash).toBe('test-blockhash');
  });

  it('should throw on blockhash fetch failure', async () => {
    vi.spyOn((sender as any).connection, 'getLatestBlockhash').mockRejectedValueOnce(
      new Error('RPC error')
    );
    await expect(sender.getRecentBlockhash()).rejects.toThrow('Failed to get recent blockhash');
  });

  it('should handle null fee calculator in blockhash', async () => {
    vi.spyOn((sender as any).connection, 'getLatestBlockhash').mockResolvedValueOnce({
      blockhash: 'no-fee-blockhash',
      feeCalculator: null
    } as any);

    const result = await sender.getRecentBlockhash();
    expect(result.blockhash).toBe('no-fee-blockhash');
    expect(result.feeCalculator).toEqual({ lamportsPerSignature: 5000 });
  });

  // getPriorityFeeQuote

  it('should get priority fee quote', async () => {
    const fee = await sender.getPriorityFeeQuote();
    expect(typeof fee).toBe('number');
    expect(fee).toBeGreaterThan(0);
  });

  it('should return default fee when HELIUS_API_KEY is not set', async () => {
    const { getEnv } = await import('@/lib/config');
    vi.mocked(getEnv).mockReturnValueOnce({
      HELIUS_API_KEY: undefined,
      SOLANA_RPC_URL: 'https://test.rpc',
      PHANTOM_SOL_ADDRESS: 'test-sol-address',
      PHANTOM_USDC_ADDRESS: 'test-usdc-address',
    } as any);

    const noKeySender = new HeliusSender();
    const fee = await noKeySender.getPriorityFeeQuote();
    expect(fee).toBe(1000);
  });

  // sendTransaction

  it('should handle sendTransaction with retry logic', async () => {
    const mockTransaction = new (await import('@solana/web3.js')).VersionedTransaction({} as any);
    const result = await sender.sendTransaction(mockTransaction, {
      tradeIntentId: 1,
    });

    expect(result).toHaveProperty('signature');
    expect(result).toHaveProperty('confirmed');
  });

  it('should return confirmed: true on successful send', async () => {
    const mockTransaction = new (await import('@solana/web3.js')).VersionedTransaction({} as any);
    const result = await sender.sendTransaction(mockTransaction, {
      tradeIntentId: 1,
    });

    expect(result.confirmed).toBe(true);
    expect(result.signature).toBe('test-signature');
  });

  it('should skip state machine updates when skipStateUpdates is true', async () => {
    const { tradeIntentService } = await import('@/services/trade-intent-service');
    const updateSpy = vi.spyOn(tradeIntentService, 'updateStatus');
    const mockTransaction = new (await import('@solana/web3.js')).VersionedTransaction({} as any);

    await sender.sendTransaction(mockTransaction, {
      tradeIntentId: 1,
      skipStateUpdates: true,
    });

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('should update state machine on successful confirmation', async () => {
    const { tradeIntentService } = await import('@/services/trade-intent-service');
    const updateSpy = vi.spyOn(tradeIntentService, 'updateStatus');
    const mockTransaction = new (await import('@solana/web3.js')).VersionedTransaction({} as any);

    await sender.sendTransaction(mockTransaction, {
      tradeIntentId: 1,
    });

    expect(updateSpy).toHaveBeenCalled();
  });

  it('should retry on transient failures', async () => {
    let callCount = 0;
    const txSender = new HeliusSender();
    vi.spyOn((txSender as any).connection, 'sendTransaction').mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error('Transient error'));
      }
      return Promise.resolve('retry-success');
    });

    const mockTransaction = new (await import('@solana/web3.js')).VersionedTransaction({} as any);
    const result = await txSender.sendTransaction(mockTransaction, {
      tradeIntentId: 5,
    });

    expect(callCount).toBe(3);
    expect(result.confirmed).toBe(true);
  }, 30000);

  it('should return error after all retries exhausted', async () => {
    const txSender = new HeliusSender();
    vi.spyOn((txSender as any).connection, 'sendTransaction').mockRejectedValue(
      new Error('Persistent error')
    );

    const mockTransaction = new (await import('@solana/web3.js')).VersionedTransaction({} as any);
    const result = await txSender.sendTransaction(mockTransaction, {
      tradeIntentId: 6,
    });

    expect(result.confirmed).toBe(false);
    expect(result.error).toContain('Transaction failed after');
  }, 60000);

  // simulateTransaction

  it('should simulate transaction', async () => {
    const mockTransaction = new (await import('@solana/web3.js')).VersionedTransaction({} as any);
    const result = await sender.simulateTransaction(mockTransaction);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('priorityFee');
  });

  it('should return success: true on successful simulation', async () => {
    const mockTransaction = new (await import('@solana/web3.js')).VersionedTransaction({} as any);
    const result = await sender.simulateTransaction(mockTransaction);
    expect(result.success).toBe(true);
  });

  it('should return error when simulation throws', async () => {
    const simSender = new HeliusSender();
    vi.spyOn((simSender as any).connection, 'simulateTransaction').mockRejectedValueOnce(
      new Error('Simulation error')
    );

    const mockTransaction = new (await import('@solana/web3.js')).VersionedTransaction({} as any);
    const result = await simSender.simulateTransaction(mockTransaction);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Simulation error');
  });

  it('should return error when simulation result has error', async () => {
    const simSender = new HeliusSender();
    vi.spyOn((simSender as any).connection, 'simulateTransaction').mockResolvedValueOnce({
      error: { message: 'Custom error' },
      value: { err: 'failed' }
    } as any);

    const mockTransaction = new (await import('@solana/web3.js')).VersionedTransaction({} as any);
    const result = await simSender.simulateTransaction(mockTransaction);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  // Circuit Breaker

  it('should handle circuit breaker', async () => {
    const failingSender = new HeliusSender();
    vi.spyOn((failingSender as any).connection, 'sendTransaction').mockRejectedValue(
      new Error('Network error')
    );
    vi.spyOn(HeliusSender.prototype as any, 'confirmTransaction').mockResolvedValue(false);

    const mockTransaction = new (await import('@solana/web3.js')).VersionedTransaction({} as any);

    for (let i = 0; i < 5; i++) {
      await failingSender.sendTransaction(mockTransaction, {
        tradeIntentId: 999,
      });
    }

    const result = await failingSender.sendTransaction(mockTransaction, {
      tradeIntentId: 999,
    });

    expect(result.confirmed).toBe(false);
    expect(result.error).toContain('Circuit breaker tripped');
  }, 60000);

  // Confirmation Logic

  it('should return false on transaction confirmation timeout', async () => {
    const timeoutSender = new HeliusSender();
    vi.spyOn((timeoutSender as any).connection, 'getConfirmedTransaction').mockResolvedValue(null);

    const mockTransaction = new (await import('@solana/web3.js')).VersionedTransaction({} as any);
    const result = await timeoutSender.sendTransaction(mockTransaction, {
      tradeIntentId: 7,
    });

    expect(result.confirmed).toBe(false);
  }, 60000);

  // sendHeliusTransaction

  it('sendHeliusTransaction: should build, sign, simulate, and send', async () => {
    const mockTransaction = new (await import('@solana/web3.js')).VersionedTransaction({} as any);
    const result = await sendHeliusTransaction([mockTransaction as any], {
      tradeIntentId: 100,
    });

    expect(result).toHaveProperty('signature');
    expect(result).toHaveProperty('confirmed');
  });

  it('sendHeliusTransaction: should return error object on top-level failure', async () => {
    const result = await sendHeliusTransaction([], {
      tradeIntentId: 101,
      skipSimulation: true,
    });

    expect(result).toHaveProperty('signature');
    expect(result).toHaveProperty('confirmed');
  });

  // Edge Cases

  it('should handle missing trade intent gracefully', async () => {
    const mockTransaction = new (await import('@solana/web3.js')).VersionedTransaction({} as any);
    const result = await sender.sendTransaction(mockTransaction, {
      // No tradeIntentId
    });

    expect(result).toHaveProperty('signature');
    expect(result).toHaveProperty('confirmed');
  });
});