import { apiCall } from './api';

export interface DashboardStats {
  farms: number;
  tests: number;
  aiTips: number;
  yearsExperience?: number;
  partnersCount?: number;
}

export interface ParameterTrend {
  parameter: string;
  averageValue: number;
  totalTests: number;
  improvementPercentage: number;
}

export interface MapLocation {
  id: string;
  lat: number;
  lng: number;
  ph: number;
  npk: string;
}

/**
 * Dashboard stats.
 * Backend contract: GET /api/stats
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const stats = await apiCall<any>('/stats') as any;
  if (__DEV__) {
    console.log('[Stats] Raw /stats response:', stats);
  }

  return {
    farms: Number(stats?.farmsAnalyzed ?? 0),
    tests: Number(stats?.soilTests ?? 0),
    aiTips: Number(stats?.recommendations ?? 0),
    yearsExperience: Number(stats?.yearsExperience ?? 0),
    partnersCount: Number(stats?.partnersCount ?? 0),
  };
}

/**
 * Fetch trend data for a specific parameter (e.g. Nitrogen, pH)
 */
export async function getParameterTrend(parameterName: string, days: number = 30): Promise<ParameterTrend> {
  return apiCall<ParameterTrend>(`/analytics/trend?parameter=${encodeURIComponent(parameterName)}&days=${days}`);
}

/**
 * Fetch geographic locations of all tests for the Map
 */
export async function getTestLocations(): Promise<MapLocation[]> {
  return apiCall<MapLocation[]>('/analytics/locations');
}
