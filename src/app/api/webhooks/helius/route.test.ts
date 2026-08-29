import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/webhooks/helius/route';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

vi.mock('@/lib/route-auth', () => ({
  assertSignedIn: vi.fn(() => null),
}));

vi.mock('@/lib/ntfy', () => ({
  postNtfy: vi.fn(),
}));

vi.mock('@/lib/request-context', () => ({
  extractRequestContext: vi.fn(() => ({ requestId: 'test-req-id' })),
}));

vi.mock('@/lib/circuit-breaker', () => ({
  CircuitBreaker: vi.fn().mockImplementation(function () {
    return {
      fire: vi.fn(),
      isEngaged: vi.fn(() => false),
    };
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn(async () => null),
    setEx: vi.fn(async () => {}),
  },
}));

const TEST_SECRET = 'test-webhook-secret';
process.env.WEBHOOK_SECRET = TEST_SECRET;

function signPayload(payload: string): string {
  return crypto.createHmac('sha256', TEST_SECRET).update(payload).digest('hex');
}

describe('Helius Webhook Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when signature is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/webhooks/helius', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('should return 401 when signature is invalid', async () => {
    const payload = JSON.stringify({
      signature: 'test-signature',
      slot: 123456789,
      timestamp: Date.now() - 10 * 60 * 1000,
      events: [],
    });

    const request = new NextRequest('http://localhost:3000/api/webhooks/helius', {
      method: 'POST',
      headers: {
        'x-signature': 'invalid-hex-signature',
      },
      body: payload,
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should return 401 when timestamp is outside tolerance', async () => {
    const payload = JSON.stringify({
      signature: 'test-signature',
      slot: 123456789,
      timestamp: Date.now() - 10 * 60 * 1000,
      nonce: 'test-nonce-1',
      events: [],
    });

    const request = new NextRequest('http://localhost:3000/api/webhooks/helius', {
      method: 'POST',
      headers: {
        'x-signature': signPayload(payload),
      },
      body: payload,
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});