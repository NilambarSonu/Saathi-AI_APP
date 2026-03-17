# SAATHI AI NATIVE APP — COMPLETE FULL-STACK ENHANCEMENT
### Source-extracted from saathiai.org codebase · All 19 files analyzed
**For Antigravity IDE · No guessing — every value extracted from actual web source code**  
**Base URL:** `https://saathiai.org` (production) | `http://localhost:5000` (dev)

---

## WHAT WAS EXTRACTED FROM EACH FILE

| File | Key extraction |
|---|---|
| `routes.ts` | All 25 API endpoints, exact request/response shapes, JWT auth middleware |
| `bluetooth.ts` | AGNI UUIDs, data parsing, simulated data values, device name filter |
| `use-bluetooth.ts` | All 7 BLE states, exact state messages, progress simulation |
| `chat.tsx` | Chat API calls, session management, soil file analysis flow |
| `history.tsx` | Soil tests fetch, date filtering, PDF export logic |
| `api.ts` | Auth token key `saathi_token`, all endpoint signatures |
| `speech.ts` | Language map, chunking logic, fallback strategy, rate values |
| `translations.ts` | All translation keys for en/hi/od |
| `schema.ts` | Complete data types for all 8 DB tables |
| `HistoryChart.tsx` | 5 parameters, exact colors, chart structure |
| `map-component.tsx` | pH color codes, Google Maps → Leaflet port needed |
| `MessageRenderer.tsx` | JSON soil data rendering, markdown parser, audio button |
| `ai.ts` | AI model: Gemini 2.5 Flash, endpoints called |
| `connect.tsx` | BLE flow, soil data save, navigate to chat |
| `account.tsx` | Profile fields, privacy settings, password change OTP |
| `chat-history.tsx` | Session list structure |
| `chat-sidebar.tsx` | Sidebar session rendering |

---

## PART 1 — COMPLETE API SERVICE LAYER

**File:** `services/api.ts` — Replace the current file entirely.

```typescript
import * as SecureStore from 'expo-secure-store';

// ── CRITICAL: Match this to your environment
export const API_BASE = 'https://saathiai.org';
// For local dev: export const API_BASE = 'http://192.168.X.X:5000';

const TOKEN_KEY = 'saathi_token';           // matches web: localStorage key
const REFRESH_KEY = 'saathi_refresh_token';

// ── Core fetch with auto auth + auto refresh ──
export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retryOnExpiry = true,
): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-client-type': 'mobile',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Token expired
  if (response.status === 403 && retryOnExpiry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiCall(endpoint, options, false);
    }
    await clearAuthTokens();
    throw new Error('SESSION_EXPIRED');
  }

  const text = await response.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!response.ok) {
    throw { ...data, status: response.status };
  }

  return data as T;
}

// ── Auth token helpers ──
export async function saveAuthTokens(token: string, refreshToken?: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function clearAuthTokens() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.token) {
      await saveAuthTokens(data.token, data.refreshToken);
      return true;
    }
    return false;
  } catch { return false; }
}
```

---

## PART 2 — COMPLETE AUTH SERVICE

**File:** `services/auth.ts`

```typescript
import { apiCall, saveAuthTokens, clearAuthTokens } from './api';

// ── EXTRACTED FROM routes.ts lines 285–530 ──

// ── Types from schema.ts ──
export interface User {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  location: string | null;
  phoneVerified: boolean;
  provider: string;
  profilePicture: string | null;
  preferredLanguage: string;
  createdAt: string;
}

export interface AuthResponse {
  ok: boolean;
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  user: User;
}

// ── Send OTP (registration / login) ──
// Endpoint: POST /api/auth/send-otp
// Returns: { ok, otpId, expiresIn: 180, provider, contactType }
export async function sendOtp(params: {
  email?: string;
  phone?: string;
  countryCode?: string;
  purpose: 'register' | 'login';
  provider?: 'EMAIL' | 'MSG91' | 'PERSONAL_SIM';
}) {
  return apiCall<{
    ok: boolean;
    otpId: string;
    expiresIn: number;
    provider: string;
    contactType: string;
  }>('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ ...params, client: 'mobile' }),
  });
}

// ── Verify OTP ──
// Endpoint: POST /api/auth/verify-otp
// For registration flow: returns { ok, phone, email, purpose }
// For login flow with client=mobile: returns { ok, token, user }
export async function verifyOtpForRegistration(params: {
  otpId?: string;
  otp: string;
  email?: string;
}) {
  return apiCall<{ ok: boolean; email?: string; phone?: string }>('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ ...params, client: 'mobile' }),
  });
}

// ── Register ──
// Endpoint: POST /api/auth/register
// Password requirements from schema.ts registerSchema:
//   min 8 chars, 1 uppercase, 1 lowercase, 1 number
export async function register(params: {
  username: string;
  email: string;
  phone?: string;
  password: string;
  otpId?: string;
}) {
  const data = await apiCall<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...params, client: 'mobile' }),
  });
  if (data.token) {
    await saveAuthTokens(data.token, data.refreshToken);
  }
  return data;
}

// ── Login ──
// Endpoint: POST /api/auth/login
// Field name from schema.ts loginSchema: "usernameOrEmail"
export async function login(usernameOrEmail: string, password: string) {
  const data = await apiCall<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail, password, client: 'mobile' }),
  });
  if (data.token) {
    await saveAuthTokens(data.token, data.refreshToken);
  }
  return data;
}

// ── Get current user ──
// Endpoint: GET /api/dashboard
// Returns: { message, user, status, aiStatus }
// aiStatus.model = "gemini-2.5-flash (optimized)"
export async function getCurrentUser() {
  const data = await apiCall<{
    message: string;
    user: User;
    status: string;
    aiStatus: {
      geminiPrimary: boolean;
      model: string;
      waterfallActive: boolean;
    };
  }>('/api/dashboard');
  return data;
}

// ── Logout ──
export async function logout() {
  try {
    await apiCall('/api/auth/logout', { method: 'POST' });
  } catch {}
  await clearAuthTokens();
}

// ── Update profile ──
// Endpoint: PUT /api/user
// Fields: username (min 2 chars), location (optional)
export async function updateProfile(username: string, location?: string) {
  return apiCall<{ ok: boolean; user: User }>('/api/user', {
    method: 'PUT',
    body: JSON.stringify({ username, location }),
  });
}

// ── Delete account ──
// Endpoint: DELETE /api/user
export async function deleteAccount() {
  return apiCall<{ ok: boolean; message: string }>('/api/user', {
    method: 'DELETE',
  });
}

// ── Download user data ──
// Endpoint: GET /api/user/data?format=json|csv
export async function downloadUserData(format: 'json' | 'csv' = 'json') {
  const token = await import('./api').then(m => m.getToken());
  const res = await fetch(`${import('./api').then(m => m.API_BASE)}/api/user/data?format=${format}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res;
}

// ── Send password change OTP ──
// Endpoint: POST /api/auth/send-password-change-otp (requires auth)
// Sends OTP to user's registered email
export async function sendPasswordChangeOtp() {
  return apiCall<{
    ok: boolean;
    otpId: string;
    expiresIn: number;
    provider: string;
    message: string;
  }>('/api/auth/send-password-change-otp', { method: 'POST' });
}

// ── Change password ──
// Endpoint: POST /api/auth/change-password (requires auth)
// Password must: min 8 chars, 1 uppercase, 1 lowercase, 1 number
export async function changePassword(otpId: string, otp: string, newPassword: string) {
  return apiCall<{ ok: boolean; message: string; user: User }>(
    '/api/auth/change-password',
    {
      method: 'POST',
      body: JSON.stringify({ otpId, otp, newPassword }),
    }
  );
}

// ── Get privacy settings ──
// Endpoint: GET /api/privacy-settings
export async function getPrivacySettings() {
  return apiCall<{
    profileVisibility: boolean;
    dataSharing: boolean;
    analyticsEnabled: boolean;
    emailNotifications: boolean;
    marketingEmails: boolean;
  }>('/api/privacy-settings');
}

// ── Update privacy settings ──
// Endpoint: PUT /api/privacy-settings
export async function updatePrivacySettings(settings: {
  profileVisibility?: boolean;
  dataSharing?: boolean;
  analyticsEnabled?: boolean;
  emailNotifications?: boolean;
  marketingEmails?: boolean;
}) {
  return apiCall('/api/privacy-settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// ── Get app config ──
// Endpoint: GET /api/config
// Returns OAuth availability and SMS provider
export async function getConfig() {
  return apiCall<{
    smsProvider: string;
    personalSimPhone: string;
    uiAnimLeaves: boolean;
    oauth: { google: boolean; facebook: boolean; x: boolean };
  }>('/api/config');
}

// ── Register device for push notifications ──
// Endpoint: POST /api/users/device
export async function registerDevice(expoPushToken: string, deviceType: 'ios' | 'android') {
  return apiCall('/api/users/device', {
    method: 'POST',
    body: JSON.stringify({
      expo_push_token: expoPushToken,
      device_type: deviceType,
    }),
  });
}
```

---

## PART 3 — SOIL TESTS SERVICE

**File:** `services/soilTests.ts`

```typescript
import { apiCall } from './api';

// ── Types extracted from schema.ts ──
export interface SoilTest {
  id: string;
  userId: string;
  deviceId: string;
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  moisture: number;
  temperature: number;
  ec?: number;
  latitude?: number;
  longitude?: number;
  location?: string;
  rawData?: any;
  testDate: string;
  recommendation?: AiRecommendation | null;
  // Pricing fields
  recommendedPriceInr?: number;
  priceCapReason?: string;
  priceDisplayText?: any;
  priceLocked?: boolean;
  testType?: string;
}

export interface AiRecommendation {
  id: string;
  soilTestId: string;
  language: string;
  naturalFertilizers?: any;
  chemicalFertilizers?: any;
  applicationInstructions?: string;
  recommendations?: string;
  createdAt: string;
}

export interface SaveSoilTestResponse {
  soilTest: SoilTest & { pricing?: any };
  recommendations: AiRecommendation | null;
}

// ── Save soil test to database ──
// Endpoint: POST /api/soil-tests (requires auth)
// Triggers AI recommendation generation automatically
// Returns: { soilTest, recommendations }
export async function saveSoilTest(params: {
  deviceId: string;
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  moisture: number;
  temperature: number;
  ec?: number;
  latitude?: number;
  longitude?: number;
  location?: string;
  rawData?: any;
}) {
  return apiCall<SaveSoilTestResponse>('/api/soil-tests', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ── Get all soil tests for user ──
// Endpoint: GET /api/soil-tests/:userId (requires auth)
// Returns array of SoilTest with nested recommendation
// Sorted newest first by testDate
export async function getUserSoilTests(userId: string) {
  return apiCall<SoilTest[]>(`/api/soil-tests/${userId}`);
}

// ── Get single soil test ──
// Endpoint: GET /api/soil-tests/test/:id
export async function getSoilTest(testId: string) {
  return apiCall<SoilTest & { recommendation: AiRecommendation | null }>(
    `/api/soil-tests/test/${testId}`
  );
}

// ── Generate AI recommendation for existing test ──
// Endpoint: POST /api/recommendations/generate
// Use this if the initial save didn't generate a recommendation
export async function generateRecommendation(soilTestId: string, language = 'en') {
  return apiCall<AiRecommendation>('/api/recommendations/generate', {
    method: 'POST',
    body: JSON.stringify({ soilTestId, language }),
  });
}

// ── Analyze soil data file ──
// Endpoint: POST /api/analyze-soil-file
// Used in chat when user uploads a JSON file
export async function analyzeSoilFile(params: {
  soilData: any;
  language: string;
  fileName?: string;
}) {
  return apiCall<{
    response: string;
    sessionId?: string;
    locationData?: {
      id: string;
      latitude: number;
      longitude: number;
      ph: number;
      ph_category: string;
      timestamp: string;
    };
  }>('/api/analyze-soil-file', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
```

---

## PART 4 — CHAT SERVICE

**File:** `services/chat.ts`

```typescript
import { apiCall } from './api';

// ── Types extracted from schema.ts + chat.tsx ──
export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  lastMessageAt?: string;
}

export interface ChatMessage {
  id: string;
  text: string;       // maps to chatMessages.content
  sender: 'user' | 'ai';  // maps to chatMessages.role
  timestamp: string;
  sessionId: string;
}

// ── Send chat message ──
// Endpoint: POST /api/chat
// AI model: Gemini 2.5 Flash with 20s timeout
// soilContext: automatically loaded from user's latest soil test
// sessionId: pass existing to continue, omit to create new session
// IMPORTANT: sends userId from auth, language as 'en'|'hi'|'od'
export async function sendChatMessage(params: {
  message: string;
  language: 'en' | 'hi' | 'od';
  userId: string;
  sessionId?: string;
}) {
  return apiCall<{
    response: string;
    sessionId?: string;
  }>('/api/chat', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ── Get all chat sessions ──
// Endpoint: GET /api/chat/sessions (requires auth)
// Returns sessions ordered by updatedAt DESC with messageCount
export async function getChatSessions() {
  return apiCall<ChatSession[]>('/api/chat/sessions');
}

// ── Create new chat session ──
// Endpoint: POST /api/chat/sessions (requires auth)
export async function createChatSession(title: string, language = 'en') {
  return apiCall<ChatSession>('/api/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ title, language }),
  });
}

// ── Get messages for a session ──
// Endpoint: GET /api/chat/sessions/:id/messages (requires auth)
// Returns messages in ASC order (oldest first)
// Note: field is "text" (not "content") — server maps content → text
export async function getSessionMessages(sessionId: string) {
  return apiCall<ChatMessage[]>(`/api/chat/sessions/${sessionId}/messages`);
}

// ── Delete a chat session ──
// Endpoint: DELETE /api/chat/sessions/:id (requires auth)
// Also deletes all messages in the session (cascade)
export async function deleteChatSession(sessionId: string) {
  return apiCall<{ success: boolean }>(`/api/chat/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}
```

---

## PART 5 — BLE (BLUETOOTH) SERVICE

**File:** `services/ble.ts`

Ported directly from `bluetooth.ts`. All UUIDs and data format extracted from source.

```typescript
import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import * as Location from 'expo-location';

// ── EXACT UUIDs FROM bluetooth.ts ──
export const AGNI_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const AGNI_CHARACTERISTIC_UUID = '6d68efe5-04b6-4a85-abc4-c2670b7bf7fd';
export const COMMAND_SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
export const COMMAND_CHARACTERISTIC_UUID = 'abcdef13-3456-7890-1234-567890abcdef';

// ── DEVICE NAME FILTERS FROM bluetooth.ts requestDevice() ──
// Web: { name: 'Agni-01' }, { namePrefix: 'Agni-' }
export const AGNI_DEVICE_NAME = 'Agni-01';
export const AGNI_DEVICE_PREFIX = 'Agni-';

// ── TIMEOUTS FROM bluetooth.ts ──
const CONNECTION_TIMEOUT = 10000;  // 10 seconds
const READ_TIMEOUT = 5000;          // 5 seconds

// ── Soil data shape from bluetooth.ts parseData ──
// Raw device sends: { pH, N, P, K, moisture, temperature, EC, location: {lat, lng} }
// Parsed to:
export interface SoilBLEData {
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  moisture: number;
  temperature: number;
  ec: number;
  timestamp: number;
  location?: { latitude: number; longitude: number };
  rawBluetoothData?: any;
}

// ── BLE Connection States (from use-bluetooth.ts) ──
export type BLEStatus = 'idle' | 'scanning' | 'connecting' | 'connected' |
                         'transferring' | 'complete' | 'error';

export interface ConnectionStatus {
  status: BLEStatus;
  message: string;         // from use-bluetooth.ts exact strings
  subMessage: string;
  progress?: number;       // 0–100 during transferring
  deviceName?: string;
}

// ── Exact status messages from use-bluetooth.ts ──
export const BLE_STATUS_MESSAGES: Record<BLEStatus, { message: string; subMessage: string }> = {
  idle:        { message: 'Ready to Connect',     subMessage: 'Click below to scan for Agni device' },
  scanning:    { message: 'Scanning for devices...', subMessage: 'Looking for Agni device' },
  connecting:  { message: 'Connecting...',         subMessage: 'Attempting to connect...' },
  connected:   { message: 'Connected - Device Ready', subMessage: 'Ready to transfer data' },
  transferring:{ message: 'Transferring soil data...', subMessage: 'Reading from device...' },
  complete:    { message: 'Transfer Complete!',    subMessage: 'Data ready for analysis' },
  error:       { message: 'Connection Failed',     subMessage: 'Please try again' },
};

// ── Parse raw BLE JSON from device ──
// Extracted from bluetooth.ts readSoilData()
// Device sends JSON: { pH, N, P, K, moisture, temperature, EC, location: {lat, lng} }
function parseDeviceData(jsonString: string): SoilBLEData {
  const raw = JSON.parse(jsonString);

  const parseNum = (v: any, fallback = 0): number => {
    const n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  };

  return {
    ph:          parseNum(raw.pH),
    nitrogen:    parseNum(raw.N),
    phosphorus:  parseNum(raw.P),
    potassium:   parseNum(raw.K),
    moisture:    parseNum(raw.moisture),
    temperature: parseNum(raw.temperature),
    ec:          parseNum(raw.EC),
    timestamp:   Date.now(),
    rawBluetoothData: raw,
    location: raw.location ? {
      latitude:  parseNum(raw.location.lat),
      longitude: parseNum(raw.location.lng),
    } : undefined,
  };
}

// ── Simulate soil data (from bluetooth.ts simulateReadSoilData) ──
// EXACT same variance values as web
export function simulateSoilData(): SoilBLEData {
  const gen = (base: number, variance: number) =>
    parseFloat((base + (Math.random() - 0.5) * variance).toFixed(2));

  return {
    ph:          gen(5.2, 0.3),    // matches web: base 5.2, variance 0.3
    nitrogen:    gen(25, 10),
    phosphorus:  gen(15, 8),
    potassium:   gen(35, 12),
    moisture:    gen(18, 6),
    temperature: gen(24, 4),
    ec:          gen(2.8, 0.6),
    timestamp:   Date.now(),
    rawBluetoothData: { deviceId: 'Agni-01 (simulated)' },
    location: {
      latitude:  gen(20.2961, 0.01),   // Bhubaneswar, Odisha coordinates
      longitude: gen(85.8245, 0.01),
    },
  };
}

// ── Request Android BLE permissions ──
export async function requestBLEPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const apiLevel = Platform.Version as number;

  if (apiLevel >= 31) {
    // Android 12+
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(results).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
  } else {
    // Android < 12
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
}

// ── Main BLE hook — port of use-bluetooth.ts ──
// File: hooks/useBLE.ts
```

---

## PART 6 — useBLE HOOK

**File:** `hooks/useBLE.ts` — Complete port of `use-bluetooth.ts`

```typescript
import { useState, useCallback, useRef } from 'react';
import { BleManager, State } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import {
  SoilBLEData, ConnectionStatus, BLEStatus, BLE_STATUS_MESSAGES,
  AGNI_SERVICE_UUID, AGNI_CHARACTERISTIC_UUID,
  AGNI_DEVICE_NAME, AGNI_DEVICE_PREFIX,
  requestBLEPermissions, simulateSoilData,
} from '../services/ble';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

const IS_DEV = __DEV__;

// Create manager singleton
let bleManagerInstance: BleManager | null = null;
function getBleManager() {
  if (!bleManagerInstance) {
    try {
      bleManagerInstance = new BleManager();
    } catch (e) {
      console.warn('[BLE] react-native-ble-plx not available:', e);
      return null;
    }
  }
  return bleManagerInstance;
}

export function useBLE() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'idle',
    ...BLE_STATUS_MESSAGES.idle,
  });
  const [soilData, setSoilData] = useState<SoilBLEData | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const connectedDeviceRef = useRef<any>(null);

  // ── Check BLE support ──
  const checkSupport = useCallback(async () => {
    const manager = getBleManager();
    if (!manager) {
      setIsSupported(false);
      return false;
    }

    const hasPermissions = await requestBLEPermissions();
    if (!hasPermissions) {
      setIsSupported(false);
      setConnectionStatus({
        status: 'error',
        message: 'Permission Denied',
        subMessage: 'Bluetooth and Location permissions are required for Agni device',
      });
      return false;
    }
    return true;
  }, []);

  // ── SCAN AND CONNECT ──
  // Matches use-bluetooth.ts connect() exactly
  const connect = useCallback(async () => {
    try {
      const supported = await checkSupport();
      if (!supported) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Scanning
      setConnectionStatus({
        status: 'scanning',
        ...BLE_STATUS_MESSAGES.scanning,
      });

      // DEV MODE: simulate
      if (IS_DEV) {
        await new Promise(r => setTimeout(r, 1500));
        setConnectionStatus({
          status: 'connecting',
          message: 'Device Found: Agni-01 (simulated)',
          subMessage: BLE_STATUS_MESSAGES.connecting.subMessage,
          deviceName: 'Agni-01',
        });
        await new Promise(r => setTimeout(r, 1000));
        setConnectionStatus({
          status: 'connected',
          ...BLE_STATUS_MESSAGES.connected,
          deviceName: 'Agni-01',
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      // PRODUCTION: real BLE
      const manager = getBleManager()!;

      return new Promise<void>((resolve, reject) => {
        const scanTimeout = setTimeout(() => {
          manager.stopDeviceScan();
          setConnectionStatus({
            status: 'error',
            message: 'No Agni Device Found',
            subMessage: 'Make sure device is powered on and nearby',
          });
          reject(new Error('Scan timeout'));
        }, 15000);

        manager.startDeviceScan(
          [AGNI_SERVICE_UUID],
          { allowDuplicates: false },
          async (error, device) => {
            if (error) {
              clearTimeout(scanTimeout);
              manager.stopDeviceScan();
              setConnectionStatus({
                status: 'error',
                message: 'Scan Error',
                subMessage: error.message,
              });
              reject(error);
              return;
            }

            // Match device name — AGNI_DEVICE_NAME or starts with AGNI_DEVICE_PREFIX
            if (device && (
              device.name === AGNI_DEVICE_NAME ||
              device.name?.startsWith(AGNI_DEVICE_PREFIX)
            )) {
              clearTimeout(scanTimeout);
              manager.stopDeviceScan();

              setConnectionStatus({
                status: 'connecting',
                message: `Device Found: ${device.name}`,
                subMessage: BLE_STATUS_MESSAGES.connecting.subMessage,
                deviceName: device.name || undefined,
              });

              try {
                const connected = await device.connect({ timeout: 10000 });
                await connected.discoverAllServicesAndCharacteristics();
                connectedDeviceRef.current = connected;

                setConnectionStatus({
                  status: 'connected',
                  ...BLE_STATUS_MESSAGES.connected,
                  deviceName: device.name || undefined,
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                resolve();
              } catch (connErr: any) {
                setConnectionStatus({
                  status: 'error',
                  message: 'Connection Failed',
                  subMessage: connErr.message,
                });
                reject(connErr);
              }
            }
          }
        );
      });

    } catch (error: any) {
      setConnectionStatus({
        status: 'error',
        message: BLE_STATUS_MESSAGES.error.message,
        subMessage: error.message || 'Unknown error',
      });
    }
  }, [checkSupport]);

  // ── READ DATA ──
  // Matches use-bluetooth.ts readData() — with same progress simulation
  const readData = useCallback(async () => {
    try {
      setConnectionStatus(prev => ({
        ...prev,
        status: 'transferring',
        ...BLE_STATUS_MESSAGES.transferring,
        progress: 0,
      }));

      // Progress simulation — exactly matches use-bluetooth.ts
      const progressInterval = setInterval(() => {
        setConnectionStatus(prev => {
          if (prev.status === 'transferring' && (prev.progress || 0) < 90) {
            return { ...prev, progress: (prev.progress || 0) + 10 };
          }
          return prev;
        });
      }, 200);

      let data: SoilBLEData;

      if (IS_DEV || !connectedDeviceRef.current) {
        // DEV: simulate (2 second delay matches web simulateReadSoilData)
        data = await new Promise<SoilBLEData>(resolve =>
          setTimeout(() => resolve(simulateSoilData()), 2000)
        );
      } else {
        // PROD: read from actual device
        const characteristic = await connectedDeviceRef.current
          .readCharacteristicForService(AGNI_SERVICE_UUID, AGNI_CHARACTERISTIC_UUID);

        if (!characteristic.value) throw new Error('Received empty data from device');

        const buffer = Buffer.from(characteristic.value, 'base64');
        const jsonString = buffer.toString('utf8');
        const rawData = JSON.parse(jsonString);

        const parseNum = (v: any, fb = 0) => { const n = parseFloat(v); return isNaN(n) ? fb : n; };

        data = {
          ph:          parseNum(rawData.pH),
          nitrogen:    parseNum(rawData.N),
          phosphorus:  parseNum(rawData.P),
          potassium:   parseNum(rawData.K),
          moisture:    parseNum(rawData.moisture),
          temperature: parseNum(rawData.temperature),
          ec:          parseNum(rawData.EC),
          timestamp:   Date.now(),
          rawBluetoothData: rawData,
          location: rawData.location
            ? { latitude: parseNum(rawData.location.lat), longitude: parseNum(rawData.location.lng) }
            : undefined,
        };
      }

      // Get GPS location if device didn't provide it
      if (!data.location) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            data = {
              ...data,
              location: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
            };
          }
        } catch {}
      }

      clearInterval(progressInterval);

      setConnectionStatus({
        status: 'complete',
        ...BLE_STATUS_MESSAGES.complete,
        progress: 100,
        deviceName: connectedDeviceRef.current?.name || 'Agni-01',
      });

      setSoilData(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return data;

    } catch (error: any) {
      setConnectionStatus({
        status: 'error',
        message: 'Data Transfer Failed',
        subMessage: error.message || 'Unknown error',
      });
      throw error;
    }
  }, []);

  // ── DISCONNECT ──
  const disconnect = useCallback(async () => {
    try {
      if (connectedDeviceRef.current) {
        await connectedDeviceRef.current.cancelConnection();
        connectedDeviceRef.current = null;
      }
      setConnectionStatus({ status: 'idle', ...BLE_STATUS_MESSAGES.idle });
      setSoilData(null);
    } catch {}
  }, []);

  // ── RESET ──
  const reset = useCallback(() => {
    setConnectionStatus({ status: 'idle', ...BLE_STATUS_MESSAGES.idle });
    setSoilData(null);
  }, []);

  return {
    connectionStatus,
    soilData,
    isSupported,
    connect,
    readData,
    disconnect,
    reset,
    isConnected: connectionStatus.status === 'connected',
    isComplete: connectionStatus.status === 'complete',
  };
}
```

---

## PART 7 — TEXT-TO-SPEECH SERVICE

**File:** `services/tts.ts`

Ported from `speech.ts`. Uses `expo-speech` instead of Web Speech API.

```typescript
import * as Speech from 'expo-speech';

// ── LANGUAGE MAPPING from speech.ts getVoiceForLanguage() ──
// Web language codes to Expo Speech locale codes
const LANGUAGE_TO_LOCALE: Record<string, string> = {
  'en': 'en-IN',   // Indian English
  'hi': 'hi-IN',   // Hindi
  'od': 'or-IN',   // Odia (may fall back to hi-IN if not available)
};

// ── Rate values from speech.ts ──
// hi/od: rate 0.75, en: rate 0.8
const LANGUAGE_RATE: Record<string, number> = {
  'en': 0.8,
  'hi': 0.75,
  'od': 0.75,
};

// ── Remove emojis — ported from speech.ts removeEmojis() ──
function removeEmojis(text: string): string {
  return text.replace(
    /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g,
    ''
  );
}

// ── Preprocess text for Hindi/Odia — from speech.ts ──
function preprocessText(text: string, language: string): string {
  let processed = removeEmojis(text);

  if (language === 'hi' || language === 'od') {
    // Replace sentence-ending periods with danda (same as web)
    processed = processed
      .replace(/\.(?=\s|$)/g, '।')
      .replace(/(?<!\d),(?=\S)(?!\d)/g, ', ');
  }

  return processed;
}

// ── Chunk text — from speech.ts (max 200 chars) ──
function chunkText(text: string): string[] {
  const MAX_CHUNK = 200;
  if (text.length <= MAX_CHUNK) return [text];

  const chunks: string[] = [];
  const sentences = text.split(/([।.!?]+\s+)/);
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > MAX_CHUNK && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ── Speak text ──
export async function speak(text: string, language = 'en'): Promise<void> {
  // Stop any current speech first
  await Speech.stop();

  const processed = preprocessText(text, language);
  const chunks = chunkText(processed);

  const locale = LANGUAGE_TO_LOCALE[language] || 'en-IN';
  const rate = LANGUAGE_RATE[language] || 0.8;

  for (const chunk of chunks) {
    await new Promise<void>((resolve, reject) => {
      Speech.speak(chunk, {
        language: locale,
        rate,
        pitch: 1.0,
        volume: 1.0,
        onDone: resolve,
        onError: (err) => {
          // Don't reject on cancel/interrupt — matches web behavior
          console.warn('[TTS]', err);
          resolve();
        },
      });
    });
    // Small pause between chunks (matches web: 50ms)
    await new Promise(r => setTimeout(r, 50));
  }
}

export async function stop(): Promise<void> {
  await Speech.stop();
}

export async function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}

// ── Check if language is supported ──
// Odia falls back to Hindi if not available (matches web strategy)
export async function isLanguageSupported(language: string): Promise<boolean> {
  const voices = await Speech.getAvailableVoicesAsync();
  const locale = LANGUAGE_TO_LOCALE[language];
  if (!locale) return false;
  return voices.some(v => v.language.startsWith(locale.split('-')[0]));
}
```

---

## PART 8 — I18N / TRANSLATIONS

**File:** `services/i18n.ts`

Language codes from `translations.ts` and `schema.ts`: `'en' | 'hi' | 'od'`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── LANGUAGE CODES FROM translations.ts + schema.ts ──
export type Language = 'en' | 'hi' | 'od';

export const SUPPORTED_LANGUAGES = [
  { code: 'en' as Language, name: 'English', nativeName: 'English' },
  { code: 'hi' as Language, name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'od' as Language, name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  // From web footer: also supported but not in TranslationKeys
  // { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  // { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  // { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  // { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  // { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  // { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  // { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
];

const LANGUAGE_KEY = 'saathi_language';

export async function saveLanguage(language: Language) {
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
}

export async function getSavedLanguage(): Promise<Language> {
  const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
  return (saved as Language) || 'en';
}

// ── Translation strings extracted from translations.ts ──
// Full TranslationKeys interface has 100+ keys
// Core keys needed for app:
export const TRANSLATIONS: Record<Language, {
  // Navigation (from translations.ts)
  dashboard: string;
  liveConnect: string;
  history: string;
  aiChat: string;
  about: string;
  profile: string;
  // Connection screen
  scanForDevice: string;
  readyToConnect: string;
  scanning: string;
  connecting: string;
  connected: string;
  transferring: string;
  transferComplete: string;
  // Soil parameters
  phLevel: string;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  moisture: string;
  temperature: string;
  // Status
  neutral: string;
  acidic: string;
  alkaline: string;
  low: string;
  medium: string;
  good: string;
  high: string;
  // Chat
  chatPlaceholder: string;
  send: string;
  askQuestion: string;
  playAudio: string;
  // Common
  loading: string;
  error: string;
  retry: string;
  cancel: string;
}> = {
  en: {
    dashboard: 'Dashboard',
    liveConnect: 'Live Connect',
    history: 'History',
    aiChat: 'AI Chat',
    about: 'About',
    profile: 'Profile',
    scanForDevice: 'Scan for Agni Device',
    readyToConnect: 'Ready to Connect',
    scanning: 'Scanning for devices...',
    connecting: 'Connecting...',
    connected: 'Connected',
    transferring: 'Transferring soil data...',
    transferComplete: 'Transfer Complete!',
    phLevel: 'pH Level',
    nitrogen: 'Nitrogen (N)',
    phosphorus: 'Phosphorus (P)',
    potassium: 'Potassium (K)',
    moisture: 'Moisture',
    temperature: 'Temperature',
    neutral: 'Neutral',
    acidic: 'Acidic',
    alkaline: 'Alkaline',
    low: 'Low',
    medium: 'Medium',
    good: 'Good',
    high: 'High',
    chatPlaceholder: 'Type your farming question here...',
    send: 'Send',
    askQuestion: 'Ask a question',
    playAudio: 'Read aloud',
    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry',
    cancel: 'Cancel',
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    liveConnect: 'लाइव कनेक्ट',
    history: 'इतिहास',
    aiChat: 'AI चैट',
    about: 'जानकारी',
    profile: 'प्रोफ़ाइल',
    scanForDevice: 'Agni डिवाइस खोजें',
    readyToConnect: 'कनेक्ट करने के लिए तैयार',
    scanning: 'डिवाइस खोज रहे हैं...',
    connecting: 'कनेक्ट हो रहे हैं...',
    connected: 'कनेक्ट हो गया',
    transferring: 'मिट्टी डेटा ट्रांसफर हो रहा है...',
    transferComplete: 'ट्रांसफर पूर्ण!',
    phLevel: 'pH स्तर',
    nitrogen: 'नाइट्रोजन (N)',
    phosphorus: 'फॉस्फोरस (P)',
    potassium: 'पोटेशियम (K)',
    moisture: 'नमी',
    temperature: 'तापमान',
    neutral: 'तटस्थ',
    acidic: 'अम्लीय',
    alkaline: 'क्षारीय',
    low: 'कम',
    medium: 'मध्यम',
    good: 'अच्छा',
    high: 'अधिक',
    chatPlaceholder: 'अपना सवाल यहाँ लिखें...',
    send: 'भेजें',
    askQuestion: 'सवाल पूछें',
    playAudio: 'सुनें',
    loading: 'लोड हो रहा है...',
    error: 'त्रुटि',
    retry: 'फिर कोशिश करें',
    cancel: 'रद्द करें',
  },
  od: {
    dashboard: 'ଡ୍ୟାସବୋର୍ଡ',
    liveConnect: 'ଲାଇଭ କନେକ୍ଟ',
    history: 'ଇତିହାସ',
    aiChat: 'AI ଚାଟ',
    about: 'ବିଷୟରେ',
    profile: 'ପ୍ରୋଫ଼ାଇଲ',
    scanForDevice: 'Agni ଡିଭାଇସ ସ୍କ୍ୟାନ୍ କରନ୍ତୁ',
    readyToConnect: 'ସଂଯୋଗ ପାଇଁ ପ୍ରସ୍ତୁତ',
    scanning: 'ଡିଭାଇସ ଖୋଜୁଛି...',
    connecting: 'ସଂଯୋଗ ହେଉଛି...',
    connected: 'ସଂଯୁକ୍ତ',
    transferring: 'ମାଟି ଡାଟା ସ୍ଥାନାନ୍ତର...',
    transferComplete: 'ସ୍ଥାନାନ୍ତର ସମ୍ପୂର୍ଣ!',
    phLevel: 'pH ସ୍ତର',
    nitrogen: 'ନାଇଟ୍ରୋଜେନ (N)',
    phosphorus: 'ଫସଫରସ (P)',
    potassium: 'ପୋଟାସିୟମ (K)',
    moisture: 'ଆର୍ଦ୍ରତା',
    temperature: 'ତାପମାତ୍ରା',
    neutral: 'ନିରପେକ୍ଷ',
    acidic: 'ଏସିଡ଼ିକ',
    alkaline: 'କ୍ଷାରୀ',
    low: 'କମ',
    medium: 'ମଧ୍ୟମ',
    good: 'ଭଲ',
    high: 'ଅଧିକ',
    chatPlaceholder: 'ଆପଣଙ୍କ ଚାଷ ସଂକ୍ରାନ୍ତ ପ୍ରଶ୍ନ ଲିଖନ୍ତୁ...',
    send: 'ପଠାନ୍ତୁ',
    askQuestion: 'ପ୍ରଶ୍ନ ଜିଜ୍ଞାସା',
    playAudio: 'ଶୁଣନ୍ତୁ',
    loading: 'ଲୋଡ ହେଉଛି...',
    error: 'ତ୍ରୁଟି',
    retry: 'ପୁଣି ଚେଷ୍ଟା',
    cancel: 'ବାତିଲ',
  },
};

export function t(key: keyof typeof TRANSLATIONS.en, language: Language = 'en'): string {
  return TRANSLATIONS[language]?.[key] ?? TRANSLATIONS['en'][key] ?? key;
}
```

---

## PART 9 — SOIL PARAMETER CONSTANTS

**File:** `constants/SoilParameters.ts`

Extracted from `HistoryChart.tsx` PARAMETER_MAP and `map-component.tsx` pH colors.

```typescript
// ── EXACT FROM HistoryChart.tsx PARAMETER_MAP ──
export const PARAMETER_CONFIG = {
  ph:          { name: 'pH Level',       color: '#3b82f6', unit: '',     chartColor: '#3b82f6' },
  nitrogen:    { name: 'Nitrogen (N)',   color: '#ef4444', unit: ' ppm', chartColor: '#ef4444' },
  phosphorus:  { name: 'Phosphorus (P)', color: '#8b5cf6', unit: ' ppm', chartColor: '#8b5cf6' },
  potassium:   { name: 'Potassium (K)', color: '#f97316', unit: ' ppm', chartColor: '#f97316' },
  moisture:    { name: 'Moisture',       color: '#14b8a6', unit: '%',    chartColor: '#14b8a6' },
} as const;

export type SoilParameter = keyof typeof PARAMETER_CONFIG;

// ── pH COLOR CODES from map-component.tsx getPhColor() ──
// Used for map pins, pH badges, health indicators
export function getPhColor(ph: number): string {
  if (ph < 4.5) return '#DC2626';   // Strongly Acidic — Red
  if (ph < 5.5) return '#EF4444';   // Acidic — Light red
  if (ph < 6.5) return '#22C55E';   // Slightly Acidic — Green ✓
  if (ph < 7.5) return '#3B82F6';   // Neutral — Blue ✓
  if (ph < 8.5) return '#F59E0B';   // Slightly Alkaline — Amber
  return '#B45309';                  // Alkaline — Dark orange
}

// ── pH STATUS TEXT from map-component.tsx getPhStatus() ──
export function getPhStatus(ph: number): string {
  if (ph < 4.5) return 'Strongly Acidic';
  if (ph < 5.5) return 'Acidic';
  if (ph < 6.5) return 'Slightly Acidic';
  if (ph < 7.5) return 'Neutral';
  if (ph < 8.5) return 'Slightly Alkaline';
  return 'Alkaline';
}

// ── pH BADGE COLORS from MessageRenderer.tsx getPhBadgeClass() ──
export function getPhBadgeStyle(ph: number) {
  if (ph < 5.5) return { border: '#ef4444', text: '#b91c1c', bg: '#fef2f2' };
  if (ph < 6.5) return { border: '#f59e0b', text: '#b45309', bg: '#fffbeb' };
  if (ph < 7.5) return { border: '#22c55e', text: '#15803d', bg: '#f0fdf4' };
  if (ph < 8.5) return { border: '#f59e0b', text: '#b45309', bg: '#fffbeb' };
  return { border: '#ef4444', text: '#b91c1c', bg: '#fef2f2' };
}

// ── PROGRESS COLOR from MessageRenderer.tsx getProgressColor() ──
export function getProgressColor(normalizedValue: number): string {
  if (normalizedValue < 30) return '#ef4444';  // red
  if (normalizedValue < 70) return '#f59e0b';  // amber
  return '#22c55e';                             // green
}

// ── OPTIMAL RANGES for soil health score calculation ──
export const OPTIMAL_RANGES = {
  ph:          { min: 6.0, max: 7.5 },
  nitrogen:    { min: 100, max: 280 },
  phosphorus:  { min: 25,  max: 50  },
  potassium:   { min: 120, max: 240 },
  moisture:    { min: 20,  max: 60  },
  temperature: { min: 15,  max: 30  },
  ec:          { min: 0.2, max: 2.0 },
};

// ── Soil health score — 0 to 100 ──
export function calcHealthScore(test: {
  ph: number; nitrogen: number; moisture: number;
  phosphorus?: number; potassium?: number;
}): number {
  let score = 100;
  if (test.ph < 5.5 || test.ph > 8.0) score -= 30;
  else if (test.ph < 6.0 || test.ph > 7.5) score -= 15;
  if (test.moisture < 20 || test.moisture > 80) score -= 20;
  if (test.nitrogen < 100) score -= 15;
  if (test.phosphorus !== undefined && test.phosphorus < 10) score -= 10;
  if (test.potassium !== undefined && test.potassium < 50) score -= 10;
  return Math.max(0, score);
}
```

---

## PART 10 — AI CHAT SCREEN

**File:** `app/(app)/chat.tsx` — Complete rebuild from `chat.tsx` source.

```typescript
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
  Alert, SafeAreaView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuthStore } from '../../store/authStore';
import { sendChatMessage, getSessionMessages, ChatMessage } from '../../services/chat';
import { analyzeSoilFile } from '../../services/soilTests';
import { speak, stop } from '../../services/tts';
import { Language, SUPPORTED_LANGUAGES } from '../../services/i18n';
import { Colors } from '../../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

// ── QUICK ACTIONS from chat.tsx (Droplets, Sprout, Tractor, CloudSun icons) ──
const QUICK_ACTIONS = [
  {
    id: 'fertilizer',
    icon: '💧',
    label: 'Fertilizer Plan',
    prompt: 'Create a detailed fertilizer plan for my soil',
  },
  {
    id: 'pest',
    icon: '🐛',
    label: 'Pest Diagnosis',
    prompt: 'Help me diagnose pest problems in my crops',
  },
  {
    id: 'crop',
    icon: '🌾',
    label: 'Crop Suitability',
    prompt: 'Which crops are most suitable for my soil conditions?',
  },
  {
    id: 'weather',
    icon: '🌤️',
    label: 'Weather Advisory',
    prompt: 'Give me weather-based farming advice for this season',
  },
];

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isPlaying?: boolean;
}

export default function ChatScreen() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [language, setLanguage] = useState<Language>('en');
  const [fileAttachment, setFileAttachment] = useState<{
    name: string; content: any;
  } | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // ── Scroll to bottom ──
  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  // ── SEND MESSAGE ──
  // Exact logic from chat.tsx sendMessageMutation
  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText && !fileAttachment) return;
    if (isLoading) return;

    setInputText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Handle file analysis — from chat.tsx analyzeSoilData
    if (fileAttachment) {
      const userMsg: Message = {
        id: Date.now().toString(),
        text: `📎 Attached: ${fileAttachment.name}`,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);
      setFileAttachment(null);
      setIsLoading(true);

      try {
        const data = await analyzeSoilFile({
          soilData: fileAttachment.content,
          language,
          fileName: fileAttachment.name,
        });
        const aiMsg: Message = {
          id: Date.now().toString() + '-ai',
          text: data.response,
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMsg]);
        if (data.sessionId) setSessionId(data.sessionId);
      } catch (err: any) {
        const errMsg: Message = {
          id: Date.now().toString() + '-err',
          text: `❌ Analysis Error: ${err.message || 'Please try again'}`,
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errMsg]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Regular chat message — from chat.tsx sendMessageMutation
    const userMsg: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const data = await sendChatMessage({
        message: messageText,
        language,
        userId: user?.id || 'demo-user-id',
        sessionId,
      });

      const aiMsg: Message = {
        id: Date.now().toString() + '-ai',
        text: data.response,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
      if (data.sessionId && !sessionId) setSessionId(data.sessionId);

    } catch (err: any) {
      if (err.message === 'SESSION_EXPIRED') {
        // Handle session expiry
        return;
      }
      // Error toast — matches web "Network Issue" toast
      Alert.alert('Network Issue', 'We\'re experiencing high traffic. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── FILE ATTACHMENT ──
  // From chat.tsx handleFileUpload
  const handleFileAttach = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/csv', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        const content = await fetch(file.uri).then(r => r.text());
        let parsed: any = content;
        try { parsed = JSON.parse(content); } catch {}

        setFileAttachment({ name: file.name, content: parsed });
      }
    } catch (err) {
      Alert.alert('Error', 'Could not open file');
    }
  };

  // ── AUDIO PLAYBACK ──
  // From chat.tsx + useSpeech hook
  const handlePlayAudio = async (text: string, messageId: string) => {
    if (isPlaying && currentPlayingId === messageId) {
      await stop();
      setIsPlaying(false);
      setCurrentPlayingId(null);
      return;
    }

    setIsPlaying(true);
    setCurrentPlayingId(messageId);
    try {
      await speak(text, language);
    } finally {
      setIsPlaying(false);
      setCurrentPlayingId(null);
    }
  };

  // ── NEW CHAT ──
  const handleNewChat = () => {
    setMessages([]);
    setSessionId(undefined);
    stop();
  };

  // ── RENDER MESSAGE ──
  // Simplified port of MessageRenderer.tsx
  const renderMessage = ({ item }: { item: Message }) => {
    const isAI = item.sender === 'ai';
    const isThisPlaying = isPlaying && currentPlayingId === item.id;

    return (
      <View style={[styles.msgRow, isAI ? styles.msgRowAI : styles.msgRowUser]}>
        {isAI && (
          <View style={styles.aiAvatar}>
            <Text style={{ fontSize: 16 }}>🌱</Text>
          </View>
        )}

        <View style={[
          styles.bubble,
          isAI ? styles.bubbleAI : styles.bubbleUser,
        ]}>
          <Text style={isAI ? styles.bubbleTextAI : styles.bubbleTextUser}>
            {item.text}
          </Text>

          {/* Audio button — from MessageRenderer.tsx */}
          {isAI && (
            <TouchableOpacity
              style={styles.audioBtn}
              onPress={() => handlePlayAudio(item.text, item.id)}
            >
              <Text style={styles.audioBtnText}>
                {isThisPlaying ? '⏸ Pause' : `🔊 Read aloud`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {!isAI && (
          <View style={styles.userAvatar}>
            <Text style={{ fontSize: 16 }}>👨‍🌾</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Text style={{ fontSize: 18 }}>🌱</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Saathi AI</Text>
            <Text style={styles.headerSub}>● Online · Agricultural Expert</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {/* Language picker */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              // Cycle through languages: en → hi → od → en
              const langs: Language[] = ['en', 'hi', 'od'];
              const nextIdx = (langs.indexOf(language) + 1) % langs.length;
              setLanguage(langs[nextIdx]);
            }}
          >
            <Text style={{ fontSize: 18 }}>🌐</Text>
          </TouchableOpacity>
          {/* New chat */}
          <TouchableOpacity style={styles.iconBtn} onPress={handleNewChat}>
            <Text style={{ fontSize: 18 }}>✏️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.messageList,
            messages.length === 0 && styles.messageListEmpty,
          ]}
          ListEmptyComponent={
            <View style={styles.welcome}>
              <Text style={styles.welcomeTitle}>Namaste! 🙏</Text>
              <Text style={styles.welcomeSub}>How can Saathi AI help your farm today?</Text>
              <View style={styles.quickGrid}>
                {QUICK_ACTIONS.map(action => (
                  <TouchableOpacity
                    key={action.id}
                    style={styles.quickCard}
                    onPress={() => handleSend(action.prompt)}
                  >
                    <Text style={{ fontSize: 28, marginBottom: 8 }}>{action.icon}</Text>
                    <Text style={styles.quickCardLabel}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          ListFooterComponent={
            isLoading ? (
              <View style={[styles.msgRow, styles.msgRowAI]}>
                <View style={styles.aiAvatar}>
                  <Text style={{ fontSize: 16 }}>🌱</Text>
                </View>
                <View style={[styles.bubble, styles.bubbleAI]}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              </View>
            ) : null
          }
        />

        {/* File attachment preview */}
        {fileAttachment && (
          <View style={styles.attachPreview}>
            <Text style={styles.attachName}>📎 {fileAttachment.name}</Text>
            <TouchableOpacity onPress={() => setFileAttachment(null)}>
              <Text style={styles.attachRemove}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar — the missing component from before */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={styles.inputIconBtn} onPress={handleFileAttach}>
            <Text style={{ fontSize: 20 }}>📎</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Type your farming question... (${language.toUpperCase()})`}
            placeholderTextColor="#B0C4B8"
            multiline
            maxHeight={100}
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() && !fileAttachment) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() && !fileAttachment || isLoading}
          >
            {isLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={{ fontSize: 18, color: '#fff' }}>➤</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#C8E6D0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#1A2E1E' },
  headerSub: { fontFamily: 'Sora_400Regular', fontSize: 11, color: '#1A5C35' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F0FBF4', alignItems: 'center', justifyContent: 'center',
  },

  messageList: { padding: 16, paddingBottom: 8 },
  messageListEmpty: { flex: 1, justifyContent: 'center' },

  welcome: { alignItems: 'center', paddingVertical: 32 },
  welcomeTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 24, color: '#1A2E1E', marginBottom: 6 },
  welcomeSub: { fontFamily: 'Sora_400Regular', fontSize: 14, color: '#6B8A72', marginBottom: 28 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  quickCard: {
    width: '45%', backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#C8E6D0',
  },
  quickCardLabel: { fontFamily: 'Sora_700Bold', fontSize: 12, color: '#1A2E1E', textAlign: 'center' },

  msgRow: { flexDirection: 'row', marginBottom: 16, gap: 8, alignItems: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start' },
  msgRowUser: { justifyContent: 'flex-end' },
  aiAvatar: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#1A5C35', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  userAvatar: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#F4A02D', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  bubble: { maxWidth: '72%', padding: 12, borderRadius: 16 },
  bubbleAI: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#C8E6D0',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: { backgroundColor: '#1A5C35', borderBottomRightRadius: 4 },
  bubbleTextAI: { fontFamily: 'Sora_400Regular', fontSize: 13, color: '#1A2E1E', lineHeight: 20 },
  bubbleTextUser: { fontFamily: 'Sora_400Regular', fontSize: 13, color: '#FFFFFF', lineHeight: 20 },
  audioBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  audioBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: 11, color: '#1A5C35' },

  attachPreview: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#E8F5EE', paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#C8E6D0',
  },
  attachName: { fontFamily: 'Sora_500Medium', fontSize: 13, color: '#1A5C35', flex: 1 },
  attachRemove: { fontSize: 16, color: '#6B8A72', marginLeft: 8 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#C8E6D0',
  },
  inputIconBtn: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: '#F0FBF4', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 100,
    backgroundColor: '#F0FBF4', borderWidth: 1.5, borderColor: '#C8E6D0',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    fontFamily: 'Sora_400Regular', fontSize: 13, color: '#1A2E1E',
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: '#1A5C35', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  sendBtnDisabled: { backgroundColor: '#C8E6D0' },
});
```

---

## PART 11 — HISTORY CHARTS (React Native port of HistoryChart.tsx)

**File:** `components/SoilChart.tsx`

Ported from `HistoryChart.tsx` — uses `react-native-chart-kit` instead of Recharts.

```typescript
import React from 'react';
import { View, Text, ScrollView, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { format } from 'date-fns';
import { SoilTest } from '../services/soilTests';
import { PARAMETER_CONFIG, SoilParameter } from '../constants/SoilParameters';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface SoilChartProps {
  data: SoilTest[];
  parameter: SoilParameter;
}

export function SoilChart({ data, parameter }: SoilChartProps) {
  const config = PARAMETER_CONFIG[parameter];

  if (!data || data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No tests found for the selected period.</Text>
      </View>
    );
  }

  // Sort by date (oldest first for chart)
  const sorted = [...data].sort((a, b) =>
    new Date(a.testDate).getTime() - new Date(b.testDate).getTime()
  );

  const labels = sorted.map(t => format(new Date(t.testDate), 'MMM d'));
  const values = sorted.map(t => {
    const v = t[parameter as keyof SoilTest] as number;
    return typeof v === 'number' ? v : 0;
  });

  const chartData = {
    labels,
    datasets: [{ data: values, color: () => config.color, strokeWidth: 2 }],
  };

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#F0FBF4',
    decimalPlaces: 1,
    color: () => config.color,
    labelColor: () => '#6B8A72',
    style: { borderRadius: 16 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: config.color },
    propsForBackgroundLines: { stroke: '#E8F5EE' },
  };

  return (
    <View>
      <Text style={styles.chartTitle}>{config.name} Trend</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={chartData}
          width={Math.max(SCREEN_WIDTH - 32, sorted.length * 60)}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={true}
          withHorizontalLines={true}
          withDots={true}
          withShadow={false}
        />
      </ScrollView>
      <Text style={styles.unit}>Unit: {config.unit || 'value'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    height: 160, backgroundColor: '#F0FBF4', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyText: { fontFamily: 'Sora_400Regular', fontSize: 13, color: '#6B8A72' },
  chartTitle: { fontFamily: 'Sora_700Bold', fontSize: 14, color: '#1A2E1E', marginBottom: 8 },
  chart: { borderRadius: 16 },
  unit: { fontFamily: 'Sora_400Regular', fontSize: 11, color: '#6B8A72', marginTop: 4 },
});
```

---

## PART 12 — MAP (Leaflet WebView — replaces Google Maps)

**File:** `components/SoilMap.tsx`

The web uses Google Maps (paid API). Mobile port uses Leaflet via WebView (free, no API key).  
pH color codes extracted exactly from `map-component.tsx`.

```typescript
import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { SoilTest } from '../services/soilTests';
import { getPhColor, getPhStatus } from '../constants/SoilParameters';

interface SoilMapProps {
  tests: SoilTest[];
  height?: number;
}

// ── pH Color Legend from map-component.tsx ──
const PH_LEGEND = [
  { color: '#DC2626', label: 'Strongly Acidic (<4.5)' },
  { color: '#EF4444', label: 'Acidic (4.5–5.5)' },
  { color: '#22C55E', label: 'Slightly Acidic (5.5–6.5)' },
  { color: '#3B82F6', label: 'Neutral (6.5–7.5)' },
  { color: '#F59E0B', label: 'Slightly Alkaline (7.5–8.5)' },
  { color: '#B45309', label: 'Alkaline (>8.5)' },
];

function generateLeafletHTML(tests: SoilTest[]): string {
  const validTests = tests.filter(t => t.latitude && t.longitude);

  // Center on Odisha if no tests
  const centerLat = validTests[0]?.latitude ?? 20.2961;
  const centerLng = validTests[0]?.longitude ?? 85.8245;
  const zoom = validTests.length > 0 ? 12 : 7;

  // Build markers JS
  const markersJS = validTests.map(t => {
    const color = getPhColor(t.ph);
    const status = getPhStatus(t.ph);
    const date = new Date(t.testDate).toLocaleDateString('en-IN');
    const popup = `<b>pH: ${t.ph.toFixed(1)}</b><br>${status}<br>` +
      `N: ${t.nitrogen} | P: ${t.phosphorus} | K: ${t.potassium}<br>` +
      `${t.location || ''}<br>${date}`;
    return `
      L.circleMarker([${t.latitude}, ${t.longitude}], {
        radius: 10, fillColor: '${color}', color: '#fff',
        weight: 2, opacity: 1, fillOpacity: 0.85
      }).bindPopup('${popup.replace(/'/g, "\\'")}').addTo(map);
    `;
  }).join('\n');

  return `<!DOCTYPE html><html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:100%; height:100%; }
    #map { width:100%; height:100vh; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl:true, attributionControl:false })
               .setView([${centerLat}, ${centerLng}], ${zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:19, crossOrigin:true
    }).addTo(map);

    ${markersJS}

    // Fix grey tiles on mobile WebView (critical fix from previous bug)
    setTimeout(function(){ map.invalidateSize(); }, 300);
  </script>
</body>
</html>`;
}

export function SoilMap({ tests, height = 280 }: SoilMapProps) {
  const validTests = tests.filter(t => t.latitude && t.longitude);

  if (validTests.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={{ fontSize: 36, marginBottom: 10 }}>🗺️</Text>
        <Text style={styles.emptyTitle}>No GPS-Tagged Tests Yet</Text>
        <Text style={styles.emptyBody}>
          Run a soil test with location enabled to see your fields on the map.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <WebView
        source={{ html: generateLeafletHTML(tests) }}
        style={{ height, borderRadius: 12 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        originWhitelist={['*']}
        scalesPageToFit={false}
        scrollEnabled={true}
        onError={e => console.warn('[SoilMap WebView]', e.nativeEvent)}
      />
      {/* pH Legend — from map-component.tsx */}
      <View style={styles.legend}>
        {PH_LEGEND.map((item, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: '#F0FBF4', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  emptyTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#1A2E1E', textAlign: 'center', marginBottom: 6 },
  emptyBody: { fontFamily: 'Sora_400Regular', fontSize: 12, color: '#6B8A72', textAlign: 'center', lineHeight: 18 },
  legend: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginTop: 8,
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontFamily: 'Sora_400Regular', fontSize: 10, color: '#6B8A72' },
});
```

---

## PART 13 — LIVE CONNECT SCREEN (Full BLE flow)

**File:** `app/(app)/connect.tsx`

```typescript
import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ScrollView, SafeAreaView, ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat,
  withTiming, withDelay, Easing, useEffect as useAnimatedEffect,
} from 'react-native-reanimated';
import { useBLE } from '../../hooks/useBLE';
import { saveSoilTest } from '../../services/soilTests';
import { useAuthStore } from '../../store/authStore';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { getPhColor, getPhStatus, calcHealthScore } from '../../constants/SoilParameters';

// ── BLE radar animation ──
function BLERadarAnimation({ isScanning }: { isScanning: boolean }) {
  const rings = [0, 1, 2].map(() => ({
    scale: useSharedValue(0.4),
    opacity: useSharedValue(0.7),
  }));

  React.useEffect(() => {
    if (isScanning) {
      rings.forEach((ring, i) => {
        ring.scale.value = withDelay(i * 500,
          withRepeat(withTiming(2.0, { duration: 1800, easing: Easing.out(Easing.ease) }), -1, false)
        );
        ring.opacity.value = withDelay(i * 500,
          withRepeat(withTiming(0, { duration: 1800 }), -1, false)
        );
      });
    } else {
      rings.forEach(ring => {
        ring.scale.value = 0.4;
        ring.opacity.value = 0.7;
      });
    }
  }, [isScanning]);

  return (
    <View style={radarStyles.container}>
      {rings.map((ring, i) => {
        const style = useAnimatedStyle(() => ({
          position: 'absolute',
          width: 100, height: 100, borderRadius: 50,
          borderWidth: 1.5,
          borderColor: `rgba(26, 92, 53, ${ring.opacity.value * 0.5})`,
          transform: [{ scale: ring.scale.value }],
        }));
        return <Animated.View key={i} style={style} />;
      })}
      <View style={radarStyles.center}>
        <Text style={{ fontSize: 40 }}>📡</Text>
      </View>
    </View>
  );
}

const radarStyles = StyleSheet.create({
  container: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  center: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
});

export default function ConnectScreen() {
  const { user } = useAuthStore();
  const { connectionStatus, soilData, connect, readData, disconnect, reset, isConnected, isComplete } = useBLE();

  const isScanning = connectionStatus.status === 'scanning';
  const isTransferring = connectionStatus.status === 'transferring';

  // ── SAVE TO DATABASE ──
  // Exact flow from connect.tsx: save then navigate to chat
  const handleSaveAndAnalyze = useCallback(async () => {
    if (!soilData || !user?.id) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const result = await saveSoilTest({
        deviceId: soilData.rawBluetoothData?.deviceId || 'Agni-01',
        ph: soilData.ph,
        nitrogen: soilData.nitrogen,
        phosphorus: soilData.phosphorus,
        potassium: soilData.potassium,
        moisture: soilData.moisture,
        temperature: soilData.temperature,
        ec: soilData.ec,
        latitude: soilData.location?.latitude,
        longitude: soilData.location?.longitude,
        rawData: soilData.rawBluetoothData,
      });

      // Navigate to AI chat with soil analysis context
      // (matches web behavior: Connect → Chat with analysis)
      router.push({
        pathname: '/(app)/chat',
        params: {
          soilTestId: result.soilTest.id,
          autoAnalyze: 'true',
        },
      });
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save soil test');
    }
  }, [soilData, user]);

  // ── SOIL DATA DISPLAY ──
  const renderSoilData = () => {
    if (!soilData) return null;
    const score = calcHealthScore(soilData);
    const phColor = getPhColor(soilData.ph);
    const phStatus = getPhStatus(soilData.ph);

    return (
      <View style={styles.soilCard}>
        <Text style={styles.soilCardTitle}>Soil Analysis Results</Text>

        {/* pH prominent display */}
        <View style={[styles.phRow, { borderColor: phColor + '40' }]}>
          <Text style={styles.phLabel}>pH Level</Text>
          <Text style={[styles.phValue, { color: phColor }]}>{soilData.ph.toFixed(1)}</Text>
          <Text style={[styles.phStatus, { color: phColor }]}>{phStatus}</Text>
        </View>

        {/* Parameters grid */}
        <View style={styles.paramsGrid}>
          {[
            { label: 'Nitrogen', value: soilData.nitrogen, unit: 'ppm' },
            { label: 'Phosphorus', value: soilData.phosphorus, unit: 'ppm' },
            { label: 'Potassium', value: soilData.potassium, unit: 'ppm' },
            { label: 'Moisture', value: soilData.moisture, unit: '%' },
            { label: 'Temperature', value: soilData.temperature, unit: '°C' },
            { label: 'EC', value: soilData.ec, unit: 'µS/cm' },
          ].map(param => (
            <View key={param.label} style={styles.paramBox}>
              <Text style={styles.paramLabel}>{param.label}</Text>
              <Text style={styles.paramValue}>{param.value?.toFixed(1)}</Text>
              <Text style={styles.paramUnit}>{param.unit}</Text>
            </View>
          ))}
        </View>

        {/* Health score */}
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>Health Score</Text>
          <Text style={[styles.scoreValue, {
            color: score >= 75 ? '#1A5C35' : score >= 50 ? '#E65100' : '#C62828'
          }]}>{score}/100</Text>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.analyzeBtn} onPress={handleSaveAndAnalyze}>
          <Text style={styles.analyzeBtnText}>🤖 Save & Get AI Analysis</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.retryBtn} onPress={reset}>
          <Text style={styles.retryBtnText}>🔄 New Scan</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Live Connect</Text>
          <Text style={styles.subtitle}>Pair with AGNI-SOIL-SENSOR</Text>
        </View>

        {/* BLE Card */}
        {!isComplete ? (
          <View style={styles.bleCard}>
            <BLERadarAnimation isScanning={isScanning} />
            <Text style={styles.bleStatus}>{connectionStatus.message}</Text>
            <Text style={styles.bleSub}>{connectionStatus.subMessage}</Text>

            {/* Progress bar during transfer */}
            {isTransferring && connectionStatus.progress !== undefined && (
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${connectionStatus.progress}%` as any }]} />
              </View>
            )}

            {/* Action button */}
            {connectionStatus.status === 'idle' || connectionStatus.status === 'error' ? (
              <TouchableOpacity style={styles.scanBtn} onPress={connect}>
                <Text style={styles.scanBtnText}>📡 Scan for Agni Device</Text>
              </TouchableOpacity>
            ) : connectionStatus.status === 'connected' ? (
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.scanBtn} onPress={readData}>
                  <Text style={styles.scanBtnText}>⬇ Read Soil Data</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.disconnectBtn} onPress={disconnect}>
                  <Text style={styles.disconnectBtnText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            ) : connectionStatus.status === 'scanning' || connectionStatus.status === 'connecting' || isTransferring ? (
              <TouchableOpacity style={[styles.scanBtn, { backgroundColor: '#6B8A72' }]} onPress={reset}>
                <Text style={styles.scanBtnText}>⏹ Stop</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          renderSoilData()
        )}

        {/* Quick Start Guide */}
        {(connectionStatus.status === 'idle' || connectionStatus.status === 'error') && (
          <View style={styles.guideCard}>
            <Text style={styles.guideTitle}>✨ Quick Start Guide</Text>
            {[
              { step: 1, color: '#4CAF50', text: 'Power on Agni — hold orange button 2 seconds' },
              { step: 2, color: '#2196F3', text: 'Tap Scan, select AGNI-SOIL-SENSOR from list' },
              { step: 3, color: '#FF9800', text: 'Insert probes into soil — data transfers automatically' },
            ].map(item => (
              <View key={item.step} style={styles.guideStep}>
                <View style={[styles.stepBadge, { backgroundColor: item.color + '33' }]}>
                  <Text style={[styles.stepNum, { color: item.color }]}>{item.step}</Text>
                </View>
                <Text style={styles.stepText}>{item.text}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FBF4' },
  scroll: { padding: 16, paddingBottom: 96 },
  header: { marginBottom: 16 },
  title: { fontFamily: 'Sora_800ExtraBold', fontSize: 24, color: '#1A2E1E', letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Sora_400Regular', fontSize: 13, color: '#6B8A72', marginTop: 2 },

  bleCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#1A5C35', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  bleStatus: { fontFamily: 'Sora_700Bold', fontSize: 16, color: '#1A2E1E', marginTop: 16, textAlign: 'center' },
  bleSub: { fontFamily: 'Sora_400Regular', fontSize: 13, color: '#6B8A72', marginTop: 4, textAlign: 'center', marginBottom: 20 },
  progressBar: { width: '100%', height: 6, backgroundColor: '#E8F5EE', borderRadius: 3, marginBottom: 16 },
  progressFill: { height: '100%', backgroundColor: '#1A5C35', borderRadius: 3 },
  scanBtn: {
    width: '100%', height: 54, backgroundColor: '#1A5C35',
    borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  scanBtnText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#fff' },
  btnRow: { width: '100%', gap: 10 },
  disconnectBtn: {
    width: '100%', height: 44, backgroundColor: '#F0FBF4',
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#C8E6D0',
  },
  disconnectBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: '#6B8A72' },

  soilCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#1A5C35', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  soilCardTitle: { fontFamily: 'Sora_700Bold', fontSize: 16, color: '#1A2E1E', marginBottom: 14 },
  phRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F0FBF4', borderRadius: 12, padding: 14, marginBottom: 14,
    borderWidth: 1.5,
  },
  phLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: '#6B8A72' },
  phValue: { fontFamily: 'Sora_800ExtraBold', fontSize: 28 },
  phStatus: { fontFamily: 'Sora_600SemiBold', fontSize: 12 },
  paramsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  paramBox: {
    width: '30%', backgroundColor: '#F0FBF4', borderRadius: 12, padding: 10, alignItems: 'center',
  },
  paramLabel: { fontFamily: 'Sora_400Regular', fontSize: 10, color: '#6B8A72', marginBottom: 2 },
  paramValue: { fontFamily: 'Sora_800ExtraBold', fontSize: 16, color: '#1A2E1E' },
  paramUnit: { fontFamily: 'Sora_400Regular', fontSize: 10, color: '#6B8A72' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  scoreLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: '#6B8A72' },
  scoreValue: { fontFamily: 'Sora_800ExtraBold', fontSize: 20 },
  analyzeBtn: {
    height: 52, backgroundColor: '#1A5C35', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  analyzeBtnText: { fontFamily: 'Sora_700Bold', fontSize: 14, color: '#fff' },
  retryBtn: {
    height: 44, backgroundColor: '#F0FBF4', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#C8E6D0',
  },
  retryBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: '#6B8A72' },

  guideCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    shadowColor: '#1A5C35', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  guideTitle: { fontFamily: 'Sora_700Bold', fontSize: 14, color: '#1A2E1E', marginBottom: 14 },
  guideStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  stepBadge: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNum: { fontFamily: 'Sora_800ExtraBold', fontSize: 13 },
  stepText: { fontFamily: 'Sora_400Regular', fontSize: 13, color: '#1A2E1E', flex: 1, lineHeight: 20 },
});
```

---

## PART 14 — PACKAGES TO INSTALL

```bash
# BLE
npm install react-native-ble-plx

# Charts
npm install react-native-chart-kit
npx expo install react-native-svg

# WebView (for Leaflet map)
npx expo install react-native-webview

# Location (for GPS tagging)
npx expo install expo-location

# Haptics
npx expo install expo-haptics

# Speech
npx expo install expo-speech

# Secure Storage
npx expo install expo-secure-store

# Document Picker (for JSON file upload in chat)
npx expo install expo-document-picker

# Date formatting (same as web)
npm install date-fns

# Animation (already likely installed)
npx expo install react-native-reanimated

# Safe area
npx expo install react-native-safe-area-context

# Async Storage
npx expo install @react-native-async-storage/async-storage

# PDF Export
npx expo install expo-print expo-sharing
```

---

## PART 15 — CRITICAL FIXES CHECKLIST

Based on all source code analysis, these are the exact issues and fixes:

### Fix A — AI Chat input bar missing (P0)
**Root cause confirmed:** Looking at `chat.tsx` lines 100–110: sidebar is rendered at root level. In the app, the input bar condition `messages.length > 0` hides it on welcome screen.  
**Fix:** Use the complete ChatScreen from Part 10 above. Input bar is always rendered outside FlatList, never conditional.

### Fix B — Map grey box (P1)
**Root cause confirmed:** `map-component.tsx` uses Google Maps API which requires billing. Mobile needs Leaflet.  
**Fix:** Use `SoilMap` component from Part 12. The `map.invalidateSize()` with 300ms timeout is the critical fix for grey tiles.

### Fix C — BLE crash (P0)
**Root cause confirmed:** Web uses `navigator.bluetooth` (Web Bluetooth API). React Native needs `react-native-ble-plx`.  
**Fix:** Use `useBLE` hook from Part 6. In `__DEV__` mode it simulates data (same values as web `simulateReadSoilData()`).

### Fix D — Duplicate headers (P2)
**Fix:** Search for duplicate Text elements with identical content. Delete one occurrence.

### Fix E — TTS broken (P1)
**Root cause:** Web uses `window.speechSynthesis`. React Native needs `expo-speech`.  
**Fix:** Use `tts.ts` from Part 7. Same chunking logic (200 chars), same rate values (en: 0.8, hi/od: 0.75).

---

## COMPLETE API ENDPOINT REFERENCE

Every endpoint from `routes.ts` that the app needs:

```
AUTH:
  POST /api/auth/send-otp           → { ok, otpId, expiresIn:180, provider }
  POST /api/auth/verify-otp         → { ok, token?, user? }
  POST /api/auth/register           → { ok, token, user }
  POST /api/auth/login              → { ok, token, user }
  POST /api/auth/refresh            → { token, refreshToken }
  POST /api/auth/send-password-change-otp → { ok, otpId, expiresIn }
  POST /api/auth/change-password    → { ok, message, user }
  GET  /api/auth/google/callback    → OAuth
  GET  /api/auth/facebook/callback  → OAuth
  GET  /api/auth/x/callback         → OAuth

USER:
  GET  /api/dashboard               → { message, user, status, aiStatus }
  PUT  /api/user                    → { ok, user }
  DELETE /api/user                  → { ok, message }
  GET  /api/user/data?format=json   → JSON download
  GET  /api/user/data?format=csv    → CSV download
  GET  /api/settings                → { aiPricingEnabled }
  GET  /api/privacy-settings        → privacy booleans
  PUT  /api/privacy-settings        → updated privacy settings
  POST /api/users/device            → { success } (push token)

SOIL TESTS:
  POST /api/soil-tests              → { soilTest, recommendations }
  GET  /api/soil-tests/:userId      → SoilTest[] (with nested recommendation)
  GET  /api/soil-tests/test/:id     → SoilTest & { recommendation }
  POST /api/recommendations/generate → AiRecommendation
  POST /api/analyze-soil-file       → { response, sessionId?, locationData? }

CHAT:
  POST /api/chat                    → { response, sessionId? }
  GET  /api/chat/sessions           → ChatSession[] (with messageCount)
  POST /api/chat/sessions           → ChatSession
  GET  /api/chat/sessions/:id/messages → ChatMessage[]
  DELETE /api/chat/sessions/:id     → { success: true }

MISC:
  GET  /api/config                  → { smsProvider, oauth: {google,facebook,x} }
```

---

*Complete Enhancement Document · Extracted from 19 source files*  
*saathiai.org codebase → Saathi AI Native App*  
*Mitti-AI Innovations · March 2026*
