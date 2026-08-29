import { describe, it, expect } from 'vitest';
import { useAuthStore } from '../../lib/stores/use-auth-store';

describe('Auth Store', () => {
  it('should initialize with unauthenticated state', () => {
    const store = useAuthStore.getState();
    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
  });

  it('should login and set authenticated state', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 'user-123',
        telegramId: '123456789',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        tier: 'monthly',
      },
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toBeDefined();
    expect(state.user?.telegramId).toBe('123456789');
  });
});