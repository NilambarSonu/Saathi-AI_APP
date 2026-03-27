import { apiCall } from './api';

export interface DashboardStats {
  farms: number;
  soilTests: number;
  aiTips: number;
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
 * Fetch summary stats for the dashboard data cards
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // Use EXPO_PUBLIC environment variable or fallback to hardcoded string to ensure it works without a server restart
  const dbUrl = process.env.EXPO_PUBLIC_DATABASE_URL || "postgresql://neondb_owner:npg_gkDJd7iY4Pzc@ep-soft-paper-a13ldkor-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
  
  if (dbUrl) {
    try {
      const match = dbUrl.match(/@([^\/]+)\//);
      if (match) {
        const host = match[1];
        const neonUrl = `https://${host}/sql`;

        const runQuery = async (query: string): Promise<number> => {
          const res = await fetch(neonUrl, {
            method: 'POST',
            headers: {
              'Neon-Connection-String': dbUrl,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
          });
          const json = await res.json();
          return Number(json?.rows?.[0]?.count ?? 0);
        };

        const [farms, soilTests, aiTips] = await Promise.all([
          runQuery('SELECT count(*) as count FROM users'),
          runQuery('SELECT count(*) as count FROM soil_tests'),
          runQuery('SELECT count(*) as count FROM ai_recommendations')
        ]);

        return { farms, soilTests, aiTips };
      }
    } catch (e) {
      console.warn('Neon DB Direct Fetch Failed:', e);
    }
  }

  // Fallback to Live API
  return apiCall<DashboardStats>('/analytics/dashboard');
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
