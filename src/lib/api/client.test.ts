import { describe, it, expect, vi } from 'vitest';
import { createApiClient } from './client';

describe('API Client', () => {
  it('should initialize with base URL and headers', () => {
    const client = createApiClient({ baseUrl: '/api', headers: { 'X-Test': 'test' } });
    expect(client).toBeDefined();
  });

  it('should throw error on non-ok response', async () => {
    // Mock fetch globally
    const originalFetch = global.fetch;
    global.fetch = vi.fn(() => Promise.resolve(new Response(null, { status: 401, statusText: 'Unauthorized' })));

    const client = createApiClient();
    await expect(client.get<{}>('/test')).rejects.toThrow('API error: 401 Unauthorized');

    global.fetch = originalFetch;
  });

  it('should return data on ok response', async () => {
    const mockData = { id: 1, name: 'test' };
    const originalFetch = global.fetch;
    global.fetch = vi.fn(() => Promise.resolve(new Response(JSON.stringify(mockData), { status: 200 })));

    const client = createApiClient();
    const data = await client.get<typeof mockData>('/test');
    expect(data).toEqual(mockData);

    global.fetch = originalFetch;
  });
});