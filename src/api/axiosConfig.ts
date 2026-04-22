import { apiCall } from '@/services/api';

export const API_BASE = "https://saathiai.org/api";

export function buildUrl(endpoint: string): string {
  if (endpoint.startsWith('/api')) return `https://saathiai.org${endpoint}`;
  return `${API_BASE}${endpoint}`;
}

/**
 * Authenticated fetch wrapper used by legacy callers that still import from config/api.
 * Always attaches Authorization: Bearer <token> from SecureStore.
 */
export const safeFetch = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  try {
    return await apiCall(endpoint, options);
  } catch (error) {
    console.warn('[safeFetch] ERROR:', error);
    return null;
  }
};


