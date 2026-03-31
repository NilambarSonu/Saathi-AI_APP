/**
 * history.tsx — Saathi AI History & Analytics Dashboard
 * Persistent + Real-Time Hybrid Marker System
 *
 * Sources:
 *  - Permanent: getSoilTests() via API → stored in SoilMarkersContext + AsyncStorage
 *  - Live: BLE scan → written to SoilMarkersContext by connect.tsx
 *  - Both are merged and deduplicated before rendering on the map
 */
import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Platform, Modal, ActivityIndicator, Pressable,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutUp,
  Layout,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import { LineChart } from 'react-native-chart-kit';

// Services
import { SoilTest } from '../../src/features/soil_analysis/services/soil';
import { exportSoilReport } from '../../src/core/services/pdfExport';
import { getParameterTrend, ParameterTrend } from '../../src/core/services/analytics';
import { fetchSoilHistory } from '../../src/core/services/api';
import { useAuthStore } from '../../store/authStore';

// Persistent hybrid marker system
import { useSoilMarkers, SoilMarker } from '../../context/SoilMarkersContext';

const { width: W } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatMetric(value: unknown, digits = 1): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : '--';
}

function parseDateLabel(value: unknown): string {
  const date = new Date(value as any);
  return Number.isNaN(date.getTime())
    ? 'N/A'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatFullDate(value: unknown): string {
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) return 'Unknown Date';
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function normalizeToIso(value: unknown): string {
  const date = new Date(value as any);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function pickFirstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function normalizeSoilTestRow(raw: any, index: number, userId?: string): SoilTest {
  const createdAt = normalizeToIso(
    raw?.createdAt ?? raw?.created_at ?? raw?.testDate ?? raw?.timestamp ?? raw?.date
  );

  const latitude = Number(raw?.latitude ?? raw?.lat);
  const longitude = Number(raw?.longitude ?? raw?.lng ?? raw?.lon);

  const id =
    pickFirstString(raw?.id, raw?._id, raw?.testId, raw?.soilTestId) ||
    `${createdAt}-${Number.isFinite(latitude) ? latitude.toFixed(6) : 'na'}-${Number.isFinite(longitude) ? longitude.toFixed(6) : 'na'}-${index}`;

  return {
    id,
    userId:
      pickFirstString(raw?.userId, raw?.user_id, raw?.user?.id, userId) ||
      'unknown',
    n: safeNumber(raw?.n ?? raw?.nitrogen),
    p: safeNumber(raw?.p ?? raw?.phosphorus),
    k: safeNumber(raw?.k ?? raw?.potassium),
    ph: safeNumber(raw?.ph ?? raw?.pH),
    moisture: safeNumber(raw?.moisture ?? raw?.soilMoisture),
    temperature: safeNumber(raw?.temperature ?? raw?.temp),
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    deviceId: pickFirstString(raw?.deviceId, raw?.device_id) || undefined,
    locationDetails: pickFirstString(raw?.locationDetails, raw?.location, raw?.address) || undefined,
    createdAt,
  };
}

function markerDedupKey(marker: Pick<SoilMarker, 'latitude' | 'longitude' | 'timestamp'>): string {
  return `${Number(marker.latitude).toFixed(6)}-${Number(marker.longitude).toFixed(6)}-${marker.timestamp}`;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bgLight:  '#E0F5E9',
  bgWhite:  '#FFFFFF',
  textDark: '#022C22',
  textSub:  '#475569',
  greenBtn: '#059669',
  valGreen: '#16A34A',
  valBlue:  '#2563EB',
  glass:       'rgba(255, 255, 255, 0.4)',
  glassBorder: 'rgba(255, 255, 255, 0.8)',
};

// ─── pH pin color ──────────────────────────────────────────────────────────────
function phPinColor(ph: number): string {
  if (ph < 6.5) return '#EF4444'; // Acidic → red
  if (ph > 7.5) return '#3B82F6'; // Alkaline → blue
  return '#22C55E';               // Neutral → green
}

function phLabel(ph: number): string {
  if (ph < 6.5) return 'Acidic';
  if (ph > 7.5) return 'Alkaline';
  return 'Neutral';
}

function markerPinColor(marker: SoilMarker): string {
  if (marker.source === 'ble') return '#F59E0B'; // BLE live scan -> orange
  const ph = safeNumber(marker.ph);
  if (ph < 6.5) return '#EF4444'; // API acidic -> red
  if (ph > 7.5) return '#3B82F6'; // API alkaline -> blue
  return '#22C55E';               // API neutral -> green
}

// ─── Pure Glass Card ──────────────────────────────────────────────────────────
function GlassCard({ style, children }: { style?: any; children: React.ReactNode }) {
  if (Platform.OS === 'android') {
    return <View style={[gc.card, gc.cardAndroid, style]}>{children}</View>;
  }
  return (
    <BlurView intensity={60} tint="light" style={[gc.card, style]}>
      {children}
    </BlurView>
  );
}
const gc = StyleSheet.create({
  card: {
    backgroundColor: C.glass,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.glassBorder,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 }
    })
  },
  cardAndroid: { backgroundColor: '#F8FBFA' },
});

// ─── Marker Detail Modal ──────────────────────────────────────────────────────
function MarkerDetailModal({
  marker,
  onClose,
}: {
  marker: SoilMarker | null;
  onClose: () => void;
}) {
  if (!marker) return null;

  const ph = safeNumber(marker.ph);
  const color = phPinColor(ph);

  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!marker}
      onRequestClose={onClose}
    >
      <Pressable style={dm.overlay} onPress={onClose}>
        <Pressable style={dm.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Source badge */}
          <View style={[dm.sourceBadge, { backgroundColor: marker.source === 'api' ? '#EFF6FF' : '#F0FDF4' }]}>
            <Ionicons
              name={marker.source === 'api' ? 'cloud-outline' : 'bluetooth-outline'}
              size={13}
              color={marker.source === 'api' ? '#2563EB' : '#16A34A'}
            />
            <Text style={[dm.sourceText, { color: marker.source === 'api' ? '#2563EB' : '#16A34A' }]}>
              {marker.source === 'api' ? 'API Record' : 'BLE Live Scan'}
            </Text>
          </View>

          <Text style={dm.title}>Soil Test Details</Text>
          <Text style={dm.date}>{formatFullDate(marker.timestamp)}</Text>

          {/* pH big display */}
          <View style={[dm.phBlock, { borderColor: color }]}>
            <Text style={[dm.phValue, { color }]}>pH {formatMetric(ph, 1)}</Text>
            <Text style={[dm.phLabel, { color }]}>{phLabel(ph)}</Text>
          </View>

          {/* NPK row */}
          <View style={dm.npkRow}>
            {[
              { label: 'N', value: marker.n, color: '#22C55E' },
              { label: 'P', value: marker.p, color: '#6366F1' },
              { label: 'K', value: marker.k, color: '#EAB308' },
            ].map(({ label, value, color: c }) => (
              <View key={label} style={dm.npkBlock}>
                <Text style={[dm.npkVal, { color: c }]}>{formatMetric(value, 0)}</Text>
                <Text style={dm.npkLbl}>{label} (mg/kg)</Text>
              </View>
            ))}
          </View>

          {/* Moisture / Temp */}
          {(marker.moisture != null || marker.temperature != null) && (
            <View style={dm.extraRow}>
              {marker.moisture != null && (
                <View style={dm.extraBlock}>
                  <Ionicons name="water-outline" size={16} color="#3B82F6" />
                  <Text style={dm.extraVal}>{formatMetric(marker.moisture, 1)}%</Text>
                  <Text style={dm.extraLbl}>Moisture</Text>
                </View>
              )}
              {marker.temperature != null && (
                <View style={dm.extraBlock}>
                  <Ionicons name="thermometer-outline" size={16} color="#F97316" />
                  <Text style={dm.extraVal}>{formatMetric(marker.temperature, 1)}°C</Text>
                  <Text style={dm.extraLbl}>Temperature</Text>
                </View>
              )}
            </View>
          )}

          {/* Coordinates */}
          <Text style={dm.coords}>
            📍 {marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}
          </Text>

          <TouchableOpacity style={dm.closeBtn} onPress={onClose}>
            <Text style={dm.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const dm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  sourceText: { fontFamily: 'Sora_600SemiBold', fontSize: 12 },
  title: { fontFamily: 'Sora_800ExtraBold', fontSize: 20, color: C.textDark },
  date:  { fontFamily: 'Sora_400Regular', fontSize: 12, color: C.textSub },
  phBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  phValue: { fontFamily: 'Sora_800ExtraBold', fontSize: 26 },
  phLabel: { fontFamily: 'Sora_500Medium', fontSize: 14 },
  npkRow: { flexDirection: 'row', gap: 8 },
  npkBlock: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  npkVal: { fontFamily: 'Sora_700Bold', fontSize: 18 },
  npkLbl: { fontFamily: 'Sora_400Regular', fontSize: 10, color: C.textSub, marginTop: 2 },
  extraRow: { flexDirection: 'row', gap: 8 },
  extraBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
  },
  extraVal: { fontFamily: 'Sora_700Bold', fontSize: 15, color: C.textDark },
  extraLbl: { fontFamily: 'Sora_400Regular', fontSize: 11, color: C.textSub },
  coords: { fontFamily: 'Sora_400Regular', fontSize: 12, color: C.textSub, textAlign: 'center' },
  closeBtn: {
    backgroundColor: C.greenBtn,
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  closeBtnText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#FFF' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const { user } = useAuthStore();
  const { soilMarkers, addSoilMarkers, clearMarkers, isLoadingMarkers } = useSoilMarkers();

  const [isExporting, setIsExporting] = useState(false);
  const [isParameterOpen, setIsParameterOpen] = useState(false);
  const [selectedParam, setSelectedParam] = useState('Nitrogen (N)');

  const [timeFilters] = useState(['Last 30 Days', 'Last 90 Days', 'Last Year', 'All Time']);
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState('Last 30 Days');

  // Raw soil test logs from the API
  const [logs, setLogs] = useState<SoilTest[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [trend, setTrend] = useState<ParameterTrend | null>(null);

  // Selected marker for detail modal
  const [selectedMarker, setSelectedMarker] = useState<SoilMarker | null>(null);
  const [mapMode, setMapMode] = useState<'google' | 'osm'>('google');
  const [mapLoaded, setMapLoaded] = useState(false);

  // Prevent re-adding API markers on every re-render
  const apiSyncedRef = useRef(false);

  // ── Fetch soil tests from API ────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) {
      setLogs([]);
      setLoadingLogs(false);
      return;
    }

    setLoadingLogs(true);
    setHistoryError(null);
    apiSyncedRef.current = false;

    fetchSoilHistory<SoilTest[]>(user.id)
      .then((data) => {
        console.log('API DATA:', data);
        const normalized = (Array.isArray(data) ? data : []).map((row, index) =>
          normalizeSoilTestRow(row, index, user.id)
        );
        console.log('NORMALIZED HISTORY DATA:', normalized);
        setLogs(normalized);
      })
      .catch((e) => {
        console.error('History fetch error:', e);
        setHistoryError(e instanceof Error ? e.message : 'Failed to fetch soil tests');
        setLogs([]);
      })
      .finally(() => setLoadingLogs(false));
  }, [user?.id]);

  const permanentMarkers = useMemo(() => {
    return logs
      .filter((t) => {
        const lat = Number(t.latitude);
        const lng = Number(t.longitude);
        return Number.isFinite(lat) && Number.isFinite(lng);
      })
      .map((t): Omit<SoilMarker, 'key'> => ({
        latitude: Number(t.latitude),
        longitude: Number(t.longitude),
        ph: safeNumber(t.ph),
        n: safeNumber(t.n),
        p: safeNumber(t.p),
        k: safeNumber(t.k),
        moisture: safeNumber(t.moisture),
        temperature: safeNumber(t.temperature),
        timestamp: normalizeToIso(t.createdAt),
        source: 'api',
      }));
  }, [logs]);

  // ── Convert API logs → SoilMarkers and add to context (permanent) ────────
  useEffect(() => {
    if (apiSyncedRef.current || permanentMarkers.length === 0) return;
    apiSyncedRef.current = true;
    addSoilMarkers(permanentMarkers);
  }, [permanentMarkers, addSoilMarkers]);

  // ── Fetch trend data ─────────────────────────────────────────────────────
  useEffect(() => {
    let days = 30;
    if (timeFilter === 'Last 90 Days') days = 90;
    if (timeFilter === 'Last Year') days = 365;
    if (timeFilter === 'All Time') days = 3650;
    getParameterTrend(selectedParam, days).then(setTrend).catch(() => setTrend(null));
  }, [selectedParam, timeFilter]);

  // ── Merged & filtered markers (all sources, deduplicated by context) ──────
  const allMarkers = useMemo(() => {
    const merged = new Map<string, SoilMarker>();

    for (const marker of permanentMarkers) {
      const key = markerDedupKey(marker);
      merged.set(key, { ...marker, key });
    }

    for (const marker of soilMarkers) {
      if (!Number.isFinite(marker.latitude) || !Number.isFinite(marker.longitude)) continue;
      const key = marker.key ?? markerDedupKey(marker);
      merged.set(key, { ...marker, key });
    }

    return Array.from(merged.values());
  }, [permanentMarkers, soilMarkers]);

  // ── Map initial region ────────────────────────────────────────────────────
  const mapInitialRegion = useMemo(() => {
    if (allMarkers.length > 0) {
      return {
        latitude: allMarkers[0].latitude,
        longitude: allMarkers[0].longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 8, longitudeDelta: 8 };
  }, [allMarkers]);

  // ── Valid logs for history list ────────────────────────────────────────────
  const dbLogs = useMemo(
    () => (Array.isArray(logs) ? logs.filter((l) => !!l && !!l.createdAt) : []),
    [logs]
  );

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!Array.isArray(dbLogs) || dbLogs.length === 0) {
      alert('No soil tests available to export.');
      return;
    }
    setIsExporting(true);
    try {
      if (user) await exportSoilReport(dbLogs, user as any);
    } catch {
      alert('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Chart helpers ──────────────────────────────────────────────────────────
  const getParamColor = (param: string) => {
    if (param.includes('pH')) return '#2563EB';
    if (param.includes('Nitrogen')) return '#EF4444';
    if (param.includes('Phosphorus')) return '#8B5CF6';
    if (param.includes('Potassium')) return '#F97316';
    if (param.includes('Moisture')) return '#86EFAC';
    return '#16A34A';
  };

  const getChartData = () => {
    if (!Array.isArray(dbLogs) || dbLogs.length === 0) {
      return { labels: ['No Data'], datasets: [{ data: [0] }] };
    }
    const recentLogs = [...dbLogs].reverse().slice(-6);
    return {
      labels: recentLogs.map((l) => parseDateLabel(l.createdAt)),
      datasets: [{
        data: recentLogs.map((l) => {
          if (selectedParam.includes('pH')) return safeNumber(l.ph);
          if (selectedParam.includes('Nitrogen')) return safeNumber(l.n);
          if (selectedParam.includes('Phosphorus')) return safeNumber(l.p);
          if (selectedParam.includes('Potassium')) return safeNumber(l.k);
          if (selectedParam.includes('Moisture')) return safeNumber(l.moisture);
          return 0;
        })
      }]
    };
  };

  const parameters = ['Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)', 'pH Level', 'Moisture'];

  // Auto fallback to OSM when Google tiles don't load on device.
  useEffect(() => {
    if (isLoadingMarkers || mapLoaded || mapMode === 'osm') return;
    const timer = setTimeout(() => {
      if (!mapLoaded) {
        console.warn('[History Map] Google tiles timeout, switching to OSM fallback');
        setMapMode('osm');
      }
    }, 4500);
    return () => clearTimeout(timer);
  }, [isLoadingMarkers, mapLoaded, mapMode, allMarkers.length]);

  if (loadingLogs || isLoadingMarkers) {
    return (
      <View style={s.root}>
        <LinearGradient
          colors={[C.bgLight, C.bgWhite]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.centerState}>
          <ActivityIndicator size="large" color={C.greenBtn} />
          <Text style={s.centerStateText}>Loading soil history...</Text>
        </View>
      </View>
    );
  }

  if (historyError) {
    return (
      <View style={s.root}>
        <LinearGradient
          colors={[C.bgLight, C.bgWhite]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.centerState}>
          <Ionicons name="warning-outline" size={34} color="#DC2626" />
          <Text style={s.centerStateTitle}>Unable To Load History</Text>
          <Text style={s.centerStateText}>{historyError}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
        {/* ── ROOT BACKGROUND ── */}
        <LinearGradient
          colors={[C.bgLight, C.bgWhite]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* ── HEADER & EXPORT ── */}
          <View style={s.headerRow}>
            <Text style={s.title}>History & Analytics</Text>
            <TouchableOpacity
              style={[s.exportBtn, isExporting && { opacity: 0.7 }]}
              onPress={handleExport}
              disabled={isExporting}
            >
              <Ionicons name="document-text-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={s.exportBtnText}>{isExporting ? 'Starting...' : 'Export PDF'}</Text>
            </TouchableOpacity>
          </View>

          {/* ── FILTERS ── */}
          <View style={{ zIndex: 100 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={{ paddingRight: 16 }}>
              <TouchableOpacity onPress={() => { setIsTimeFilterOpen(!isTimeFilterOpen); setIsParameterOpen(false); }} activeOpacity={0.8}>
                <GlassCard style={[s.filterPill, isTimeFilterOpen && { borderColor: C.greenBtn }]}>
                  <Text style={s.filterText}>📅 {timeFilter} <Ionicons name={isTimeFilterOpen ? 'chevron-up' : 'chevron-down'} size={12} /></Text>
                </GlassCard>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setIsParameterOpen(!isParameterOpen); setIsTimeFilterOpen(false); }} activeOpacity={0.8}>
                <GlassCard style={[s.filterPill, isParameterOpen && { borderColor: C.greenBtn }]}>
                  <Text style={s.filterText}>📊 {selectedParam} <Ionicons name={isParameterOpen ? 'chevron-up' : 'chevron-down'} size={12} /></Text>
                </GlassCard>
              </TouchableOpacity>
            </ScrollView>

            {isTimeFilterOpen && (
              <Animated.View 
                entering={SlideInDown.duration(200).springify()} 
                exiting={SlideOutUp.duration(150)}
                style={[s.dropdownMenu, { left: 8 }]}
              >
                {timeFilters.map((tf, index) => (
                  <TouchableOpacity
                    key={tf}
                    style={[s.dropdownItem, index !== timeFilters.length - 1 && s.dropdownItemBorder]}
                    onPress={() => { setTimeFilter(tf); setIsTimeFilterOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.dropdownText, timeFilter === tf && s.dropdownTextActive]}>{tf}</Text>
                  </TouchableOpacity>
                ))}
              </Animated.View>
            )}

            {isParameterOpen && (
              <Animated.View 
                entering={SlideInDown.duration(200).springify()} 
                exiting={SlideOutUp.duration(150)}
                style={s.dropdownMenu}
              >
                {parameters.map((param, index) => (
                  <TouchableOpacity
                    key={param}
                    style={[s.dropdownItem, index !== parameters.length - 1 && s.dropdownItemBorder]}
                    onPress={() => { setSelectedParam(param); setIsParameterOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.dropdownText, selectedParam === param && s.dropdownTextActive]}>{param}</Text>
                  </TouchableOpacity>
                ))}
              </Animated.View>
            )}
          </View>

          {/* ── MAP — FIELD TEST LOCATIONS ── */}
          <GlassCard style={[s.sectionCard, { zIndex: 1 }]}>
            <View style={s.mapHeader}>
              <Text style={s.cardTitle}>Field Test Locations</Text>
              {(isLoadingMarkers || loadingLogs) && (
                <ActivityIndicator size="small" color={C.greenBtn} />
              )}
              <TouchableOpacity
                style={s.mapModeBtn}
                onPress={() => {
                  setMapLoaded(false);
                  setMapMode((prev) => (prev === 'google' ? 'osm' : 'google'));
                }}
              >
                <Text style={s.mapModeBtnText}>Map: {mapMode === 'google' ? 'Google' : 'OSM'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.clearBtn} onPress={() => clearMarkers()}>
                <Text style={s.clearBtnText}>Clear</Text>
              </TouchableOpacity>
              <View style={s.markerBadge}>
                <Text style={s.markerBadgeText}>{allMarkers.length} pin{allMarkers.length !== 1 ? 's' : ''}</Text>
              </View>
            </View>

            <View style={s.mapWrapper}>
              {isLoadingMarkers ? (
                <View style={s.mapLoadingState}>
                  <ActivityIndicator size="small" color={C.greenBtn} />
                  <Text style={s.mapLoadingText}>Loading markers...</Text>
                </View>
              ) : (
                <MapView
                  style={s.mapStyle}
                  provider={Platform.OS === 'android' && mapMode === 'google' ? PROVIDER_GOOGLE : undefined}
                  initialRegion={mapInitialRegion}
                  mapType={mapMode === 'google' ? 'standard' : 'none'}
                  toolbarEnabled={false}
                  onMapReady={() => console.log('[History Map] Map ready')}
                  onMapLoaded={() => {
                    setMapLoaded(true);
                    console.log('[History Map] Tiles loaded');
                  }}
                >
                  {mapMode === 'osm' && (
                    <UrlTile
                      urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                      maximumZ={19}
                      flipY={false}
                    />
                  )}
                  {allMarkers.map((marker) => (
                    <Marker
                      key={marker.key}
                      coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                      pinColor={markerPinColor(marker)}
                      onPress={() => setSelectedMarker(marker)}
                    />
                  ))}
                </MapView>
              )}
            </View>

            <View style={s.legendRow}>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={s.legendText}>BLE Live</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: '#EF4444' }]} />
                <Text style={s.legendText}>Acidic (pH &lt; 6.5)</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: '#22C55E' }]} />
                <Text style={s.legendText}>Neutral</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={s.legendText}>Alkaline</Text>
              </View>
            </View>

            {allMarkers.length === 0 && !isLoadingMarkers && !loadingLogs && (
              <View style={s.emptyMap}>
                <Ionicons name="location-outline" size={32} color={C.textSub} />
                <Text style={s.emptyMapText}>No test locations yet.{'\n'}Connect your Agni sensor to add markers.</Text>
              </View>
            )}
          </GlassCard>

          {/* ── TREND ANALYSIS ── */}
          <GlassCard style={[s.sectionCard, { zIndex: 1, paddingHorizontal: 0 }]}>
            <Text style={[s.cardTitle, { paddingHorizontal: 20 }]}>
              {selectedParam.includes('Nitrogen') ? 'Nitrogen Trend Analysis' : `${selectedParam} Trend Analysis`}
            </Text>

            <View style={s.chartPlaceholder}>
              {(!dbLogs || dbLogs.length === 0) ? (
                <>
                  <View style={s.gridH} /><View style={[s.gridH, { top: '33%' }]} /><View style={[s.gridH, { top: '66%' }]} />
                  <View style={s.gridV} /><View style={[s.gridV, { left: '33%' }]} /><View style={[s.gridV, { left: '66%' }]} />
                  <Ionicons name="trending-up" size={80} color={getParamColor(selectedParam)} style={{ position: 'absolute', opacity: 0.2 }} />
                  <Text style={{ position: 'absolute', fontFamily: 'Sora_600SemiBold', color: C.textSub }}>No Data Available</Text>
                </>
              ) : (
                <LineChart
                  data={getChartData()}
                  width={Math.max(W - 32, 220)}
                  height={180}
                  withDots={true}
                  withInnerLines={false}
                  withOuterLines={false}
                  yAxisSuffix=""
                  yAxisLabel=""
                  chartConfig={{
                    backgroundColor: 'transparent',
                    backgroundGradientFrom: 'rgba(255,255,255,0)',
                    backgroundGradientTo: 'rgba(255,255,255,0)',
                    decimalPlaces: selectedParam.includes('pH') ? 1 : 0,
                    color: (opacity = 1) => getParamColor(selectedParam),
                    labelColor: (opacity = 1) => C.textSub,
                    style: { borderRadius: 16 },
                    propsForDots: { r: '5', strokeWidth: '2', stroke: '#FFFFFF' }
                  }}
                  bezier
                  style={{ marginVertical: 8, borderRadius: 16 }}
                />
              )}
            </View>

            <View style={[s.statsRow, { paddingHorizontal: 20 }]}>
              <View style={s.statBlock}>
                <Text style={[s.statVal, { color: getParamColor(selectedParam) }]}>{formatMetric(trend?.averageValue, 1)}</Text>
                <Text style={s.statLbl}>Avg {selectedParam.split(' ')[0]}</Text>
              </View>
              <View style={s.statBlock}>
                <Text style={[s.statVal, { color: C.valBlue }]}>{Number.isFinite(Number(trend?.totalTests)) ? String(trend?.totalTests) : '--'}</Text>
                <Text style={s.statLbl}>Total Tests</Text>
              </View>
              <View style={s.statBlock}>
                <Text style={[s.statVal, { color: C.valGreen }]}>
                  {Number.isFinite(Number(trend?.improvementPercentage))
                    ? `${Number(trend?.improvementPercentage) > 0 ? '+' : ''}${Number(trend?.improvementPercentage)}%`
                    : '--'}
                </Text>
                <Text style={s.statLbl}>Improvement</Text>
              </View>
            </View>
          </GlassCard>

          {/* ── TEST HISTORY LOG ── */}
          <GlassCard style={[s.sectionCard, { paddingBottom: 16 }]}>
            <Text style={[s.cardTitle, { marginBottom: 12 }]}>Test History Log ({timeFilter})</Text>
            <ScrollView 
              style={s.logsScrollContainer}
              showsVerticalScrollIndicator={true}
              persistentScrollbar={true}
              nestedScrollEnabled={true}
            >
              <View style={s.logsContainer}>
                {dbLogs.map((log) => (
                  <GlassCard key={log.id} style={s.logRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.logDate}>{formatFullDate(log.createdAt)}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <Text style={[s.phText, safeNumber(log.ph) < 6 ? { color: '#DC2626' } : safeNumber(log.ph) > 7 ? { color: '#2563EB' } : { color: '#16A34A' }, { marginRight: 12 }]}>
                          pH: {formatMetric(log.ph, 1)} ({safeNumber(log.ph) < 6 ? 'Acidic' : safeNumber(log.ph) > 7 ? 'Alkaline' : 'Neutral'})
                        </Text>
                        <Text style={s.npkText}>NPK: {safeNumber(log.n)}-{safeNumber(log.p)}-{safeNumber(log.k)}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={C.textSub} />
                  </GlassCard>
                ))}
                {!loadingLogs && dbLogs.length === 0 && (
                  <View style={s.emptyLogs}>
                    <Ionicons name="flask-outline" size={40} color={C.textSub} style={{ opacity: 0.4 }} />
                    <Text style={s.emptyLogsText}>No soil tests recorded yet.</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </GlassCard>

        </ScrollView>

        {/* ── MARKER DETAIL MODAL ── */}
        <MarkerDetailModal marker={selectedMarker} onClose={() => setSelectedMarker(null)} />
      </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  centerStateTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 18,
    color: C.textDark,
    textAlign: 'center',
  },
  centerStateText: {
    fontFamily: 'Sora_500Medium',
    fontSize: 13,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 20,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 120,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 22,
    color: C.textDark,
    letterSpacing: -0.5,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.greenBtn,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
  },
  exportBtnText: { fontFamily: 'Sora_700Bold', fontSize: 12, color: '#FFF' },

  filterScroll: { marginBottom: 24, paddingHorizontal: 8, marginHorizontal: -8 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, marginRight: 10 },
  filterText: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: C.textDark },

  dropdownMenu: {
    position: 'absolute',
    top: 48,
    left: 140,
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 999,
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16 },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  dropdownText: { fontFamily: 'Sora_500Medium', fontSize: 13, color: C.textDark },
  dropdownTextActive: { color: C.greenBtn, fontFamily: 'Sora_700Bold' },

  sectionCard: { padding: 20, marginBottom: 24 },
  cardTitle: { fontFamily: 'Sora_700Bold', fontSize: 18, color: C.textDark, marginBottom: 16 },

  // Map
  mapHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  mapModeBtn: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(37,99,235,0.10)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mapModeBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: 11, color: '#1D4ED8' },
  clearBtn: {
    backgroundColor: 'rgba(15,23,42,0.08)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  clearBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: 11, color: '#0F172A' },
  markerBadge: {
    backgroundColor: 'rgba(5,150,105,0.12)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  markerBadgeText: { fontFamily: 'Sora_600SemiBold', fontSize: 11, color: C.greenBtn },
  mapWrapper: {
    height: 250,
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.glassBorder,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapStyle: { width: '100%', height: '100%' },
  mapLoadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  mapLoadingText: { fontFamily: 'Sora_500Medium', fontSize: 12, color: C.textSub },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontFamily: 'Sora_500Medium', fontSize: 11, color: C.textSub },
  emptyMap: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyMapText: { fontFamily: 'Sora_500Medium', fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20 },

  // Trend Chart
  chartPlaceholder: {
    height: 180,
    backgroundColor: 'transparent',
    marginBottom: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,0,0,0.03)' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,0,0,0.03)' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBlock: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  statVal: { fontFamily: 'Sora_800ExtraBold', fontSize: 20, marginBottom: 4 },
  statLbl: { fontFamily: 'Sora_500Medium', fontSize: 10, color: C.textSub },

  // Logs
  logsScrollContainer: {
    maxHeight: 400,
    borderRadius: 12,
    paddingRight: 4,
  },
  logsContainer: { 
    gap: 10, 
    zIndex: 1,
    paddingBottom: 8,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
  },
  logDate: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: C.textDark, flex: 1 },
  phText: { fontFamily: 'Sora_700Bold', fontSize: 11 },
  npkText: { fontFamily: 'Sora_700Bold', fontSize: 13, color: C.textDark },
  emptyLogs: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyLogsText: { fontFamily: 'Sora_500Medium', fontSize: 14, color: C.textSub },
});
