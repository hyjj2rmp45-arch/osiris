import { describe, it, expect } from 'vitest';
import { PriceFeedService } from '@/services/prices/feed';

describe('PriceFeedService', () => {
  it('returns null when all sources fail', async () => {
    const service = new PriceFeedService();
    const price = await service.getPrice('unknown-mint');
    expect(price).toBeNull();
  });
});
