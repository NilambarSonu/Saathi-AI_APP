/**
 * axiosConfig.ts  — React Native / Expo APK
 *
 * Single Axios instance with automatic JWT refresh.
 * Copy this file to: src/api/axiosConfig.ts in your APK project.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

export const API_BASE_URL = 'https://www.saathiai.org';
/** Alias used by src/features/auth/services/auth.ts */
export const BASE_URL = API_BASE_URL;

const TOKEN_KEY   = 'saathi_auth_token';
const REFRESH_KEY = 'saathi_refresh_token';

// ─── In-memory cache ──────────────────────────────────────────────────────────
let _cachedToken: string | null = null;

/**
 * Called by services/api.ts saveAuthTokens() after login so the in-memory
 * cache stays in sync with AsyncStorage without waiting for a new request.
 */
export function invalidateCache(): void {
  _cachedToken = null;
}

async function persistToken(token: string): Promise<void> {
  _cachedToken = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

async function getToken(): Promise<string | null> {
  if (_cachedToken) {
    return _cachedToken;
  }
  const stored = await AsyncStorage.getItem(TOKEN_KEY);
  if (stored) {
    _cachedToken = stored;
    console.log('[API] Token loaded from AsyncStorage');
  }
  return stored;
}

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    'x-client-type': 'mobile',
  },
});

// ─── Request interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    const token = await getToken();
    if (token) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log('[API] Authorization header attached');
    } else {
      console.warn('[API] No token available — request sent without Authorization');
    }
  } catch {
    // ignore
  }
  return config;
});

// ─── Response interceptor — 401 auto-refresh ─────────────────────────────────
let _isRefreshing = false;
let _refreshQueue: Array<(token: string | null) => void> = [];

function drainRefreshQueue(token: string | null) {
  _refreshQueue.forEach((cb) => cb(token));
  _refreshQueue = [];
}

api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`[API] Success: ${response.config.method?.toUpperCase()} ${response.config.url} [${response.status}]`);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };

    console.error(`[API] Error: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} [${error.response?.status || 'Network/Timeout'}]`, error.message);

    if (error.response?.status !== 401 || originalRequest._retried) {
      return Promise.reject(error);
    }

    // Log the exact server response body so we can see WHY it rejected us
    const responseBody = error.response?.data;
    const route = originalRequest?.url ?? '(unknown)';
    console.warn(`[API] 401 on ${route} — server response:`, JSON.stringify(responseBody));
    originalRequest._retried = true;

    // ── Try to refresh the access token ──────────────────────────────────────
    if (_isRefreshing) {
      return new Promise((resolve, reject) => {
        _refreshQueue.push((newToken) => {
          if (!newToken) return reject(error);
          if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
            originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
          } else {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          resolve(api(originalRequest));
        });
      });
    }

    _isRefreshing = true;

    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);

      if (!refreshToken) {
        // ⚠️ No refresh token available.
        // Do NOT wipe the session here — the access token may still be valid
        // and the 401 may be a temporary server-side issue.
        // Just drain the queue with null and reject the original request.
        console.warn('[API] No refresh token stored — cannot refresh. Access token left intact.');
        drainRefreshQueue(null);
        return Promise.reject(error);
      }

      console.log('[API] Calling /api/auth/refresh');

      const { data } = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json', 'x-client-type': 'mobile' } },
      );

      // Handle both { token } and { accessToken } response shapes from the server
      const newAccessToken: string = data.token ?? data.accessToken;
      const newRefreshToken: string | undefined = data.refreshToken;

      if (!newAccessToken || typeof newAccessToken !== 'string') {
        console.error('[API] Refresh endpoint returned no token. Keys:', JSON.stringify(Object.keys(data)));
        throw new Error('Refresh response did not contain a valid access token');
      }

      await persistToken(newAccessToken);
      if (newRefreshToken) {
        await AsyncStorage.setItem(REFRESH_KEY, newRefreshToken);
      }

      console.log('[API] Token refreshed successfully');
      drainRefreshQueue(newAccessToken);

      if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
        originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
      } else {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }
      return api(originalRequest);

    } catch (refreshErr) {
      // Only clear the session if the refresh call itself returned a 401/403
      // (meaning the refresh token is expired/invalid), NOT for missing tokens.
      const refreshStatus = (refreshErr as AxiosError)?.response?.status;
      if (refreshStatus === 401 || refreshStatus === 403) {
        console.error('[API] Refresh token rejected by server — clearing session');
        _cachedToken = null;
        await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY]);
      } else {
        console.error('[API] Refresh call failed (non-auth error) — keeping session intact');
      }
      drainRefreshQueue(null);
      return Promise.reject(refreshErr);
    } finally {
      _isRefreshing = false;
    }
  },
);

export default api;
