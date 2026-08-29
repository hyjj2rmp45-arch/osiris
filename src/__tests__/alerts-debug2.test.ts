import { describe, it, expect, vi } from 'vitest';

const mockAssertSignedIn = vi.fn(() => null);

vi.mock('@/lib/route-auth', () => ({
  assertSignedIn: mockAssertSignedIn,
}));

describe('alerts debug2', () => {
  it('checks mock state', async () => {
    const routeAuth = await import('@/lib/route-auth');
    console.log('assertSignedIn value?', routeAuth.assertSignedIn === mockAssertSignedIn);
    console.log('mock calls?', mockAssertSignedIn.mock.calls.length);
    expect(routeAuth.assertSignedIn).toBe(mockAssertSignedIn);
  });
});
