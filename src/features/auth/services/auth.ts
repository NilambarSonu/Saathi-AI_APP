import * as WebBrowser from 'expo-web-browser';
import {
  apiCall,
  clearAuthTokens,
  getStoredAccessToken,
  saveAuthTokens,
  saveUserId,
} from '@/services/api';

WebBrowser.maybeCompleteAuthSession();

export const OAUTH_REDIRECT_URI = 'saathiai://oauth-callback';

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

export interface SocialAuthResult {
  token: string;
  userId: string;
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
  const name = pickString(raw?.name, raw?.full_name, raw?.displayName, raw?.username);
  const username = pickString(raw?.username, raw?.handle, raw?.user_name, raw?.name);
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
  if (!user.id) {
    throw new Error('INVALID_AUTH_USER');
  }

  return {
    success: raw?.success ?? true,
    token,
    refreshToken,
    expiresIn: Number(raw?.expiresIn ?? raw?.expires_in ?? raw?.data?.expiresIn ?? 0),
    user,
  };
}

async function persistAuthenticatedSession(token: string, userId?: string, refreshToken?: string): Promise<void> {
  await saveAuthTokens(token, refreshToken);
  if (userId) {
    await saveUserId(userId);
  }
}

function extractUserFromDashboardPayload(payload: any): any {
  return (
    payload?.user ||
    payload?.data?.user ||
    payload?.dashboard?.user ||
    payload?.data?.dashboard?.user ||
    payload?.profile ||
    payload?.data?.profile ||
    payload?.data ||
    payload
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchDashboardUser(token?: string): Promise<User> {
  const endpoints = ['/dashboard', '/auth/me', '/users/me'];
  const retryDelays = [0, 300, 800];

  for (const wait of retryDelays) {
    if (wait > 0) {
      await delay(wait);
    }

    for (const endpoint of endpoints) {
      try {
        const data = await apiCall<any>(endpoint, {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!data) continue;

        const user = normalizeUser(extractUserFromDashboardPayload(data));
        if (user.id) {
          return user;
        }
      } catch {
        // Continue trying alternate endpoint/retry to tolerate eventual session propagation.
      }
    }
  }

  throw new Error('Failed to validate session with dashboard.');
}

export function parseSocialAuthCallback(url: string): { token: string; userId: string } {
  if (!url || !url.startsWith(OAUTH_REDIRECT_URI)) {
    throw new Error('Malformed OAuth redirect.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Malformed OAuth redirect.');
  }

  const hashParams = new URLSearchParams((parsedUrl.hash || '').replace(/^#/, ''));

  const token = (
    parsedUrl.searchParams.get('token') ||
    parsedUrl.searchParams.get('accessToken') ||
    parsedUrl.searchParams.get('access_token') ||
    parsedUrl.searchParams.get('authToken') ||
    hashParams.get('token') ||
    hashParams.get('accessToken') ||
    hashParams.get('access_token') ||
    hashParams.get('authToken')
  )?.trim();

  const userId = (
    parsedUrl.searchParams.get('userId') ||
    parsedUrl.searchParams.get('user_id') ||
    parsedUrl.searchParams.get('id') ||
    hashParams.get('userId') ||
    hashParams.get('user_id') ||
    hashParams.get('id')
  )?.trim();

  if (!token) {
    throw new Error('No token was returned from the social login callback.');
  }

  if (!userId) {
    throw new Error('No user ID was returned from the social login callback.');
  }

  return { token, userId };
}

export async function completeSocialAuthCallback(url: string): Promise<SocialAuthResult> {
  const { token, userId } = parseSocialAuthCallback(url);

  await persistAuthenticatedSession(token, userId);

  try {
    const user = await fetchDashboardUser(token);
    await saveUserId(user.id || userId);

    return {
      token,
      userId: user.id || userId,
      user,
    };
  } catch (error) {
    await clearAuthTokens().catch(() => {});
    throw error;
  }
}

export async function loginWithCredentials(
  usernameOrEmail: string,
  password: string
): Promise<AuthResponse> {
  const data = await apiCall<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      usernameOrEmail,
      password,
      client: 'mobile',
    }),
  });

  const normalized = normalizeAuthResponse(data);
  await persistAuthenticatedSession(normalized.token, normalized.user.id, normalized.refreshToken || undefined);
  return normalized;
}

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

export async function verifyOTP(email: string, otp: string): Promise<AuthResponse> {
  const data = await apiCall<any>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      email,
      otp,
      client: 'mobile',
    }),
  });

  const normalized = normalizeAuthResponse(data);
  await persistAuthenticatedSession(normalized.token, normalized.user.id, normalized.refreshToken || undefined);
  return normalized;
}

export async function resendOTP(email: string): Promise<{ success: boolean }> {
  return apiCall('/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email, client: 'mobile' }),
  });
}

export async function logout(): Promise<void> {
  try {
    await apiCall('/auth/logout', { method: 'POST' });
  } catch {
    // Clear local auth even if the server call fails.
  } finally {
    await clearAuthTokens();
  }
}

export async function checkAuthStatus(): Promise<User | null> {
  const token = await getStoredAccessToken();
  if (!token) return null;

  try {
    return await fetchDashboardUser(token);
  } catch {
    await clearAuthTokens().catch(() => {});
    return null;
  }
}

export async function startSocialAuth(
  provider: 'google' | 'facebook' | 'x'
): Promise<SocialAuthResult> {
  const authUrl = `https://saathiai.org/api/auth/${provider}?redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}`;
  const result = await WebBrowser.openAuthSessionAsync(authUrl, OAUTH_REDIRECT_URI);

  if (result.type === 'cancel') {
    throw new Error('Social login was cancelled.');
  }

  if (result.type === 'dismiss') {
    throw new Error('Social login was dismissed before completion.');
  }

  if (result.type !== 'success' || !result.url) {
    if (provider === 'x') {
      throw new Error('X login did not return a valid callback. X login may require backend session-state adjustment.');
    }
    throw new Error('Social login did not complete successfully.');
  }

  try {
    return await completeSocialAuthCallback(result.url);
  } catch (error) {
    if (provider === 'x') {
      throw new Error('X login may require backend session-state adjustment.');
    }
    throw error;
  }
}

export async function loginWithGoogle(): Promise<SocialAuthResult> {
  return startSocialAuth('google');
}

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


