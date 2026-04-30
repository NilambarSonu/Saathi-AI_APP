/**
 * authStore.ts — Paste this into your APK project at: store/authStore.ts
 *
 * KEY FIXES vs old version:
 *  1. TOKEN_KEY = 'saathi_auth_token' — must match axiosConfig.ts
 *  2. Guards against saving undefined tokens (checks res.ok first)
 *  3. Correct error messages shown to the user
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenCache } from '@/utils/tokenCache';
import { saveAuthTokens, clearAuthTokens, getStoredAccessToken } from '@/services/api';

const API_BASE_URL = 'https://www.saathiai.org';
const TOKEN_KEY   = 'saathi_auth_token';   // ← matches axiosConfig.ts TOKEN_KEY
const REFRESH_KEY = 'saathi_refresh_token';
const USER_CACHE_KEY = 'saathi_user_cache'; // ← persists user profile locally

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  location: string | null;
  provider: string;
  profilePicture: string | null;
  preferredLanguage: string;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: 'google' | 'facebook' | 'x') => Promise<void>;
  handleOAuthCallback: (url: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setSession: (user: any, token: string, refreshToken?: string | null) => Promise<void>;
  /** Merge/update the in-memory user object without affecting auth tokens */
  setUser: (user: AuthUser | null) => void;
  /** Clear user state (alias for a soft client-side logout) */
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Listen for unrecoverable 401s from the API to auto-logout
  tokenCache.onAuthFailure(() => {
    console.log('[AuthStore] Auto-logout triggered by API 401');
    get().logout();
  });

  return {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  // ─── Restore session on app start ───────────────────────────────────────────
  initialize: async () => {
    set({ isLoading: true });
    try {
      const token = await getStoredAccessToken();
      if (!token) {
        set({ isInitialized: true, isLoading: false });
        console.log('[AuthStore] Rehydrated - no token found');
        return;
      }

      // Load locally-cached user profile first (instant, no network)
      let localUser: AuthUser | null = null;
      try {
        const cached = await AsyncStorage.getItem(USER_CACHE_KEY);
        if (cached) localUser = JSON.parse(cached);
      } catch { /* ignore */ }

      const res = await fetch(`${API_BASE_URL}/api/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-client-type': 'mobile',
        },
      });

      if (res.ok) {
        const data = await res.json();
        tokenCache.set(token);
        const serverUser = mapUser(data.user);
        // Merge: prefer locally-saved name/location over DB if DB returns null/empty
        // (server may not persist location field correctly)
        const mergedUser: AuthUser = {
          ...serverUser,
          username: serverUser.username || localUser?.username || '',
          location: serverUser.location || localUser?.location || null,
          profilePicture: serverUser.profilePicture || localUser?.profilePicture || null,
        };
        set({ token, user: mergedUser, isAuthenticated: true, isInitialized: true, isLoading: false });
        // Keep local cache in sync
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(mergedUser)).catch(() => {});
        console.log('[AuthStore] Session restored for', mergedUser.username);
      } else {
        await clearAuthTokens();
        tokenCache.clear();
        await AsyncStorage.removeItem(USER_CACHE_KEY).catch(() => {});
        set({ token: null, user: null, isAuthenticated: false, isInitialized: true, isLoading: false });
        console.log('[AuthStore] Stored token invalid, cleared session');
      }
    } catch {
      // Network error — restore from local cache if available
      try {
        const cached = await AsyncStorage.getItem(USER_CACHE_KEY);
        if (cached) {
          const localUser: AuthUser = JSON.parse(cached);
          set({ isInitialized: true, isLoading: false, isAuthenticated: true, user: localUser });
          console.log('[AuthStore] Network error — restored user from local cache');
          return;
        }
      } catch { /* ignore */ }
      set({ isInitialized: true, isLoading: false, isAuthenticated: false });
      console.log('[AuthStore] Network error during init, proceeding unauthenticated');
    }
  },

  // ─── Email / password login ──────────────────────────────────────────────────
  login: async (usernameOrEmail, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-type': 'mobile',
        },
        body: JSON.stringify({ usernameOrEmail, password, client: 'mobile' }),
      });

      const data = await res.json();

      // ✅ Always check res.ok BEFORE reading data.token
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Login failed. Please check your credentials.');
      }

      if (!data.token) {
        throw new Error('Server did not return an access token. Please try again.');
      }

      // ✅ Save to SecureStore and AsyncStorage using api.ts
      await saveAuthTokens(data.token, data.refreshToken);
      tokenCache.set(data.token, data.refreshToken);

      console.log('[AuthStore] Login successful for', data.user?.username);

      const mappedUser = mapUser(data.user);
      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(mappedUser)).catch(() => {});
      set({
        token: data.token,
        user: mappedUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  // ─── Social OAuth ─────────────────────────────────────────────────────────────
  loginWithOAuth: async (provider) => {
    const { Linking } = await import('react-native');
    const path = provider === 'x' ? 'x' : provider;
    const url = `${API_BASE_URL}/api/auth/${path}?redirect_uri=${encodeURIComponent('saathiai://oauth-callback')}`;
    await Linking.openURL(url);
  },

  // ─── Handle deep link after OAuth ─────────────────────────────────────────────
  handleOAuthCallback: async (url: string) => {
    if (!url.includes('oauth-callback')) return;

    set({ isLoading: true, error: null });
    try {
      const queryStart = url.indexOf('?');
      if (queryStart === -1) throw new Error('Invalid OAuth callback URL');
      const params = new URLSearchParams(url.slice(queryStart + 1));

      const token = params.get('token');
      const userId = params.get('userId');

      if (!token || !userId) throw new Error('Missing token or userId in OAuth callback');

      await saveAuthTokens(token);
      tokenCache.set(token);

      const res = await fetch(`${API_BASE_URL}/api/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-client-type': 'mobile',
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      set({ token, user: mapUser(data.user), isAuthenticated: true, isLoading: false, error: null });
      console.log('[AuthStore] OAuth login successful for', data.user?.username);
    } catch (err: any) {
      await clearAuthTokens();
      tokenCache.clear();
      set({ isLoading: false, error: `Social login failed: ${err.message}`, user: null, token: null, isAuthenticated: false });
    }
  },

  // ─── Logout ──────────────────────────────────────────────────────────────────
  logout: async () => {
    await clearAuthTokens();
    tokenCache.clear();
    await AsyncStorage.removeItem(USER_CACHE_KEY).catch(() => {});
    set({ user: null, token: null, isAuthenticated: false, error: null });
    console.log('[AuthStore] Logged out');
  },

  clearError: () => set({ error: null }),

  setSession: async (user, token, refreshToken) => {
    await saveAuthTokens(token, refreshToken || undefined);
    tokenCache.set(token, refreshToken || null);
    const mappedUser = mapUser(user);
    await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(mappedUser)).catch(() => {});
    set({ token, user: mappedUser, isAuthenticated: true, isInitialized: true, isLoading: false, error: null });
  },

  setUser: (user) => {
    set({ user });
    // Persist locally so name/location survive app restart
    if (user) {
      AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user)).catch(() => {});
    }
  },

  clearUser: () => {
    AsyncStorage.removeItem(USER_CACHE_KEY).catch(() => {});
    set({ user: null, token: null, isAuthenticated: false });
  },
};
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mapUser(raw: any): AuthUser {
  return {
    id: raw.id,
    username: raw.username,
    email: raw.email,
    phone: raw.phone ?? null,
    location: raw.location ?? null,
    provider: raw.provider ?? 'local',
    profilePicture: raw.profilePicture ?? raw.profile_picture ?? null,
    preferredLanguage: raw.preferredLanguage ?? raw.preferred_language ?? 'en',
    createdAt: raw.createdAt ?? raw.created_at ?? '',
  };
}
