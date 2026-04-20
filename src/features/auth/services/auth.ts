import { apiCall, saveAuthTokens, clearAuthTokens } from '../../../core/services/api';
import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

export interface User {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string | null;
  location?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
  profile_picture?: string | null;
  profile_image?: string | null;
  preferred_language?: string;
  provider?: string;
  created_at?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function normalizeUser(raw: any): User {
  const id = pickString(raw?.id, raw?._id, raw?.userId) || '';
  const name = pickString(raw?.name, raw?.full_name, raw?.displayName);
  const username = pickString(raw?.username, raw?.handle, raw?.user_name);
  const email = pickString(raw?.email, raw?.emailAddress);
  const avatar = pickString(raw?.avatar_url, raw?.profile_picture, raw?.profile_image, raw?.picture);

  return {
    id,
    name,
    username,
    email,
    phone: pickString(raw?.phone, raw?.mobile) ?? null,
    location: pickString(raw?.location, raw?.address) ?? null,
    avatar_url: avatar ?? null,
    profile_picture: pickString(raw?.profile_picture, raw?.avatar_url, raw?.profile_image, raw?.picture) ?? null,
    profile_image: pickString(raw?.profile_image, raw?.avatar_url, raw?.profile_picture, raw?.picture) ?? null,
    preferred_language: pickString(raw?.preferred_language, raw?.language) || 'en',
    provider: pickString(raw?.provider) || 'local',
    created_at: pickString(raw?.created_at, raw?.createdAt) || new Date().toISOString(),
  };
}

function normalizeAuthResponse(raw: any): AuthResponse {
  const token = pickString(
    raw?.token,
    raw?.accessToken,
    raw?.access_token,
    raw?.data?.token,
    raw?.data?.accessToken,
    raw?.data?.access_token
  );

  if (!token) {
    throw new Error('INVALID_AUTH_TOKEN');
  }

  const refreshToken = pickString(
    raw?.refreshToken,
    raw?.refresh_token,
    raw?.data?.refreshToken,
    raw?.data?.refresh_token
  ) ?? '';

  const userRaw = raw?.user ?? raw?.data?.user;
  if (!userRaw) {
    throw new Error('INVALID_AUTH_USER');
  }

  const user = normalizeUser(userRaw);
  if (!user.id) throw new Error('INVALID_AUTH_USER');

  return {
    success: raw?.success ?? true,
    token,
    refreshToken,
    expiresIn: Number(raw?.expiresIn ?? raw?.expires_in ?? raw?.data?.expiresIn ?? 0),
    user,
  };
}

/**
 * Login with email/username + password
 * Sends client: 'mobile' so backend returns JWT instead of session cookie
 */
export async function loginWithCredentials(
  usernameOrEmail: string,
  password: string
): Promise<AuthResponse> {
  const data = await apiCall<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      // Backend currently expects camelCase "usernameOrEmail"
      usernameOrEmail,
      password,
      client: 'mobile',          // ← critical — tells backend to return JWT
    }),
  });

  const normalized = normalizeAuthResponse(data);

  // Save tokens to device secure storage
  await saveAuthTokens(normalized.token, normalized.refreshToken);
  return normalized;
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
  return apiCall('/auth/register', {
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
  const data = await apiCall<any>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      email,
      otp,
      client: 'mobile',
    }),
  });

  const normalized = normalizeAuthResponse(data);
  await saveAuthTokens(normalized.token, normalized.refreshToken);
  return normalized;
}

/**
 * Resend OTP
 */
export async function resendOTP(email: string): Promise<{ success: boolean }> {
  return apiCall('/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email, client: 'mobile' }),
  });
}

/**
 * Logout — clear tokens locally + invalidate session on server
 */
export async function logout(): Promise<void> {
  try {
    await apiCall('/auth/logout', { method: 'POST' });
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
    // Backend contract: GET /api/user — returns current user profile
    const data = await apiCall<any>('/user');
    // Response may be the user object directly or wrapped
    const userRaw = data?.user ?? data;
    return normalizeUser(userRaw);
  } catch (err) {
    if ((err as Error).message === 'SESSION_EXPIRED') {
      return null; // tokens cleared by apiCall, navigate to login
    }
    return null;
  }
}

export async function loginWithSocialProvider(provider: 'google' | 'facebook' | 'x' | 'twitter'): Promise<AuthResponse> {
  const providerPath = provider === 'twitter' ? 'x' : provider;
  
  const redirectUri = "saathiai://auth/callback";
  
  // Force account selection for Google
  let authUrl = `https://saathiai.org/api/auth/${providerPath}?redirect_uri=${encodeURIComponent(redirectUri)}`;
  if (provider === 'google') {
    authUrl += '&prompt=select_account';
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (result.type !== 'success' || !result.url) {
    throw new Error('SOCIAL_AUTH_CANCELLED');
  }

  // Use expo-linking for more robust parsing
  const parsed = Linking.parse(result.url);
  const query = parsed.queryParams || {};

  // Extract token and userId from deep link query params
  const token = pickString(query.token, query.accessToken, query.access_token);
  const refreshToken = pickString(query.refreshToken, query.refresh_token);
  const userId = pickString(query.userId, query.user_id, query.id);
  const error = pickString(query.error, query.message);

  if (error) {
    throw new Error(error);
  }

  if (!token) {
    throw new Error('SOCIAL_AUTH_TOKEN_MISSING');
  }

  // Store token securely before fetching profile
  await saveAuthTokens(token, refreshToken || '');

  // Also persist userId if provided in the deep link
  if (userId) {
    await SecureStore.setItemAsync('saathi_user_id', userId);
  }

  // Fetch user profile from GET /api/user using the stored token
  const user = await checkAuthStatus();
  if (!user) {
    throw new Error('SOCIAL_AUTH_USER_MISSING');
  }

  return {
    success: true,
    token,
    refreshToken: refreshToken || '',
    expiresIn: 0,
    user,
  };
}

/**
 * Specialized Google login function (v2 patterns)
 */
export async function loginWithGoogle(): Promise<AuthResponse> {
  return loginWithSocialProvider('google');
}

/**
 * Register device for push notifications
 */
export async function registerDevice(params: {
  expo_push_token: string;
  device_type: 'ios' | 'android';
  device_name?: string;
}): Promise<void> {
  await apiCall('/users/device', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
