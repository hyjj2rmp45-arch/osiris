import { create } from 'zustand';

type SetFn<S> = (partial: Partial<S>, replace?: boolean) => void;
const typedCreate = create as unknown as <S>(init: (set: SetFn<S>) => S) => (() => S) & { getState: () => S; setState: SetFn<S> };

export interface AuthUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: 'user' | 'support' | 'admin';
  tier: 'monthly' | 'lifetime';
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

export const useAuthStore = typedCreate<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  login: (user) =>
    set({ isAuthenticated: true, user }),
  logout: () =>
    set({ isAuthenticated: false, user: null }),
  refresh: async () => {
    set({ isAuthenticated: false, user: null });
  },
}));