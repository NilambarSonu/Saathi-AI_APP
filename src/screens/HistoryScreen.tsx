import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import { LineChart } from 'react-native-chart-kit';
import { hideTabBar, showTabBar } from '@/constants/Animations';
import { SoilTest } from '@/features/soil_analysis/services/soil';
import { exportSoilReport } from '@/services/pdfExport';
import { getParameterTrend, ParameterTrend } from '@/services/analytics';
import { fetchSoilHistory } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useSoilMarkers } from '@/context/SoilMarkersContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  backgroundTop: '#E0F5E9',
  backgroundBottom: '#FFFFFF',
  title: '#022C22',
  subtitle: '#475569',
  card: 'rgba(255,255,255,0.92)',
  border: 'rgba(255,255,255,0.9)',
  accent: '#059669',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#92400E',
};

const PARAMETERS = ['Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)', 'pH Level', 'Moisture'] as const;
const TIME_FILTERS = ['Last 30 Days', 'Last 90 Days', 'Last Year', 'All Time'] as const;

type ParameterName = (typeof PARAMETERS)[number];
type TimeFilter = (typeof TIME_FILTERS)[number];

type HistoryMarker = {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  n: number;
  p: number;
  k: number;
  ph: number;
  moisture: number;
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseIsoDate(value: unknown): string | null {
  if (!value) return null;
  const parsed = new Date(value as any);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function safeDateLabel(value: unknown): string {
  const iso = parseIsoDate(value);
  if (!iso) return 'N/A';

  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  });
}

function safeDateTimeLabel(value: unknown): string {
  const iso = parseIsoDate(value);
  if (!iso) return 'Unknown date';

  return new Date(iso).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getLogMetric(log: SoilTest, parameter: ParameterName): number {
  if (parameter === 'pH Level') return toNumber(log.ph);
  if (parameter === 'Nitrogen (N)') return toNumber(log.n);
  if (parameter === 'Phosphorus (P)') return toNumber(log.p);
  if (parameter === 'Potassium (K)') return toNumber(log.k);
  return toNumber(log.moisture);
}

function getParamColor(parameter: ParameterName): string {
  if (parameter === 'pH Level') return '#2563EB';
  if (parameter === 'Nitrogen (N)') return '#EF4444';
  if (parameter === 'Phosphorus (P)') return '#8B5CF6';
  if (parameter === 'Potassium (K)') return '#F97316';
  return '#16A34A';
}

function normalizeSoilLog(raw: any, index: number, fallbackUserId: string): SoilTest | null {
  const createdAt =
    parseIsoDate(raw?.testDate) ||
    parseIsoDate(raw?.createdAt) ||
    parseIsoDate(raw?.created_at) ||
    parseIsoDate(raw?.timestamp) ||
    parseIsoDate(raw?.date);

  if (!createdAt) return null;

  const latitude = raw?.latitude ?? raw?.lat;
  const longitude = raw?.longitude ?? raw?.lng ?? raw?.lon;
  const id = String(raw?.id || raw?._id || raw?.soilTestId || `${createdAt}-${index}`);

  return {
    id,
    userId: String(raw?.userId || raw?.user_id || raw?.user?.id || fallbackUserId),
    n: toNumber(raw?.n ?? raw?.nitrogen),
    p: toNumber(raw?.p ?? raw?.phosphorus),
    k: toNumber(raw?.k ?? raw?.potassium),
    ph: toNumber(raw?.ph ?? raw?.pH),
    moisture: toNumber(raw?.moisture ?? raw?.soilMoisture),
    temperature: toNumber(raw?.temperature ?? raw?.temp),
    latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
    longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : null,
    deviceId: raw?.deviceId || raw?.device_id || undefined,
    locationDetails:
      raw?.locationDetails || raw?.location || raw?.address || raw?.fieldName || undefined,
    createdAt,
  };
}

function buildMarkers(logs: SoilTest[]): HistoryMarker[] {
  return logs
    .filter(
      (log) => Number.isFinite(Number(log.latitude)) && Number.isFinite(Number(log.longitude))
    )
    .map((log) => ({
      id: log.id,
      latitude: Number(log.latitude),
      longitude: Number(log.longitude),
      timestamp: log.createdAt,
      n: toNumber(log.n),
      p: toNumber(log.p),
      k: toNumber(log.k),
      ph: toNumber(log.ph),
      moisture: toNumber(log.moisture),
    }));
}

export default function HistoryScreen() {
  const { user } = useAuthStore();
  const { clearMarkers } = useSoilMarkers();
  const [logs, setLogs] = useState<SoilTest[]>([]);
  const [trend, setTrend] = useState<ParameterTrend | null>(null);
  const [selectedParameter, setSelectedParameter] = useState<ParameterName>('Nitrogen (N)');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('Last 30 Days');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [mapMode, setMapMode] = useState<'google' | 'osm'>('google');

  useEffect(() => {
    if (!user?.id) {
      setLogs([]);
      setHistoryError(null);
      setLoadingLogs(false);
      return;
    }

    let cancelled = false;
    setLoadingLogs(true);
    setHistoryError(null);

    fetchSoilHistory<any[]>(user.id)
      .then((data) => {
        if (cancelled) return;
        const normalized = (Array.isArray(data) ? data : [])
          .map((row, index) => normalizeSoilLog(row, index, user.id))
          .filter((row): row is SoilTest => !!row)
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        setLogs(normalized);
      })
      .catch((error) => {
        if (cancelled) return;
        setLogs([]);
        setHistoryError(error?.message || 'Failed to fetch soil tests.');
      })
      .finally(() => {
        if (!cancelled) setLoadingLogs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    setLoadingTrend(true);

    let days = 30;
    if (timeFilter === 'Last 90 Days') days = 90;
    if (timeFilter === 'Last Year') days = 365;
    if (timeFilter === 'All Time') days = 3650;

    getParameterTrend(selectedParameter, days)
      .then((response) => {
        if (!cancelled) setTrend(response || null);
      })
      .catch(() => {
        if (!cancelled) setTrend(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingTrend(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedParameter, timeFilter]);

  const markers = useMemo(() => buildMarkers(logs), [logs]);
  const mapInitialRegion = useMemo(() => {
    if (!markers.length) {
      return {
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 8,
        longitudeDelta: 8,
      };
    }

    return {
      latitude: markers[0].latitude,
      longitude: markers[0].longitude,
      latitudeDelta: 0.2,
      longitudeDelta: 0.2,
    };
  }, [markers]);

  const chartLogs = useMemo(() => logs.slice(0, 6).reverse(), [logs]);
  const chartData = useMemo(
    () => ({
      labels: chartLogs.length ? chartLogs.map((log) => safeDateLabel(log.createdAt)) : ['No Data'],
      datasets: [
        {
          data: chartLogs.length >= 2 ? chartLogs.map((log) => getLogMetric(log, selectedParameter)) : [0, 0],
        },
      ],
    }),
    [chartLogs, selectedParameter]
  );

  const handleExport = async () => {
    if (!logs.length || !user) {
      Alert.alert('No Data', 'No soil tests are available to export yet.');
      return;
    }

    setIsExporting(true);
    try {
      await exportSoilReport(logs, user as any);
    } catch {
      Alert.alert('Export Failed', 'Unable to export the soil history PDF right now.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!user?.id) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={[COLORS.backgroundTop, COLORS.backgroundBottom]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.centerState}>
          <Ionicons name="lock-closed-outline" size={34} color={COLORS.accent} />
          <Text style={styles.centerTitle}>Sign In To View History</Text>
          <Text style={styles.centerText}>Your soil test history will appear here after login.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[COLORS.backgroundTop, COLORS.backgroundBottom]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={hideTabBar}
        onScrollEndDrag={showTabBar}
        onMomentumScrollBegin={hideTabBar}
        onMomentumScrollEnd={showTabBar}
        scrollEventThrottle={16}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>History & Analytics</Text>
          <TouchableOpacity
            style={[styles.exportBtn, isExporting && { opacity: 0.7 }]}
            onPress={handleExport}
            disabled={isExporting}
          >
            <Ionicons name="document-text-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.exportBtnText}>{isExporting ? 'Starting...' : 'Export PDF'}</Text>
          </TouchableOpacity>
        </View>

        {!!historyError && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={16} color={COLORS.warningText} />
            <Text style={styles.errorBannerText}>{historyError}</Text>
          </View>
        )}

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TIME_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterPill, timeFilter === filter && styles.filterPillActive]}
                onPress={() => setTimeFilter(filter)}
              >
                <Text style={[styles.filterText, timeFilter === filter && styles.filterTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {PARAMETERS.map((parameter) => (
              <TouchableOpacity
                key={parameter}
                style={[styles.filterPill, selectedParameter === parameter && styles.filterPillActive]}
                onPress={() => setSelectedParameter(parameter)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedParameter === parameter && styles.filterTextActive,
                  ]}
                >
                  {parameter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Field Test Locations</Text>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setMapMode((current) => (current === 'google' ? 'osm' : 'google'))}
            >
              <Text style={styles.secondaryBtnText}>Map: {mapMode === 'google' ? 'Google' : 'OSM'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => clearMarkers()}>
              <Text style={styles.secondaryBtnText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mapWrapper}>
            {loadingLogs ? (
              <View style={styles.mapFallback}>
                <ActivityIndicator size="small" color={COLORS.accent} />
                <Text style={styles.mapFallbackText}>Loading markers...</Text>
              </View>
            ) : (
              <MapView
                style={styles.map}
                provider={Platform.OS === 'android' && mapMode === 'google' ? PROVIDER_GOOGLE : undefined}
                initialRegion={mapInitialRegion}
                mapType={mapMode === 'google' ? 'standard' : 'none'}
              >
                {mapMode === 'osm' && (
                  <UrlTile
                    urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maximumZ={19}
                    flipY={false}
                  />
                )}
                {markers.map((marker) => (
                  <Marker
                    key={marker.id}
                    coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                    pinColor={marker.ph < 6.5 ? '#EF4444' : marker.ph > 7.5 ? '#2563EB' : '#22C55E'}
                    title={safeDateLabel(marker.timestamp)}
                    description={`pH ${marker.ph.toFixed(1)} | NPK ${marker.n}-${marker.p}-${marker.k}`}
                  />
                ))}
              </MapView>
            )}
          </View>

          {!loadingLogs && !markers.length && (
            <View style={styles.emptyBlock}>
              <Ionicons name="location-outline" size={28} color={COLORS.subtitle} />
              <Text style={styles.emptyText}>No saved soil-test coordinates yet.</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selectedParameter} Trend Analysis</Text>
          {loadingTrend ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator size="small" color={COLORS.accent} />
              <Text style={styles.mapFallbackText}>Loading trend data...</Text>
            </View>
          ) : (
            <LineChart
              data={chartData}
              width={Math.max(SCREEN_WIDTH - 48, 240)}
              height={190}
              withInnerLines={false}
              withOuterLines={false}
              withShadow={false}
              chartConfig={{
                backgroundGradientFrom: 'transparent',
                backgroundGradientTo: 'transparent',
                backgroundColor: 'transparent',
                decimalPlaces: selectedParameter === 'pH Level' ? 1 : 0,
                color: () => getParamColor(selectedParameter),
                labelColor: () => COLORS.subtitle,
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#FFFFFF',
                },
              }}
              bezier
              style={{ borderRadius: 16 }}
            />
          )}

          <View style={styles.trendStats}>
            <View style={styles.trendStat}>
              <Text style={[styles.trendValue, { color: getParamColor(selectedParameter) }]}>
                {Number.isFinite(Number(trend?.averageValue))
                  ? Number(trend?.averageValue).toFixed(selectedParameter === 'pH Level' ? 1 : 0)
                  : '--'}
              </Text>
              <Text style={styles.trendLabel}>Average</Text>
            </View>
            <View style={styles.trendStat}>
              <Text style={styles.trendValue}>
                {Number.isFinite(Number(trend?.totalTests)) ? String(trend?.totalTests) : '--'}
              </Text>
              <Text style={styles.trendLabel}>Total Tests</Text>
            </View>
            <View style={styles.trendStat}>
              <Text style={styles.trendValue}>
                {Number.isFinite(Number(trend?.improvementPercentage))
                  ? `${Number(trend?.improvementPercentage) > 0 ? '+' : ''}${Number(
                      trend?.improvementPercentage
                    ).toFixed(1)}%`
                  : '--'}
              </Text>
              <Text style={styles.trendLabel}>Improvement</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Test History Log</Text>
          {loadingLogs ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator size="small" color={COLORS.accent} />
              <Text style={styles.mapFallbackText}>Loading soil history...</Text>
            </View>
          ) : logs.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Ionicons name="flask-outline" size={28} color={COLORS.subtitle} />
              <Text style={styles.emptyText}>No soil tests recorded yet.</Text>
            </View>
          ) : (
            logs.map((log) => (
              <View key={log.id} style={styles.logRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logDate}>{safeDateTimeLabel(log.createdAt)}</Text>
                  <Text style={styles.logMeta}>
                    pH {toNumber(log.ph).toFixed(1)} | NPK {toNumber(log.n)}-{toNumber(log.p)}-{toNumber(log.k)}
                  </Text>
                  <Text style={styles.logMeta}>
                    {typeof log.locationDetails === 'string' ? log.locationDetails : 'Location unavailable'}
                  </Text>
                  {'recommendation' in (log as any) && (log as any).recommendation ? (
                    <Text style={styles.recommendationText} numberOfLines={2}>
                      {(log as any).recommendation}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.subtitle} />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 120,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  centerTitle: {
    marginTop: 12,
    fontFamily: 'Sora_700Bold',
    fontSize: 18,
    color: COLORS.title,
    textAlign: 'center',
  },
  centerText: {
    marginTop: 8,
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: COLORS.subtitle,
    textAlign: 'center',
    lineHeight: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 22,
    color: COLORS.title,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exportBtnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 12,
    color: '#FFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warningBorder,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: 'Sora_500Medium',
    fontSize: 12,
    color: COLORS.warningText,
  },
  filterRow: {
    gap: 10,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    marginRight: 10,
  },
  filterPillActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  filterText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    color: COLORS.subtitle,
  },
  filterTextActive: {
    color: COLORS.accent,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    fontFamily: 'Sora_700Bold',
    fontSize: 18,
    color: COLORS.title,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(15,23,42,0.06)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  secondaryBtnText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 11,
    color: COLORS.subtitle,
  },
  mapWrapper: {
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  map: { width: '100%', height: '100%' },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapFallbackText: {
    fontFamily: 'Sora_500Medium',
    fontSize: 12,
    color: COLORS.subtitle,
  },
  emptyBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontFamily: 'Sora_500Medium',
    fontSize: 13,
    color: COLORS.subtitle,
    textAlign: 'center',
  },
  chartLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 190,
    gap: 8,
  },
  trendStats: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  trendStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 14,
  },
  trendValue: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 20,
    color: COLORS.title,
  },
  trendLabel: {
    marginTop: 4,
    fontFamily: 'Sora_500Medium',
    fontSize: 11,
    color: COLORS.subtitle,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.06)',
  },
  logDate: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
    color: COLORS.title,
  },
  logMeta: {
    marginTop: 4,
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    color: COLORS.subtitle,
  },
  recommendationText: {
    marginTop: 6,
    fontFamily: 'Sora_500Medium',
    fontSize: 12,
    color: COLORS.accent,
  },
});


