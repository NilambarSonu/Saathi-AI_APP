import apiClient from '@/api/axiosConfig';
import { subDays } from 'date-fns';

// ─── Backend API shape: GET /api/soil-tests/:userId ───────────────────────────
export interface SoilTestRecommendation {
  id: string;
  soilTestId: string;
  language: string;
  naturalFertilizers: Array<{ name: string; amount: string; description: string }> | null;
  chemicalFertilizers: Array<{ name: string; amount: string; description: string }> | null;
  applicationInstructions: string | null;
  recommendations: string | null;
  createdAt: string;
}

export interface SoilTest {
  // Identifiers
  id: string;
  userId: string;
  deviceId: string;

  // Timestamp (backend uses testDate)
  testDate: string;

  // Soil parameters (backend uses full names)
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  moisture: number;
  temperature: number;
  ec: number | null;

  // GPS
  latitude: number | null;
  longitude: number | null;
  location: string | null;

  // Pricing
  recommendedPriceInr: number | null;
  priceCapReason: string | null;
  priceDisplayText: { en: string; hi: string; od: string } | null;
  priceLocked: boolean;
  testType: string | null;
  pricingCalculationFactors: object | null;

  // Embedded AI recommendation (server-joined)
  recommendation: SoilTestRecommendation | null;

  // ── Legacy compat aliases (kept so old callers don't break) ──
  /** @deprecated use nitrogen */
  n?: number;
  /** @deprecated use phosphorus */
  p?: number;
  /** @deprecated use potassium */
  k?: number;
  /** @deprecated use testDate */
  createdAt?: string;
  /** @deprecated not returned by API */
  healthScore?: number;
  /** @deprecated not returned by API */
  status?: string;
  /** @deprecated use recommendation.recommendations */
  locationDetails?: string;
}

// ─── Normaliser: makes every test safe to render regardless of field shape ────
export function normalizeSoilTest(raw: any): SoilTest {
  return {
    id: raw.id,
    userId: raw.userId,
    deviceId: raw.deviceId,
    testDate: raw.testDate ?? raw.createdAt ?? new Date().toISOString(),
    ph: Number(raw.ph ?? 0),
    nitrogen: Number(raw.nitrogen ?? raw.n ?? 0),
    phosphorus: Number(raw.phosphorus ?? raw.p ?? 0),
    potassium: Number(raw.potassium ?? raw.k ?? 0),
    moisture: Number(raw.moisture ?? 0),
    temperature: Number(raw.temperature ?? 0),
    ec: raw.ec != null ? Number(raw.ec) : null,
    latitude: raw.latitude != null ? Number(raw.latitude) : null,
    longitude: raw.longitude != null ? Number(raw.longitude) : null,
    location: raw.location ?? null,
    recommendedPriceInr: raw.recommendedPriceInr ?? null,
    priceCapReason: raw.priceCapReason ?? null,
    priceDisplayText: raw.priceDisplayText ?? null,
    priceLocked: raw.priceLocked ?? false,
    testType: raw.testType ?? null,
    pricingCalculationFactors: raw.pricingCalculationFactors ?? null,
    recommendation: raw.recommendation ?? null,
    // legacy compat
    n: Number(raw.nitrogen ?? raw.n ?? 0),
    p: Number(raw.phosphorus ?? raw.p ?? 0),
    k: Number(raw.potassium ?? raw.k ?? 0),
    createdAt: raw.testDate ?? raw.createdAt ?? new Date().toISOString(),
    locationDetails: raw.locationDetails,
  };
}

/**
 * GET /api/soil-tests/:userId — Fetch all soil tests for a user.
 * Requires Authorization header (handled by axiosConfig interceptor).
 */
export async function getSoilTests(userId?: string): Promise<SoilTest[]> {
  const normalizedUserId = typeof userId === 'string' ? userId.trim() : '';
  const endpoint = normalizedUserId.length > 0
    ? `/api/soil-tests/${encodeURIComponent(normalizedUserId)}`
    : '/api/soil-tests';
  const { data } = await apiClient.get<any>(endpoint);
  const raw: any[] = Array.isArray(data) ? data : (data?.tests ?? []);
  return raw.map(normalizeSoilTest);
}

/**
 * GET /api/soil-tests/test/:id — Fetch a single soil test with full detail.
 */
export async function getSoilTest(id: string): Promise<SoilTest> {
  const { data } = await apiClient.get<any>(`/api/soil-tests/test/${id}`);
  return normalizeSoilTest(data?.test ?? data);
}

/**
 * POST /api/soil-tests — Save a new soil test record.
 */
export async function saveSoilTest(
  payload: Omit<SoilTest, 'id' | 'userId' | 'testDate' | 'createdAt'>
): Promise<SoilTest> {
  const { data } = await apiClient.post<any>('/api/soil-tests', payload);
  return normalizeSoilTest(data?.test ?? data);
}

// ─── Client-side helpers ──────────────────────────────────────────────────────

/**
 * Filter tests by a date range string ('30' | '90' | '365' | 'all').
 * Returns newest-first sorted array.
 */
export function filterByRange(tests: SoilTest[], rangeStr: string): SoilTest[] {
  const sorted = [...tests].sort(
    (a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime()
  );
  if (rangeStr === 'all') return sorted;
  const days = parseInt(rangeStr, 10);
  const cutoff = subDays(new Date(), days);
  return sorted.filter(t => t.testDate && new Date(t.testDate) >= cutoff);
}

type StatKey = 'nitrogen' | 'phosphorus' | 'potassium' | 'ph' | 'moisture';

/**
 * Compute average, total, and half-period improvement for any parameter.
 */
export function computeStats(tests: SoilTest[], parameter: StatKey) {
  if (!tests.length) return { average: 0, total: 0, improvement: 0 };

  const total = tests.length;
  const average = tests.reduce((s, t) => s + (t[parameter] ?? 0), 0) / total;

  let improvement = 0;
  if (total > 1) {
    const chrono = [...tests].sort(
      (a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime()
    );
    const mid = Math.ceil(total / 2);
    const fAvg = chrono.slice(0, mid).reduce((s, t) => s + (t[parameter] ?? 0), 0) / mid;
    const sLen = total - mid;
    const sAvg = chrono.slice(mid).reduce((s, t) => s + (t[parameter] ?? 0), 0) / sLen;
    improvement = sAvg - fAvg;
  }

  return { average, total, improvement };
}

// ─── Soil Pipeline Helpers ────────────────────────────────────────────────────

type SoilPipelinePayload = {
  deviceId?: string;
  ph?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  moisture?: number;
  temperature?: number;
  ec?: number;
  latitude?: number;
  longitude?: number;
  location?: string;
  rawData?: any;
};

function toNum(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeSoilPayload(input: SoilPipelinePayload): Record<string, any> {
  return {
    deviceId: input.deviceId || 'AGNI-SOIL-SENSOR',
    ph: toNum(input.ph),
    nitrogen: toNum(input.nitrogen),
    phosphorus: toNum(input.phosphorus),
    potassium: toNum(input.potassium),
    moisture: toNum(input.moisture),
    temperature: toNum(input.temperature),
    ec: toNum(input.ec),
    latitude: input.latitude,
    longitude: input.longitude,
    location: input.location,
    rawData: input.rawData,
  };
}

/**
 * POST /api/soil-tests — Full pipeline: normalize → save.
 */
export async function sendSoilDataToPipeline(input: SoilPipelinePayload): Promise<SoilTest> {
  const payload = normalizeSoilPayload(input);
  const { data } = await apiClient.post<any>('/api/soil-tests', payload);
  return normalizeSoilTest(data?.test ?? data);
}
