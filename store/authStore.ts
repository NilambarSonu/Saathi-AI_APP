import { create } from 'zustand';
import { User } from '../src/features/auth/services/auth';
import { clearAuthTokens, saveAuthTokens, saveUserId } from '../src/core/services/api';

export const TOKEN_KEY = 'saathi_access_token';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),

  clearUser: () => {
    clearAuthTokens().catch(() => {});
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),

  login: (user, token) => {
    if (token) {
      saveAuthTokens(token).catch((error) =>
        console.warn('[AuthStore] Failed to persist access token:', error)
      );
    }

    if (user?.id) {
      saveUserId(user.id).catch(() => {});
    }

    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    clearAuthTokens().catch(() => {});
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },
}));
