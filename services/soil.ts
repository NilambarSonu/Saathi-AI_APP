import { apiCall } from './api';

export interface SoilTest {
  id: string;
  userId: string;
  n: number;
  p: number;
  k: number;
  ph: number;
  moisture: number;
  temperature: number;
  deviceId?: string;
  locationDetails?: string;
  createdAt: string;
}

/**
 * Get all soil tests for the current user
 */
export async function getSoilTests(): Promise<SoilTest[]> {
  return apiCall<SoilTest[]>('/api/soil-tests');
}

/**
 * Get a specific soil test by ID
 */
export async function getSoilTest(id: string): Promise<SoilTest> {
  return apiCall<SoilTest>(`/api/soil-tests/${id}`);
}

/**
 * Save a new soil test record
 */
export async function saveSoilTest(data: Omit<SoilTest, 'id' | 'userId' | 'createdAt'>): Promise<SoilTest> {
  return apiCall<SoilTest>('/api/soil-tests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
