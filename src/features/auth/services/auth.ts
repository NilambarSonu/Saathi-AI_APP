import api, { BASE_URL } from '@/api/axiosConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

// ─────────────── USER TYPE ───────────────
export interface User {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  location: string | null;
  profile_picture: string | null;
  preferred_language: string;
  provider: string;
  created_at: string;
  name?: string;       // optional compat alias
  avatar_url?: string; // optional compat alias
}

// ─────────────── REGISTER FLOW ───────────────
// Used by: register.tsx (via registerAccount alias)
export async function register(data: {
  username: string;
  email: string;
  phone?: string;
  password: string;
}) {
  const response = await api.post('/auth/register', {
    ...data,
    client: 'mobile',
  });
  return response.data;
  // Returns: { success, message, email, requiresOTP: true }
}

// Alias used by register.tsx
export async function registerAccount(data: {
  name?: string;
  username?: string;
  email: string;
  phone?: string;
  password: string;
}) {
  // Map `name` → `username` since server expects `username`
  const payload = {
    username: data.username || data.name || '',
    email: data.email,
    password: data.password,
    ...(data.phone ? { phone: data.phone } : {}),
    client: 'mobile',
  };
  const response = await api.post('/auth/register', payload);
  return response.data;
  // Returns: { success, message, email, requiresOTP: true }
}

// ─────────────── SEND OTP ───────────────
export async function sendOtp(email: string, purpose: 'register' | 'login') {
  const response = await api.post('/auth/send-otp', {
    email,
    purpose,
    provider: 'EMAIL',
  });
  return response.data;
  // Returns: { ok, otpId, expiresIn, provider, contactType }
}

// Alias used by verify-otp.tsx (resend)
export async function resendOTP(email: string) {
  return sendOtp(email, 'register');
}

// ─────────────── VERIFY OTP (Mobile) ───────────────
export async function verifyOtp(otp: string, email: string) {
  const response = await api.post('/auth/verify-otp', {
    otp,
    email,
    client: 'mobile',
  });
  return response.data;
  // Returns: { success, token, refreshToken, expiresIn, user }
}

// Alias used by verify-otp.tsx (args reversed)
export async function verifyOTP(email: string, otp: string) {
  return verifyOtp(otp, email);
}

// ─────────────── LOGIN ───────────────
export async function login(usernameOrEmail: string, password: string) {
  const response = await api.post('/auth/login', {
    usernameOrEmail,
    password,
    client: 'mobile',
  });
  return response.data;
  // Returns: { success, token, refreshToken, expiresIn, user }
}

// Alias used by login.tsx
export async function loginWithCredentials(usernameOrEmail: string, password: string) {
  return login(usernameOrEmail, password);
}

// ─────────────── CHECK AUTH STATUS (used by _layout.tsx) ───────────────
export async function checkAuthStatus(): Promise<User | null> {
  try {
    const token = await AsyncStorage.getItem('saathi_token');
    if (!token) return null;
    const response = await api.get('/user');
    return response.data.user as User;
  } catch {
    return null;
  }
}

// ─────────────── SAVE SESSION ───────────────
export async function saveSession(data: {
  token: string;
  refreshToken: string | null;
  user: object;
}) {
  await AsyncStorage.setItem('saathi_token', data.token);
  if (data.refreshToken) {
    await AsyncStorage.setItem('saathi_refresh_token', data.refreshToken);
  }
  await AsyncStorage.setItem('saathi_user', JSON.stringify(data.user));
}

// ─────────────── LOGOUT ───────────────
export async function logout() {
  await AsyncStorage.multiRemove([
    'saathi_token',
    'saathi_refresh_token',
    'saathi_user',
    'saathi_auth_token',
    'saathi_access_token',  // legacy key compat
  ]);
}

// ─────────────── GET CURRENT USER ───────────────
export async function getUser(): Promise<User> {
  const response = await api.get('/user');
  return response.data.user;
}

// ─────────────── FORGOT PASSWORD (send OTP via login purpose) ───────────────
// Step 1: sendOtp(email, 'login') — no auth needed
// Step 2: verifyOtp → returns token
// Step 3: sendPasswordChangeOtp (with token) → returns otpId
// Step 4: changePassword with otpId + new OTP + newPassword

export async function sendPasswordChangeOtp() {
  const response = await api.post('/auth/send-password-change-otp');
  return response.data;
  // Returns: { ok, otpId, expiresIn, provider, message }
}

export async function changePassword(otpId: string, otp: string, newPassword: string) {
  const response = await api.post('/auth/change-password', { otpId, otp, newPassword });
  return response.data;
}

// ─────────────── SOCIAL LOGIN (Google / Facebook / X) ───────────────
async function socialLogin(provider: 'google' | 'facebook' | 'x') {
  const redirectUri = Linking.createURL('auth'); // → "saathiai://auth"
  const authUrl = `${BASE_URL}/api/auth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type === 'success' && result.url) {
    const url = new URL(result.url);
    const token = url.searchParams.get('token');
    const userId = url.searchParams.get('userId');

    if (token && userId) {
      // Store token first so the interceptor can attach it
      await AsyncStorage.setItem('saathi_token', token);

      // Fetch user profile with the token
      const userResponse = await api.get('/user');
      return {
        success: true,
        token,
        refreshToken: null as string | null,
        user: userResponse.data.user as User,
      };
    }
  }
  throw new Error('Social login was cancelled or failed.');
}

export const loginWithGoogle = () => socialLogin('google');
export const loginWithFacebook = () => socialLogin('facebook');
export const loginWithX = () => socialLogin('x');

// Unified alias used by login.tsx and register.tsx
export async function startSocialAuth(provider: 'google' | 'facebook' | 'x') {
  return socialLogin(provider);
}

// ─────────────── DEVICE REGISTRATION ───────────────
export async function registerDevice(params: {
  expo_push_token: string;
  device_type: 'ios' | 'android';
  device_name?: string;
}) {
  await api.post('/users/device', params);
}
