import { apiCall, saveAuthTokens, clearAuthTokens, API_BASE } from './api';
import * as SecureStore from 'expo-secure-store';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  location: string | null;
  profile_picture: string | null;
  preferred_language: string;
  provider: string;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

/**
 * Login with email/username + password
 * Sends client: 'mobile' so backend returns JWT instead of session cookie
 */
export async function loginWithCredentials(
  usernameOrEmail: string,
  password: string
): Promise<AuthResponse> {
  const data = await apiCall<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      // Backend currently expects camelCase "usernameOrEmail"
      usernameOrEmail,
      password,
      client: 'mobile',          // ← critical — tells backend to return JWT
    }),
  });

  // Save tokens to device secure storage
  await saveAuthTokens(data.token, data.refreshToken);
  return data;
}

/**
 * Register new account
 */
export async function registerAccount(params: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<{ success: boolean; email: string; requiresOTP: boolean }> {
  return apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      username: params.name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).slice(2, 6),
      email: params.email,
      phone: params.phone,
      password: params.password,
      client: 'mobile',
    }),
  });
}

/**
 * Verify OTP — returns JWT tokens on success
 * This is what actually logs the user in after registration
 */
export async function verifyOTP(
  email: string,
  otp: string
): Promise<AuthResponse> {
  const data = await apiCall<AuthResponse>('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      email,
      otp,
      client: 'mobile',
    }),
  });

  await saveAuthTokens(data.token, data.refreshToken);
  return data;
}

/**
 * Resend OTP
 */
export async function resendOTP(email: string): Promise<{ success: boolean }> {
  return apiCall('/api/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email, client: 'mobile' }),
  });
}

/**
 * Logout — clear tokens locally + invalidate session on server
 */
export async function logout(): Promise<void> {
  try {
    await apiCall('/api/auth/logout', { method: 'POST' });
  } catch {
    // Even if server logout fails, clear local tokens
  } finally {
    await clearAuthTokens();
  }
}

/**
 * Check if user is still logged in (token exists and is valid)
 * Call this on app startup to decide where to navigate
 */
export async function checkAuthStatus(): Promise<User | null> {
  const token = await SecureStore.getItemAsync('saathi_access_token');
  if (!token) return null;

  try {
    const data = await apiCall<{ user: User }>('/api/auth/me');
    return data.user;
  } catch (err) {
    if ((err as Error).message === 'SESSION_EXPIRED') {
      return null; // tokens cleared by apiCall, navigate to login
    }
    return null;
  }
}

/**
 * Register device for push notifications
 */
export async function registerDevice(params: {
  expo_push_token: string;
  device_type: 'ios' | 'android';
  device_name?: string;
}): Promise<void> {
  await apiCall('/api/users/device', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
