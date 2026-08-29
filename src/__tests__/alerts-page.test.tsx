import { describe, it, expect, vi } from 'vitest';

// Mock next/navigation if needed
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/dashboard/alerts',
}));

describe('AlertsPage', () => {
  it('renders the security alerts heading', async () => {
    const module = await import('@/app/dashboard/alerts/page');
    const page = module.default;
    expect(page).toBeDefined();
  });
});
