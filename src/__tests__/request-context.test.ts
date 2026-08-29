import { describe, it, expect } from 'vitest';
import { extractRequestContext, formatContext } from '@/lib/request-context';

describe('extractRequestContext', () => {
  it('extracts request id, route, method, and optional params', () => {
    const req = {
      url: 'http://localhost/api/test?userId=42&walletId=abc',
      method: 'POST',
      headers: new Map([
        ['x-request-id', 'req-1'],
        ['x-forwarded-for', '1.2.3.4'],
      ]),
      get(name: string) {
        return this.headers.get(name) || null;
      },
    };

    const ctx = extractRequestContext(req as any);
    expect(ctx.requestId).toBe('req-1');
    expect(ctx.route).toBe('/api/test');
    expect(ctx.method).toBe('POST');
    expect(ctx.userId).toBe('42');
    expect(ctx.walletId).toBe('abc');
    expect(ctx.ip).toBe('1.2.3.4');
  });

  it('falls back to random request id and anonymous values', () => {
    const req = {
      url: 'http://localhost/api/other',
      method: 'GET',
      headers: new Map(),
      get(name: string) {
        return this.headers.get(name) || null;
      },
    };

    const ctx = extractRequestContext(req as any);
    expect(ctx.requestId).toBeTruthy();
    expect(ctx.userId).toBeUndefined();
    expect(ctx.walletId).toBeUndefined();
    expect(ctx.ip).toBeUndefined();
  });
});

describe('formatContext', () => {
  it('formats context into a single line', () => {
    const ctx = {
      requestId: 'abc',
      route: '/api/x',
      method: 'POST',
      userId: 'u1',
      walletId: 'w1',
      ip: '127.0.0.1',
    };
    const text = formatContext(ctx as any);
    expect(text).toContain('[abc]');
    expect(text).toContain('/api/x');
    expect(text).toContain('POST');
    expect(text).toContain('userId=u1');
    expect(text).toContain('wallet=w1');
    expect(text).toContain('ip=127.0.0.1');
  });
});
