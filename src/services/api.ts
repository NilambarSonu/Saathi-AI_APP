import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { tokenCache } from '@/utils/tokenCache';

export const API_BASE = 'https://saathiai.org/api';
export const API_HOST = 'https://saathiai.org';
export const API_ROOT = API_BASE;

const TOKEN_KEY = 'saathi_auth_token';
const REFRESH_TOKEN_KEY = 'saathi_refresh_token';
const USER_ID_KEYS = ['user_id', 'userId'] as const;
const LEGACY_TOKEN_KEYS = ['auth_token', 'access_token', 'saathi_access_token', 'saathi_token'] as const;
const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export interface ChatSession {
  id: string;
  title?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastMessageAt?: string | null;
  messageCount?: number | null;
  language?: string | null;
}

export interface ChatSessionMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  sessionId: string;
}

type PendingSoilPayload = { data: Record<string, any>; queuedAt: string };

const PENDING_SOIL_QUEUE_KEY = 'pending_soil_queue_v2';

function normalizeEndpoint(endpoint: string): string {
  if (!endpoint) return '';
  if (endpoint.startsWith('/api/')) return endpoint.slice(4);
  if (endpoint.startsWith('/')) return endpoint;
  return `/${endpoint}`;
}

async function removeKeys(
  storage: { removeItem: (key: string) => Promise<void> },
  keys: readonly string[]
): Promise<void> {
  await Promise.all(keys.map((key) => storage.removeItem(key).catch(() => {})));
}

export async function getStoredAccessToken(): Promise<string | null> {
  const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
  if (secureToken) return secureToken;

  const asyncToken = await AsyncStorage.getItem(TOKEN_KEY);
  if (asyncToken) return asyncToken;

  for (const key of LEGACY_TOKEN_KEYS) {
    const legacySecureToken = await SecureStore.getItemAsync(key);
    if (legacySecureToken) return legacySecureToken;

    const legacyAsyncToken = await AsyncStorage.getItem(key);
    if (legacyAsyncToken) return legacyAsyncToken;
  }

  return null;
}

export async function getStoredRefreshToken(): Promise<string | null> {
  const secureRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (secureRefresh) return secureRefresh;
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function getStoredUserId(): Promise<string | null> {
  for (const key of USER_ID_KEYS) {
    const secureValue = await SecureStore.getItemAsync(key);
    if (secureValue) return secureValue;
  }

  for (const key of USER_ID_KEYS) {
    const asyncValue = await AsyncStorage.getItem(key);
    if (asyncValue) return asyncValue;
  }

  return null;
}

export async function saveAuthTokens(token: string, refreshToken?: string): Promise<void> {
  if (typeof token !== 'string' || token.trim().length === 0) {
    throw new Error('INVALID_AUTH_TOKEN');
  }

  await removeKeys(
    {
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    LEGACY_TOKEN_KEYS
  );
  await SecureStore.setItemAsync(TOKEN_KEY, token);

  await AsyncStorage.setItem(TOKEN_KEY, token);
  await Promise.all(LEGACY_TOKEN_KEYS.map((key) => AsyncStorage.removeItem(key)));

  if (refreshToken) {
    if (typeof refreshToken !== 'string') {
      throw new Error('INVALID_REFRESH_TOKEN');
    }
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export async function saveUserId(userId: string): Promise<void> {
  if (!userId) return;

  await Promise.all(USER_ID_KEYS.map((key) => SecureStore.setItemAsync(key, userId)));
  await Promise.all(USER_ID_KEYS.map((key) => AsyncStorage.setItem(key, userId)));
}

export async function clearAuthTokens(): Promise<void> {
  await removeKeys(
    {
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    [TOKEN_KEY, REFRESH_TOKEN_KEY, ...LEGACY_TOKEN_KEYS, ...USER_ID_KEYS]
  );

  await Promise.all(
    [TOKEN_KEY, REFRESH_TOKEN_KEY, ...LEGACY_TOKEN_KEYS, ...USER_ID_KEYS].map((key) =>
      AsyncStorage.removeItem(key).catch(() => {})
    )
  );
}

export async function apiCall<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getStoredAccessToken();
  const headers = {
    ...JSON_HEADERS,
    'x-client-type': 'mobile',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE}${normalizeEndpoint(endpoint)}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      await clearAuthTokens().catch(() => {});
      tokenCache.triggerAuthFailure();
      throw new Error('UNAUTHORIZED');
    }

    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

export async function fetchSoilHistory<T = any[]>(userId: string): Promise<T> {
  const normalizedUserId = typeof userId === 'string' ? userId.trim() : '';
  if (!normalizedUserId) return [] as T;

  try {
    const payload = await apiCall(`/soil-tests/${encodeURIComponent(normalizedUserId)}`);
    return (payload ?? []) as T;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch soil tests');
  }
}

export async function fetchSoilTestDetail<T = any>(testId: string): Promise<T> {
  if (!testId) throw new Error('Test ID is required');

  try {
    const payload = await apiCall(`/soil-tests/test/${encodeURIComponent(testId)}`);
    return payload as T;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch soil test details');
  }
}

export async function isInternetAvailable(): Promise<boolean> {
  try {
    await apiCall('/health', { method: 'GET' });
    return true;
  } catch {
    return false;
  }
}

export async function getPendingSoilQueue(): Promise<PendingSoilPayload[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SOIL_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function setPendingSoilQueue(queue: PendingSoilPayload[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_SOIL_QUEUE_KEY, JSON.stringify(queue));
}

export const api = {
  chat: async (message: string): Promise<{ response: string }> => {
    return apiCall<{ response: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  getChatSessions: async (): Promise<ChatSession[]> => {
    const data = await apiCall<any>('/chat/sessions');
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.sessions)
        ? data.sessions
        : [];
  },

  createChatSession: async (payload: { title: string; language?: string }): Promise<ChatSession> => {
    const data = await apiCall<any>('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return (data?.session ?? data) as ChatSession;
  },

  deleteChatSession: async (sessionId: string): Promise<void> => {
    await apiCall(`/chat/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
  },

  getChatSessionMessages: async (sessionId: string): Promise<ChatSessionMessage[]> => {
    if (!sessionId) return [];

    const data = await apiCall<any>(`/chat/sessions/${encodeURIComponent(sessionId)}/messages`);
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.messages)
        ? data.messages
        : [];
  },

  uploadSoil: async (data: any): Promise<any> => {
    return apiCall('/analyze-soil-file', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  soilTests: async (
    soilData: Record<string, any>
  ): Promise<{ recommendations: any[]; pricing?: any; queued?: boolean }> => {
    const isOnline = await isInternetAvailable();
    if (!isOnline) {
      const queue = await getPendingSoilQueue();
      queue.push({ data: soilData, queuedAt: new Date().toISOString() });
      await setPendingSoilQueue(queue);
      return { recommendations: [], queued: true };
    }

    return apiCall<{ recommendations: any[]; pricing?: any }>('/soil-tests', {
      method: 'POST',
      body: JSON.stringify(soilData),
    });
  },

  flushSoilQueue: async (): Promise<{ synced: number; pending: number }> => {
    const queue = await getPendingSoilQueue();
    if (!queue.length || !(await isInternetAvailable())) {
      return { synced: 0, pending: queue.length };
    }

    let synced = 0;
    const remaining: PendingSoilPayload[] = [];

    for (const item of queue) {
      try {
        await apiCall('/soil-tests', {
          method: 'POST',
          body: JSON.stringify(item.data),
        });
        synced++;
      } catch {
        remaining.push(item);
      }
    }

    await setPendingSoilQueue(remaining);
    return { synced, pending: remaining.length };
  },
};


