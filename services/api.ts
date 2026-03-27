import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// ─── Constants & Configuration ───────────────────────────────────────────────
export const API_BASE = 'https://saathiai.org';
export const API_ROOT = `${API_BASE}/api`;

const ASYNC_ACCESS_TOKEN_KEY = 'saathi_access_token';
const ASYNC_REFRESH_TOKEN_KEY = 'saathi_refresh_token';
const PENDING_SOIL_QUEUE_KEY = 'pending_soil_queue_v2';

// ─── Network & Timeout Helpers ───────────────────────────────────────────────
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/** Check if internet access is available via a fast ping to the API */
export async function isInternetAvailable(): Promise<boolean> {
  try {
    const probe = await withTimeout(
      fetch(`${API_ROOT}/health`, { method: 'GET' }).catch(() => ({ ok: false })),
      3000
    );
    return (probe as Response).ok !== false; // If backend responds with any status, network is structurally up
  } catch {
    return false;
  }
}

// ─── Authentication Handlers ─────────────────────────────────────────────────
export async function getStoredAccessToken(): Promise<string | null> {
  // Check SecureStore first, fallback to AsyncStorage
  const secureToken = await SecureStore.getItemAsync(ASYNC_ACCESS_TOKEN_KEY);
  if (secureToken) return secureToken;
  return AsyncStorage.getItem(ASYNC_ACCESS_TOKEN_KEY);
}

export async function getStoredRefreshToken(): Promise<string | null> {
  const secureRefresh = await SecureStore.getItemAsync(ASYNC_REFRESH_TOKEN_KEY);
  if (secureRefresh) return secureRefresh;
  return AsyncStorage.getItem(ASYNC_REFRESH_TOKEN_KEY);
}

export async function saveAuthTokens(token: string, refreshToken?: string): Promise<void> {
  if (typeof token !== 'string' || token.trim().length === 0) {
    throw new Error('INVALID_AUTH_TOKEN');
  }

  await SecureStore.setItemAsync(ASYNC_ACCESS_TOKEN_KEY, token);
  await AsyncStorage.setItem(ASYNC_ACCESS_TOKEN_KEY, token);

  if (refreshToken) {
    if (typeof refreshToken !== 'string') {
      throw new Error('INVALID_REFRESH_TOKEN');
    }
    await SecureStore.setItemAsync(ASYNC_REFRESH_TOKEN_KEY, refreshToken);
    await AsyncStorage.setItem(ASYNC_REFRESH_TOKEN_KEY, refreshToken);
  }
}

export async function clearAuthTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ASYNC_ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(ASYNC_REFRESH_TOKEN_KEY);
  await AsyncStorage.removeItem(ASYNC_ACCESS_TOKEN_KEY);
  await AsyncStorage.removeItem(ASYNC_REFRESH_TOKEN_KEY);
}

// ─── Token Refresh Agent ─────────────────────────────────────────────────────
async function generateRefreshToken(): Promise<boolean> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_ROOT}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;
    const data = await response.json();
    
    if (data.token) {
      await saveAuthTokens(data.token, data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Core Universal API Caller ───────────────────────────────────────────────
export async function apiCall<T = any>(
  endpoint: string, // must start with '/' e.g. '/chat'
  options: RequestInit = {}
): Promise<T> {
  const token = await getStoredAccessToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-client-type': 'mobile-app', 
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const url = `${API_ROOT}${endpoint}`;
  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new Error('NETWORK_REQUEST_FAILED');
  }

  // 1. Soft Refresh if token expired
  if (response.status === 401 && token) {
    const refreshed = await generateRefreshToken();
    if (refreshed) {
      const newToken = await getStoredAccessToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      try {
        response = await fetch(url, { ...options, headers });
      } catch {
        throw new Error('NETWORK_REQUEST_FAILED');
      }
    } else {
      await clearAuthTokens();
      throw new Error('SESSION_EXPIRED');
    }
  }

  // 2. Error mapping 
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  // 3. Prevent crashing on empty response (204 No Content)
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }

  return response.json();
}

/**
 * Fetch soil history using the same user-scoped query pattern as live web.
 */
export async function fetchSoilHistory<T = any[]>(userId: string): Promise<T> {
  const normalizedUserId = typeof userId === 'string' ? userId.trim() : '';
  if (!normalizedUserId) return [] as T;

  const token = await getStoredAccessToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-client-type': 'mobile-app',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const endpoints = [
    `${API_BASE}/api/soil-tests?userId=${encodeURIComponent(normalizedUserId)}`,
    `${API_BASE}/api/soil-tests/${encodeURIComponent(normalizedUserId)}`,
    `${API_BASE}/api/soil-tests`,
  ];

  let lastError = 'Failed to fetch soil tests';

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        lastError = `Failed to fetch soil tests (HTTP ${res.status})`;
        continue;
      }

      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('application/json')) {
        const raw = await res.text();
        lastError = `Soil history endpoint returned non-JSON (${contentType || 'unknown'})`;
        console.warn('[fetchSoilHistory] Non-JSON response from', url, raw.slice(0, 200));
        continue;
      }

      const payload = await res.json();

      if (Array.isArray(payload)) {
        return payload as T;
      }
      if (Array.isArray(payload?.data)) {
        return payload.data as T;
      }
      if (Array.isArray(payload?.tests)) {
        return payload.tests as T;
      }

      return [] as T;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Failed to fetch soil tests';
    }
  }

  throw new Error(lastError);
}

// ─── Offline Queue Syncing ───────────────────────────────────────────────────
type PendingSoilPayload = { data: Record<string, any>; queuedAt: string };

export async function getPendingSoilQueue(): Promise<PendingSoilPayload[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SOIL_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function setPendingSoilQueue(queue: PendingSoilPayload[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_SOIL_QUEUE_KEY, JSON.stringify(queue));
}

// ─── Endpoints ───────────────────────────────────────────────────────────────
export const api = {
  /**
   * Send a chat message to the internal AI system.
   * Mobile App → Backend API → AI Waterfall
   */
  chat: async (message: string): Promise<{ response: string }> => {
    return apiCall<{ response: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  /**
   * Upload and analyze attachments (JSON, images)
   */
  uploadSoil: async (data: any): Promise<any> => {
    return apiCall('/analyze-soil-file', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Process native BLE soil packets -> Backend recommendation engine
   */
  soilTests: async (soilData: Record<string, any>): Promise<{ recommendations: any[], pricing?: any, queued?: boolean }> => {
    const isOnline = await isInternetAvailable();
    
    if (!isOnline) {
      // Offline fallback: store request locally
      const queue = await getPendingSoilQueue();
      queue.push({ data: soilData, queuedAt: new Date().toISOString() });
      await setPendingSoilQueue(queue);
      return { recommendations: [], queued: true };
    }

    return apiCall<{ recommendations: any[], pricing?: any }>('/soil-tests', {
      method: 'POST',
      body: JSON.stringify(soilData),
    });
  },

  /**
   * Flush all generated soil data that were saved locally when offline
   */
  flushSoilQueue: async (): Promise<{ synced: number, pending: number }> => {
    const queue = await getPendingSoilQueue();
    if (!queue.length || !(await isInternetAvailable())) {
      return { synced: 0, pending: queue.length };
    }

    let synced = 0;
    const remaining: PendingSoilPayload[] = [];
    
    for (const item of queue) {
      try {
        await apiCall('/soil-tests', { method: 'POST', body: JSON.stringify(item.data) });
        synced++;
      } catch (err) {
        remaining.push(item);
      }
    }

    await setPendingSoilQueue(remaining);
    return { synced, pending: remaining.length };
  }
};
