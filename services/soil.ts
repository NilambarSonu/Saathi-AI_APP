import { api, apiCall } from './api';

export interface SoilTest {
  id: string;
  userId: string;
  n: number;
  p: number;
  k: number;
  ph: number;
  moisture: number;
  temperature: number;
  latitude?: number | null;
  longitude?: number | null;
  deviceId?: string;
  locationDetails?: string;
  createdAt: string;
}

/**
 * Get all soil tests for the current user
 */
export async function getSoilTests(userId?: string): Promise<SoilTest[]> {
  const normalizedUserId = typeof userId === 'string' ? userId.trim() : '';
  const endpoint = normalizedUserId.length > 0
    ? `/soil-tests/${encodeURIComponent(normalizedUserId)}`
    : '/soil-tests';
  return apiCall<SoilTest[]>(endpoint);
}

/**
 * Get a specific soil test by ID
 */
export async function getSoilTest(id: string): Promise<SoilTest> {
  return apiCall<SoilTest>(`/soil-tests/${id}`);
}

/**
 * Save a new soil test record
 */
export async function saveSoilTest(data: Omit<SoilTest, 'id' | 'userId' | 'createdAt'>): Promise<SoilTest> {
  return apiCall<SoilTest>('/soil-tests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

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

export async function sendSoilDataToPipeline(input: SoilPipelinePayload) {
  const payload = normalizeSoilPayload(input);
  return api.soilTests(payload);
}
