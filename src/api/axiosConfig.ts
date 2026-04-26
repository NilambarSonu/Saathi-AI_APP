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

export const API_BASE_URL = 'https://saathiai.org';
/** Alias used by src/features/auth/services/auth.ts */
export const BASE_URL = API_BASE_URL;

const TOKEN_KEY   = 'saathi_auth_token';
const REFRESH_KEY = 'saathi_refresh_token';

// ─── In-memory cache ──────────────────────────────────────────────────────────
let _cachedToken: string | null = null;

async function persistToken(token: string): Promise<void> {
  _cachedToken = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
  console.log('[API] Token persisted to AsyncStorage and in-memory cache');
}

async function getToken(): Promise<string | null> {
  if (_cachedToken) {
    console.log('[API] Token from in-memory cache');
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
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[API] Authorization header attached');
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
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };

    if (error.response?.status !== 401 || originalRequest._retried) {
      return Promise.reject(error);
    }

    const route = originalRequest?.url ?? '(unknown)';
    console.warn(`[API] 401 on ${route} — attempting token refresh`);
    originalRequest._retried = true;

    if (_isRefreshing) {
      return new Promise((resolve, reject) => {
        _refreshQueue.push((newToken) => {
          if (!newToken) return reject(error);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(originalRequest));
        });
      });
    }

    _isRefreshing = true;
    console.log('[API] Calling /api/auth/refresh');

    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
      if (!refreshToken) throw new Error('No refresh token stored');

      const { data } = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json', 'x-client-type': 'mobile' } },
      );

      // DEBUG: log refresh response shape to verify server field name
      console.log('[API] Refresh response keys:', JSON.stringify(Object.keys(data)));
      console.log('[API] data.token =', data.token, '| data.accessToken =', data.accessToken);

      // Handle both { token } and { accessToken } response shapes from the server
      const newAccessToken: string = data.token ?? data.accessToken;
      const newRefreshToken: string | undefined = data.refreshToken;

      if (!newAccessToken || typeof newAccessToken !== 'string') {
        console.error('[API] Refresh endpoint returned no token. Response keys:', JSON.stringify(Object.keys(data)));
        throw new Error('Refresh response did not contain a valid access token');
      }

      await persistToken(newAccessToken);
      if (newRefreshToken) {
        await AsyncStorage.setItem(REFRESH_KEY, newRefreshToken);
      }

      console.log('[API] Token refreshed successfully');
      drainRefreshQueue(newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshErr) {
      console.error('[API] Token refresh failed — clearing session');
      _cachedToken = null;
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY]);
      drainRefreshQueue(null);
      return Promise.reject(refreshErr);
    } finally {
      _isRefreshing = false;
    }
  },
);

export default api;
