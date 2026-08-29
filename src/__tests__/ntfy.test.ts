import { describe, it, expect, vi, afterEach } from 'vitest';
import { postNtfy } from '@/lib/ntfy';

describe('postNtfy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts the first alert immediately', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response() as any);

    await postNtfy('Test', 'first message', 'error,test');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    expect((init as any).method).toBe('POST');
    expect((init as any).body).toBe('first message');
  });

  it('appends context to the body when provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response() as any);

    await postNtfy('Test', 'error msg', 'error,test', {
      requestId: 'req-1',
      route: '/api/x',
      method: 'POST',
      userId: 'u1',
      walletId: 'w1',
      ip: '1.2.3.4',
    } as any);

    const [, init] = fetchSpy.mock.calls[0];
    expect((init as any).body).toContain('error msg');
    expect((init as any).body).toContain('/api/x');
    expect((init as any).body).toContain('userId=u1');
  });
});
