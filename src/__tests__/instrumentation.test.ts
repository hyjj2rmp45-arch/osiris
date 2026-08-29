import { describe, it, expect, vi, afterEach } from 'vitest';

describe('instrumentation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not throw when imported', async () => {
    const mod = await import('@/instrumentation');
    expect(mod.register).toBeInstanceOf(Function);
    expect(mod.unregister).toBeInstanceOf(Function);
  });
});
