import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
  RefreshControl,
  Modal,
  Image,
  FlatList,
} from 'react-native';
import { Menu, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

// useFocusEffect removed — we now use useEffect with a hasFetchedRef guard
// to prevent re-fetching on every tab switch, which caused map jitter/reloads
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import { LineChart } from 'react-native-chart-kit';
import { format, subDays, isAfter, parseISO } from 'date-fns';
import { hideTabBar, showTabBar } from '@/constants/Animations';
import { getSoilTests, SoilTest } from '@/features/soil_analysis/services/soil';
import { exportSoilReport } from '@/services/pdfExport';
import { useAuthStore } from '@/store/authStore';
import { useNavigationStore } from '@/store/navigationStore';
import { useSoilMarkers } from '@/context/SoilMarkersContext';
import { useDarkModeTheme } from '@/context/ThemeContext';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  backgroundTop: '#F0FDF4',
  backgroundBottom: '#FFFFFF',
  title: '#064E3B',
  subtitle: '#64748B',
  card: 'rgba(255,255,255,0.95)',
  border: 'rgba(15,23,42,0.06)',
  accent: '#10B981',
  accentDark: '#059669',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#92400E',
  shadow: 'rgba(0,0,0,0.04)',
};

const PARAMETERS = ['Nitrogen', 'Phosphorus', 'Potassium', 'pH Level', 'Moisture'] as const;
const UNITS: Record<ParameterName, string> = {
  'Nitrogen': 'mg/kg',
  'Phosphorus': 'mg/kg',
  'Potassium': 'mg/kg',
  'pH Level': '',
  'Moisture': '%',
};
const TIME_FILTERS = ['30 Days', '60 Days', '90 Days', '1 Year', 'All Time'] as const;

type ParameterName = (typeof PARAMETERS)[number];
type TimeFilter = (typeof TIME_FILTERS)[number];

// Helper to convert parameter name to SoilTest key
const getParamKey = (param: ParameterName): keyof SoilTest => {
  switch (param) {
    case 'Nitrogen': return 'nitrogen';
    case 'Phosphorus': return 'phosphorus';
    case 'Potassium': return 'potassium';
    case 'pH Level': return 'ph';
    case 'Moisture': return 'moisture';
    default: return 'nitrogen';
  }
};

const getParamColor = (theme: any, param: ParameterName): string => {
  switch (param) {
    case 'Nitrogen': return theme.paramNitrogen;
    case 'Phosphorus': return theme.paramPhosphorus;
    case 'Potassium': return theme.paramPotassium;
    case 'pH Level': return theme.paramPH;
    case 'Moisture': return theme.paramMoisture;
    default: return theme.paramMoisture;
  }
};

export default function HistoryScreen({ navigation }: any) {
  const { theme, isDark } = useDarkModeTheme();
  const { user } = useAuthStore();
  const { currentIndex } = useNavigationStore();
  const { addSoilMarkers } = useSoilMarkers();
  // isFocused kept for potential future use but map no longer depends on it
  const isFocused = useIsFocused();

  const [logs, setLogs] = useState<SoilTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [selectedParameter, setSelectedParameter] = useState<ParameterName>('Nitrogen');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30 Days');
  const [mapMode, setMapMode] = useState<'satellite' | 'standard' | 'osm'>(Platform.OS === 'android' ? 'satellite' : 'standard');
  const [selectedLog, setSelectedLog] = useState<SoilTest | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  // Use a ref so isMapReady persists across focus changes without triggering re-renders
  const mapReadyRef = useRef(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isTimeMenuVisible, setIsTimeMenuVisible] = useState(false);
  const [isParamMenuVisible, setIsParamMenuVisible] = useState(false);
  const [chartTooltip, setChartTooltip] = useState<{ x: number; y: number; value: number; index: number } | null>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const mapRef = useRef<MapView>(null);
  const fullMapRef = useRef<MapView>(null);

  const COLORS_THEMED = {
    backgroundTop: theme.bg0,
    backgroundBottom: theme.background,
    title: theme.textPrimary,
    subtitle: theme.textSecondary,
    card: theme.surface,
    border: theme.border,
    accent: theme.primary,
    accentDark: theme.primaryDark,
    warningBg: isDark ? '#3D2B16' : '#FFFBEB',
    warningBorder: isDark ? '#5F4D1E' : '#FDE68A',
    warningText: isDark ? theme.warning : '#92400E',
    shadow: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.04)',
  };

  // Safety fallback — only run once (mapReadyRef guards it from re-running on focus)
  useEffect(() => {
    if (mapReadyRef.current) return;
    const timer = setTimeout(() => {
      mapReadyRef.current = true;
      setIsMapReady(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);


  const handleOpenTimeMenu = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(e =>
        console.log('[History] Haptics error:', e)
      );
    } catch (e) {
      console.log('[History] Sync haptics error:', e);
    }
    setIsTimeMenuVisible(true);
  }, []);

  const handleOpenParamMenu = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(e =>
        console.log('[History] Haptics error:', e)
      );
    } catch (e) {
      console.log('[History] Sync haptics error:', e);
    }
    setIsParamMenuVisible(true);
  }, []);

  const handleSelectTimeFilter = useCallback((filter: TimeFilter) => {
    try {
      Haptics.selectionAsync().catch(e =>
        console.log('[History] Haptics error:', e)
      );
    } catch (e) {
      console.log('[History] Sync haptics error:', e);
    }
    setTimeFilter(filter);
    setIsTimeMenuVisible(false);
    setChartTooltip(null);
  }, []);

  const handleSelectParam = useCallback((param: ParameterName) => {
    try {
      Haptics.selectionAsync().catch(e =>
        console.log('[History] Haptics error:', e)
      );
    } catch (e) {
      console.log('[History] Sync haptics error:', e);
    }
    setSelectedParameter(param);
    setIsParamMenuVisible(false);
    setChartTooltip(null);
  }, []);



  // Change map mode
  const handleSetMapMode = useCallback((mode: 'satellite' | 'standard' | 'osm') => {
    setMapMode(mode);
  }, []);

  // Guard: only fetch once on mount, not on every tab focus
  const hasFetchedRef = React.useRef(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      console.log('[History] No user ID - skipping fetch');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[History] Fetching soil tests for user:', user.id);
      const data = await getSoilTests(user.id);
      console.log('[History] Successfully fetched', data.length, 'soil tests');

      // Sort by date descending
      const sorted = [...data].sort((a, b) =>
        new Date(b.testDate).getTime() - new Date(a.testDate).getTime()
      );

      setLogs(sorted);

      // Sync with global SoilMarkersContext
      const contextMarkers = sorted
        .filter(l => l.latitude !== null && l.longitude !== null)
        .map(l => ({
          latitude: Number(l.latitude),
          longitude: Number(l.longitude),
          ph: Number(l.ph),
          n: Number(l.nitrogen),
          p: Number(l.phosphorus),
          k: Number(l.potassium),
          moisture: Number(l.moisture),
          temperature: Number(l.temperature),
          timestamp: l.testDate,
          source: 'api' as const,
          locationDetails: l.location ?? undefined,
          deviceId: l.deviceId,
        }));

      if (contextMarkers.length > 0) {
        addSoilMarkers(contextMarkers);
      }
    } catch (err: any) {
      console.error('[History] Fetch error:', err);
      setError(
        err?.response?.status === 401
          ? 'Session expired. Please log in again.'
          : err?.message || 'Unable to load history. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  // Watch user?.id — on mount auth may not be rehydrated yet (user is null).
  // This effect runs again when user.id becomes available, triggering the fetch.
  // hasFetchedRef prevents duplicate fetches if the component re-renders.
  useEffect(() => {
    if (!user?.id) return; // wait until auth is ready
    if (hasFetchedRef.current) return; // already fetched for this session
    hasFetchedRef.current = true;
    fetchData();
  }, [user?.id, fetchData]);

  // Fallback: runs only once (guarded by mapReadyRef)
  useEffect(() => {
    if (mapReadyRef.current) return;
    const timer = setTimeout(() => {
      if (!mapReadyRef.current) {
        console.log('[History] Map ready fallback triggered');
        mapReadyRef.current = true;
        setIsMapReady(true);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Filter logs based on time range
  const filteredLogs = useMemo(() => {
    if (timeFilter === 'All Time') return logs;

    const now = new Date();
    let daysToSubtract = 30;
    if (timeFilter === '60 Days') daysToSubtract = 60;
    if (timeFilter === '90 Days') daysToSubtract = 90;
    if (timeFilter === '1 Year') daysToSubtract = 365;

    const cutoff = subDays(now, daysToSubtract);
    return logs.filter(log => isAfter(parseISO(log.testDate), cutoff));
  }, [logs, timeFilter]);

  // Calculate statistics for the selected parameter
  const stats = useMemo(() => {
    if (!filteredLogs.length) return { avg: 0, total: 0, change: 0 };

    const key = getParamKey(selectedParameter);
    const values = filteredLogs.map(l => Number(l[key]));
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    // Calculate change between first half and second half of filtered logs
    let change = 0;
    if (filteredLogs.length >= 2) {
      const mid = Math.floor(filteredLogs.length / 2);
      const recentAvg = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
      const olderAvg = values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid);
      if (olderAvg !== 0) {
        change = ((recentAvg - olderAvg) / olderAvg) * 100;
      }
    }

    return {
      avg,
      total: filteredLogs.length,
      change
    };
  }, [filteredLogs, selectedParameter]);

  // Prepare chart data (max 7 points for readability)
  const chartData = useMemo(() => {
    const key = getParamKey(selectedParameter);
    const points = filteredLogs.slice(0, 7).reverse();

    if (points.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0] }]
      };
    }

    return {
      labels: points.map(l => format(parseISO(l.testDate), 'MMM d')),
      datasets: [{
        data: points.map(l => Number(l[key] ?? 0)),
        color: (opacity = 1) => getParamColor(theme, selectedParameter),
        strokeWidth: 3
      }]
    };
  }, [filteredLogs, selectedParameter, theme]);

  const handleExport = async () => {
    if (!logs.length || !user) {
      Alert.alert('No Data', 'You need at least one soil test to export a report.');
      return;
    }

    try {
      setIsExporting(true);
      await exportSoilReport(logs, user as any);
    } catch (err) {
      Alert.alert('Export Error', 'Could not generate the PDF report.');
    } finally {
      setIsExporting(false);
    }
  };

  const mapInitialRegion = useMemo(() => {
    const validLogs = logs.filter(l =>
      l.latitude !== null &&
      l.longitude !== null &&
      !isNaN(Number(l.latitude)) &&
      !isNaN(Number(l.longitude))
    );

    if (validLogs.length > 0) {
      const lats = validLogs.map(l => Number(l.latitude));
      const longs = validLogs.map(l => Number(l.longitude));
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLong = Math.min(...longs);
      const maxLong = Math.max(...longs);

      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLong + maxLong) / 2,
        latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.05),
        longitudeDelta: Math.max((maxLong - minLong) * 1.5, 0.05),
      };
    }
    return {
      latitude: 21.066245,
      longitude: 86.488949,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [logs]);

  // Animate map to initial region only once after it first becomes ready
  const hasAnimatedRef = useRef(false);
  useEffect(() => {
    if (isMapReady && mapRef.current && mapInitialRegion && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      mapRef.current.animateToRegion(mapInitialRegion, 1000);
    }
  }, [isMapReady, mapInitialRegion]);

  const mapMarkers = useMemo(() => {
    return logs
      .filter(l => l.latitude !== null && l.longitude !== null)
      .map(log => ({
        id: log.id,
        coordinate: { latitude: Number(log.latitude), longitude: Number(log.longitude) },
        date: log.testDate
      }));
  }, [logs]);

  const openDetails = (log: SoilTest) => {
    setSelectedLog(log);
    setIsModalVisible(true);
  };

  const navigateToConnect = useCallback(() => {
    const { setCurrentIndex } = require('@/store/navigationStore').useNavigationStore.getState();
    setCurrentIndex(1);
  }, []);

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <StatusBar barStyle="dark-content" />
        <Ionicons name="lock-closed" size={64} color="#CBD5E1" />
        <Text style={styles.emptyTitle}>Secure Access</Text>
        <Text style={styles.emptyText}>Please sign in to view your soil test history and analytics.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient colors={[COLORS_THEMED.backgroundTop, COLORS_THEMED.backgroundBottom]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: COLORS_THEMED.title }]}>Analytics Lab</Text>
        </View>
        <TouchableOpacity style={[styles.exportButton, { backgroundColor: COLORS_THEMED.accent }]} onPress={handleExport} disabled={isExporting}>
          {isExporting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="cloud-download-outline" size={20} color="#FFF" />
              <Text style={styles.exportText}>PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS_THEMED.accent} />
        }
      >
        {error && (
          <View style={[styles.errorCard, { backgroundColor: COLORS_THEMED.warningBg, borderColor: COLORS_THEMED.warningBorder }]}>
            <Ionicons name="alert-circle" size={20} color={COLORS_THEMED.warningText} />
            <Text style={[styles.errorText, { color: COLORS_THEMED.warningText }]}>{error}</Text>
          </View>
        )}

        {/* 1. Field Location - Map */}
        <View style={[styles.card, { backgroundColor: COLORS_THEMED.card, borderColor: COLORS_THEMED.border }]}>
          <View style={[styles.cardHeader, { marginBottom: 9 }]}>
            <Text style={[styles.cardTitle, { color: COLORS_THEMED.subtitle, marginBottom: 0 }]}>Field Locations</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.mapControls, { backgroundColor: isDark ? theme.bg1 : '#F1F5F9' }]}>
                <Pressable
                  onPress={() => handleSetMapMode('satellite')}
                  style={({ pressed }) => [styles.mapTypeBtn, mapMode === 'satellite' && [styles.mapTypeBtnActive, { backgroundColor: isDark ? theme.surfaceAlt : '#FFF' }], pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.mapTypeLabel, { color: isDark ? theme.textSecondary : '#64748B' }, mapMode === 'satellite' && [styles.mapTypeLabelActive, { color: COLORS_THEMED.accent }]]}>Satellite</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleSetMapMode('standard')}
                  style={({ pressed }) => [styles.mapTypeBtn, mapMode === 'standard' && [styles.mapTypeBtnActive, { backgroundColor: isDark ? theme.surfaceAlt : '#FFF' }], pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.mapTypeLabel, { color: isDark ? theme.textSecondary : '#64748B' }, mapMode === 'standard' && [styles.mapTypeLabelActive, { color: COLORS_THEMED.accent }]]}>Standard</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleSetMapMode('osm')}
                  style={({ pressed }) => [styles.mapTypeBtn, mapMode === 'osm' && [styles.mapTypeBtnActive, { backgroundColor: isDark ? theme.surfaceAlt : '#FFF' }], pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.mapTypeLabel, { color: isDark ? theme.textSecondary : '#64748B' }, mapMode === 'osm' && [styles.mapTypeLabelActive, { color: COLORS_THEMED.accent }]]}>OSM</Text>
                </Pressable>
              </View>
              {/* Expand button */}
              <Pressable
                onPress={() => setIsMapFullscreen(true)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? (isDark ? theme.sep1 : '#E2E8F0') : (isDark ? theme.bg1 : '#F1F5F9'),
                  padding: 6,
                  borderRadius: 8,
                })}
              >
                <Ionicons name="expand-outline" size={16} color={COLORS_THEMED.title} />
              </Pressable>
            </View>
          </View>
          <View style={[styles.mapContainer, { borderColor: isDark ? theme.sep2 : '#E2E8F0' }]}>
            {/* MapView is always mounted — never conditionally removed — to prevent reload on navigation */}
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              initialRegion={mapInitialRegion}
              mapType={
                mapMode === 'satellite'
                  ? 'satellite'
                  : (mapMode === 'standard'
                    ? 'standard'
                    : (Platform.OS === 'android' ? 'none' : 'standard'))
              }
              onMapReady={() => {
                if (!mapReadyRef.current) {
                  mapReadyRef.current = true;
                  setIsMapReady(true);
                }
              }}
              showsUserLocation={true}
              showsMyLocationButton={false}
              scrollEnabled={true}
              zoomEnabled={true}
              zoomControlEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              moveOnMarkerPress={false}
            >
              {mapMode === 'osm' && (
                <UrlTile
                  urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                  maximumZ={19}
                  tileSize={256}
                  zIndex={1}
                />
              )}
              {mapMarkers.map((marker) => (
                <Marker
                  key={`${marker.id}-${selectedParameter}`}
                  coordinate={marker.coordinate}
                  title={`Test on ${format(parseISO(marker.date), 'MMM d, yyyy')}`}
                  tracksViewChanges={false}
                >
                  <View style={[styles.customMarker, { borderColor: getParamColor(theme, selectedParameter), backgroundColor: isDark ? theme.surface : '#FFF' }]}>
                    <View style={[styles.markerDot, { backgroundColor: getParamColor(theme, selectedParameter) }]} />
                  </View>
                </Marker>
              ))}
            </MapView>
            {/* Overlay spinner shown only while map tiles load for the first time */}
            {!isMapReady && (
              <View style={[styles.mapLoaderOverlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }]}>
                <ActivityIndicator size="small" color={COLORS_THEMED.accent} />
              </View>
            )}
          </View>
        </View>

        {/* Fullscreen Map Modal */}
        <Modal
          visible={isMapFullscreen}
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setIsMapFullscreen(false)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <MapView
              ref={fullMapRef}
              style={StyleSheet.absoluteFillObject}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              initialRegion={mapInitialRegion}
              mapType={
                mapMode === 'satellite'
                  ? 'satellite'
                  : (mapMode === 'standard'
                    ? 'standard'
                    : (Platform.OS === 'android' ? 'none' : 'standard'))
              }
              showsUserLocation={true}
              showsMyLocationButton={true}
              scrollEnabled={true}
              zoomEnabled={true}
              zoomControlEnabled={true}
              rotateEnabled={true}
              pitchEnabled={true}
            >
              {mapMode === 'osm' && (
                <UrlTile
                  urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                  maximumZ={19}
                  tileSize={256}
                  zIndex={1}
                />
              )}
              {mapMarkers.map((marker) => (
                <Marker
                  key={`fs-${marker.id}`}
                  coordinate={marker.coordinate}
                  title={`Test on ${format(parseISO(marker.date), 'MMM d, yyyy')}`}
                  tracksViewChanges={false}
                >
                  <View style={[styles.customMarker, { borderColor: getParamColor(theme, selectedParameter), backgroundColor: isDark ? theme.surface : '#FFF' }]}>
                    <View style={[styles.markerDot, { backgroundColor: getParamColor(theme, selectedParameter) }]} />
                  </View>
                </Marker>
              ))}
            </MapView>
            {/* Close button */}
            <Pressable
              onPress={() => setIsMapFullscreen(false)}
              style={({ pressed }) => ({
                position: 'absolute',
                top: Platform.OS === 'android' ? 40 : 56,
                right: 16,
                backgroundColor: pressed ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.6)',
                borderRadius: 20,
                padding: 10,
                zIndex: 10,
              })}
            >
              <Ionicons name="contract-outline" size={20} color="#FFF" />
            </Pressable>
            {/* Map type row */}
            <View style={[styles.mapControls, {
              position: 'absolute',
              top: Platform.OS === 'android' ? 40 : 56,
              left: 16,
              zIndex: 10,
              backgroundColor: isDark ? theme.bg1 : '#FFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4,
            }]}>
              <Pressable onPress={() => handleSetMapMode('satellite')} style={({ pressed }) => [styles.mapTypeBtn, mapMode === 'satellite' && [styles.mapTypeBtnActive, { backgroundColor: isDark ? theme.surfaceAlt : '#FFF' }], pressed && { opacity: 0.7 }]}>
                <Text style={[styles.mapTypeLabel, { color: theme.textSecondary }, mapMode === 'satellite' && [styles.mapTypeLabelActive, { color: theme.textPrimary }]]}>Satellite</Text>
              </Pressable>
              <Pressable onPress={() => handleSetMapMode('standard')} style={({ pressed }) => [styles.mapTypeBtn, mapMode === 'standard' && [styles.mapTypeBtnActive, { backgroundColor: isDark ? theme.surfaceAlt : '#FFF' }], pressed && { opacity: 0.7 }]}>
                <Text style={[styles.mapTypeLabel, { color: theme.textSecondary }, mapMode === 'standard' && [styles.mapTypeLabelActive, { color: theme.textPrimary }]]}>Standard</Text>
              </Pressable>
              <Pressable onPress={() => handleSetMapMode('osm')} style={({ pressed }) => [styles.mapTypeBtn, mapMode === 'osm' && [styles.mapTypeBtnActive, { backgroundColor: isDark ? theme.surfaceAlt : '#FFF' }], pressed && { opacity: 0.7 }]}>
                <Text style={[styles.mapTypeLabel, { color: theme.textSecondary }, mapMode === 'osm' && [styles.mapTypeLabelActive, { color: theme.textPrimary }]]}>OSM</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* 2. Premium Apple Style Dropdown Filters */}
        <View style={styles.dropdownRow}>
          <Pressable
            style={({ pressed }) => [styles.appleDropdownBtn, { backgroundColor: theme.surface, borderColor: isDark ? theme.sep2 : '#E8EDF5' }, pressed && { opacity: 0.7 }]}
            onPress={handleOpenTimeMenu}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="calendar-outline" size={16} color={COLORS_THEMED.title} style={{ marginRight: 8 }} />
              <Text style={[styles.appleDropdownText, { color: COLORS_THEMED.title }]} numberOfLines={1}>{timeFilter}</Text>
            </View>
            <Ionicons name="chevron-down" size={14} color={COLORS_THEMED.subtitle} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.appleDropdownBtn, { backgroundColor: theme.surface, borderColor: isDark ? theme.sep2 : '#E8EDF5' }, pressed && { opacity: 0.7 }]}
            onPress={handleOpenParamMenu}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.paramColorDot, { backgroundColor: getParamColor(theme, selectedParameter), marginRight: 8 }]} />
              <Text style={[styles.appleDropdownText, { color: COLORS_THEMED.title }]} numberOfLines={1}>{selectedParameter}</Text>
            </View>
            <Ionicons name="chevron-down" size={14} color={COLORS_THEMED.subtitle} />
          </Pressable>
        </View>

        {/* 3. Trend Chart */}
        <View style={[styles.card, { backgroundColor: COLORS_THEMED.card, borderColor: COLORS_THEMED.border }]}>
          <Text style={[styles.cardTitle, { color: COLORS_THEMED.subtitle }]}>{selectedParameter} Trend Analysis</Text>
          {loading ? (
            <View style={styles.chartLoader}><ActivityIndicator color={COLORS_THEMED.accent} /></View>
          ) : filteredLogs.length === 0 ? (
            <View style={styles.chartEmptyContainer}>
              <LottieView source={require('../../assets/animations/history-trend.json')} autoPlay loop style={styles.chartLottie} resizeMode="contain" />
              <Text style={[styles.noDataTitle, { color: COLORS_THEMED.title }]}>No Trend Data</Text>
              <Text style={[styles.noData, { color: COLORS_THEMED.subtitle }]}>Insufficient data to show trend for {timeFilter}.</Text>
            </View>
          ) : (
            // overflow:hidden clips the wide chart SVG to the card boundary — fixes white bleed on L/R
            <View style={{ overflow: 'hidden', marginHorizontal: -16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
              <View style={{ position: 'relative' }}>
                <LineChart
                  data={chartData}
                  width={SCREEN_WIDTH + 45}
                  height={232}
                  chartConfig={{
                    backgroundColor: theme.surface, backgroundGradientFrom: theme.surface, backgroundGradientTo: theme.surface,
                    decimalPlaces: selectedParameter === 'pH Level' ? 1 : 0,
                    color: (opacity = 1) => getParamColor(theme, selectedParameter),
                    labelColor: (opacity = 1) => isDark ? theme.textMuted : '#94A3B8',
                    style: { borderRadius: 16 },
                    propsForDots: { r: '6', strokeWidth: '2', stroke: theme.surface },
                    propsForLabels: { fontFamily: 'Sora_400Regular', fontSize: 10 },
                    propsForBackgroundLines: { strokeDasharray: '4,4', stroke: isDark ? theme.sep2 : '#F1F5F9', strokeWidth: 1 },
                  }}
                  bezier
                  style={{ ...styles.chart, marginLeft: -33, marginVertical: 0 }}
                  withInnerLines={true}
                  withOuterLines={false}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  onDataPointClick={({ value, index, x, y }) => {
                    setChartTooltip(prev =>
                      prev?.index === index ? null : { x, y, value, index }
                    );
                  }}
                />
                {chartTooltip !== null && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.chartTooltipBox,
                      {
                        left: Math.max(4, Math.min(
                          chartTooltip.x - 16 - 45,
                          SCREEN_WIDTH - 95
                        )),
                        top: Math.max(4, chartTooltip.y - 66),
                        backgroundColor: isDark ? theme.surfaceAlt : '#1E293B'
                      },
                    ]}
                  >
                    <Text style={[styles.tooltipDateText, { color: isDark ? theme.textMuted : '#94A3B8' }]}>
                      {chartData.labels[chartTooltip.index]}
                    </Text>
                    <Text style={[styles.tooltipValueText, { color: getParamColor(theme, selectedParameter) }]}>
                      {selectedParameter === 'pH Level'
                        ? chartTooltip.value.toFixed(1)
                        : Math.round(chartTooltip.value).toString()}
                      {UNITS[selectedParameter] ? ` ${UNITS[selectedParameter]}` : ''}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* 4. Stats */}
        <View style={[styles.statsBar, { backgroundColor: COLORS_THEMED.card, borderColor: COLORS_THEMED.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: COLORS_THEMED.subtitle }]}>Avg {selectedParameter}</Text>
            <Text style={[styles.statValue, { color: getParamColor(theme, selectedParameter) }]}>
              {selectedParameter === 'pH Level' ? stats.avg.toFixed(1) : stats.avg.toFixed(0)}
              <Text style={[styles.unitText, { color: COLORS_THEMED.subtitle }]}> {UNITS[selectedParameter]}</Text>
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: isDark ? theme.sep2 : '#F1F5F9' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: COLORS_THEMED.subtitle }]}>Total Tests</Text>
            <Text style={[styles.statValue, { color: COLORS_THEMED.title }]}>{stats.total}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: isDark ? theme.sep2 : '#F1F5F9' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: COLORS_THEMED.subtitle }]}>Trend</Text>
            <View style={styles.trendRow}>
              <Ionicons name={stats.change >= 0 ? "trending-up" : "trending-down"} size={16} color={stats.change >= 0 ? "#10B981" : "#EF4444"} />
              <Text style={[styles.trendText, { color: stats.change >= 0 ? "#10B981" : "#EF4444" }]}>{Math.abs(stats.change).toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        {/* 5. History log title */}
        <View style={[styles.historyCard, { backgroundColor: COLORS_THEMED.card, borderColor: COLORS_THEMED.border, paddingBottom: 16 }]}>
          <Text style={[styles.cardTitle, { color: COLORS_THEMED.subtitle }]}>
            Test History Log ({timeFilter === 'All Time' ? 'All Time' : `Last ${timeFilter}`})
          </Text>
          {loading && <View style={styles.chartLoader}><ActivityIndicator color={COLORS_THEMED.accent} /></View>}
          {!loading && filteredLogs.length === 0 ? (
            <View style={styles.noDataContainer}>
              <LottieView source={require('../../assets/animations/soil-analysis-data.json')} autoPlay loop style={styles.historyLottie} resizeMode="contain" />
              <Text style={[styles.noDataTitle, { color: COLORS_THEMED.title }]}>No Records</Text>
              <Text style={[styles.noData, { color: COLORS_THEMED.subtitle }]}>No soil tests in the selected {timeFilter} range.</Text>
            </View>
          ) : (
            <ScrollView
              style={{ marginTop: 25, maxHeight: 450 }}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {filteredLogs.map((log, index) => (
                <View style={styles.timelineRow} key={log.id || index.toString()}>
                  <View style={styles.timelineLineContainer}>
                    <View style={[styles.timelineDot, { backgroundColor: COLORS_THEMED.accent, borderColor: isDark ? theme.bg1 : '#FFF', shadowColor: COLORS_THEMED.accent }]} />
                    {index !== filteredLogs.length - 1 && <View style={[styles.timelineLine, { backgroundColor: isDark ? theme.sep2 : '#E2E8F0' }]} />}
                  </View>
                  <TouchableOpacity style={[styles.timelineContent, { backgroundColor: theme.surface, borderColor: COLORS_THEMED.border }]} onPress={() => openDetails(log)} activeOpacity={0.7}>
                    <View style={[styles.logIcon, { backgroundColor: isDark ? theme.bg1 : '#F0FDF4' }]}><Ionicons name="leaf" size={18} color={COLORS_THEMED.accent} /></View>
                    <View style={styles.logInfo}>
                      <Text style={[styles.logDate, { color: COLORS_THEMED.title }]}>{format(parseISO(log.testDate), 'MMM d, yyyy')}</Text>
                      <Text style={[styles.logTime, { color: COLORS_THEMED.subtitle }]}>{format(parseISO(log.testDate), 'hh:mm a')}</Text>
                    </View>
                    <View style={styles.logValues}>
                      <Text style={[styles.logMainValue, { color: getParamColor(theme, selectedParameter) }]}>
                        {selectedParameter === 'pH Level' ? 'pH' : (selectedParameter === 'Moisture' ? 'M' : selectedParameter.charAt(0))}{' '}
                        {Number(log[getParamKey(selectedParameter)]).toFixed(selectedParameter === 'pH Level' ? 1 : 0)}
                        <Text style={styles.logUnitSmall}> {UNITS[selectedParameter]}</Text>
                      </Text>
                      <Text style={[styles.logSubValue, { color: COLORS_THEMED.subtitle }]}>
                        {selectedParameter !== 'pH Level' && `pH:${Number(log.ph).toFixed(1)} `}
                        {selectedParameter !== 'Nitrogen' && `N:${Number(log.nitrogen).toFixed(0)} `}
                        {selectedParameter !== 'Phosphorus' && `P:${Number(log.phosphorus).toFixed(0)} `}
                        {selectedParameter !== 'Potassium' && `K:${Number(log.potassium).toFixed(0)}`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={isDark ? theme.border : "#CBD5E1"} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Details Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalGrabber, { backgroundColor: isDark ? theme.sep2 : '#CBD5E1' }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: COLORS_THEMED.title }]}>Test Details</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close-circle-outline" size={28} color={COLORS_THEMED.subtitle} />
              </TouchableOpacity>
            </View>

            {selectedLog && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* 1. Metrics Section */}
                <Text style={[styles.sectionTitle, { color: COLORS_THEMED.title }]}>Metrics</Text>
                <View style={styles.modalHero}>
                  <View style={[styles.scoreCircle, { borderColor: isDark ? theme.bg1 : '#F0FDF4' }]}>
                    <Text style={[styles.scoreValue, { color: COLORS_THEMED.accent }]}>{selectedLog.healthScore || 'N/A'}</Text>
                    <Text style={[styles.scoreLabel, { color: COLORS_THEMED.subtitle }]}>Health Score</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: isDark ? theme.bg1 : '#F8FAFC' }]}>
                    <View style={[styles.statusDot, { backgroundColor: selectedLog.status === 'Critical' ? '#EF4444' : '#10B981' }]} />
                    <Text style={[styles.statusText, { color: COLORS_THEMED.title }]}>{selectedLog.status || 'Good'}</Text>
                  </View>
                  <Text style={[styles.modalDate, { color: COLORS_THEMED.subtitle }]}>
                    {format(parseISO(selectedLog.testDate), 'MMMM d, yyyy • hh:mm a')}
                  </Text>
                </View>

                <View style={styles.modalStatsGrid}>
                  <View style={[styles.modalStatCard, { backgroundColor: isDark ? theme.bg1 : '#F8FAFC', borderColor: isDark ? theme.sep2 : '#F1F5F9' }]}>
                    <Text style={[styles.modalStatLabel, { color: COLORS_THEMED.subtitle }]}>Nitrogen</Text>
                    <Text style={[styles.modalStatValue, { color: COLORS_THEMED.title }]}>{Number(selectedLog.nitrogen).toFixed(0)} <Text style={styles.modalUnit}>ppm</Text></Text>
                  </View>
                  <View style={[styles.modalStatCard, { backgroundColor: isDark ? theme.bg1 : '#F8FAFC', borderColor: isDark ? theme.sep2 : '#F1F5F9' }]}>
                    <Text style={[styles.modalStatLabel, { color: COLORS_THEMED.subtitle }]}>Phosphorus</Text>
                    <Text style={[styles.modalStatValue, { color: COLORS_THEMED.title }]}>{Number(selectedLog.phosphorus).toFixed(0)} <Text style={styles.modalUnit}>ppm</Text></Text>
                  </View>
                  <View style={[styles.modalStatCard, { backgroundColor: isDark ? theme.bg1 : '#F8FAFC', borderColor: isDark ? theme.sep2 : '#F1F5F9' }]}>
                    <Text style={[styles.modalStatLabel, { color: COLORS_THEMED.subtitle }]}>Potassium</Text>
                    <Text style={[styles.modalStatValue, { color: COLORS_THEMED.title }]}>{Number(selectedLog.potassium).toFixed(0)} <Text style={styles.modalUnit}>ppm</Text></Text>
                  </View>
                  <View style={[styles.modalStatCard, { backgroundColor: isDark ? theme.bg1 : '#F8FAFC', borderColor: isDark ? theme.sep2 : '#F1F5F9' }]}>
                    <Text style={[styles.modalStatLabel, { color: COLORS_THEMED.subtitle }]}>pH Level</Text>
                    <Text style={[styles.modalStatValue, { color: COLORS_THEMED.title }]}>{Number(selectedLog.ph).toFixed(1)}</Text>
                  </View>
                  <View style={[styles.modalStatCard, { backgroundColor: isDark ? theme.bg1 : '#F8FAFC', borderColor: isDark ? theme.sep2 : '#F1F5F9' }]}>
                    <Text style={[styles.modalStatLabel, { color: COLORS_THEMED.subtitle }]}>Moisture</Text>
                    <Text style={[styles.modalStatValue, { color: COLORS_THEMED.title }]}>{selectedLog.moisture != null ? `${Number(selectedLog.moisture).toFixed(1)}%` : 'N/A'}</Text>
                  </View>
                  <View style={[styles.modalStatCard, { backgroundColor: isDark ? theme.bg1 : '#F8FAFC', borderColor: isDark ? theme.sep2 : '#F1F5F9' }]}>
                    <Text style={[styles.modalStatLabel, { color: COLORS_THEMED.subtitle }]}>Temp</Text>
                    <Text style={[styles.modalStatValue, { color: COLORS_THEMED.title }]}>{selectedLog.temperature != null ? `${Number(selectedLog.temperature).toFixed(1)}°C` : 'N/A'}</Text>
                  </View>
                </View>

                {/* 2. AI Recommendation Section */}
                <Text style={[styles.sectionTitle, { color: COLORS_THEMED.title }]}>AI Recommendation</Text>
                <View style={[styles.recommendationCard, { backgroundColor: COLORS_THEMED.warningBg, borderColor: COLORS_THEMED.warningBorder }]}>
                  <View style={styles.recommendationHeader}>
                    <Ionicons name="sparkles" size={20} color={COLORS_THEMED.accent} />
                    <Text style={[styles.recommendationTitle, { color: COLORS_THEMED.title }]}>Insights</Text>
                  </View>
                  {selectedLog.recommendation?.recommendations ? (
                    <Text style={[styles.recommendationText, { color: isDark ? theme.textSecondary : '#475569' }]}>
                      {selectedLog.recommendation.recommendations}
                    </Text>
                  ) : (
                    <Text style={[styles.recommendationText, { color: isDark ? theme.textSecondary : '#475569' }]}>
                      Based on your soil analysis, your soil health is currently stable. Maintain regular organic composting and ensure balanced irrigation.
                    </Text>
                  )}
                  {selectedLog.recommendation?.naturalFertilizers && selectedLog.recommendation.naturalFertilizers.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[styles.recommendationTitle, { color: COLORS_THEMED.title, fontSize: 13, marginBottom: 8, marginLeft: 0 }]}>🌿 Natural Fertilizers</Text>
                      {selectedLog.recommendation.naturalFertilizers.slice(0, 3).map((f, i) => (
                        <Text key={i} style={[styles.recommendationText, { color: isDark ? theme.textSecondary : '#475569', marginBottom: 4 }]}>
                          • <Text style={{ fontFamily: 'Sora_600SemiBold' }}>{f.name}</Text> — {f.amount}
                        </Text>
                      ))}
                    </View>
                  )}
                  {selectedLog.recommendation?.chemicalFertilizers && selectedLog.recommendation.chemicalFertilizers.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[styles.recommendationTitle, { color: COLORS_THEMED.title, fontSize: 13, marginBottom: 8, marginLeft: 0 }]}>🧪 Chemical Fertilizers</Text>
                      {selectedLog.recommendation.chemicalFertilizers.slice(0, 3).map((f, i) => (
                        <Text key={i} style={[styles.recommendationText, { color: isDark ? theme.textSecondary : '#475569', marginBottom: 4 }]}>
                          • <Text style={{ fontFamily: 'Sora_600SemiBold' }}>{f.name}</Text> — {f.amount}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>

                {/* 3. Location Section */}
                <Text style={[styles.sectionTitle, { color: COLORS_THEMED.title }]}>Location</Text>
                <View style={[styles.locationCard, { backgroundColor: isDark ? theme.bg1 : '#F8FAFC', borderColor: isDark ? theme.sep2 : '#F1F5F9' }]}>
                  {selectedLog.latitude != null ? (
                    <>
                      <Ionicons name="location" size={24} color={COLORS_THEMED.accent} style={{ marginRight: 12 }} />
                      <View>
                        <Text style={[styles.locationDetailTitle, { color: COLORS_THEMED.title }]}>Coordinates</Text>
                        <Text style={[styles.locationDetailText, { color: COLORS_THEMED.subtitle }]}>
                          {Number(selectedLog.latitude).toFixed(6)}, {Number(selectedLog.longitude).toFixed(6)}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Ionicons name="location-outline" size={24} color={COLORS_THEMED.subtitle} style={{ marginRight: 12 }} />
                      <View>
                        <Text style={[styles.locationDetailTitle, { color: COLORS_THEMED.title }]}>Location Unavailable</Text>
                        <Text style={[styles.locationDetailText, { color: COLORS_THEMED.subtitle }]}>No coordinates recorded</Text>
                      </View>
                    </>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.modalExportButton, { backgroundColor: COLORS_THEMED.title }]}
                  onPress={() => {
                    setIsModalVisible(false);
                    exportSoilReport([selectedLog], user as any);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="download-outline" size={20} color={isDark ? theme.background : "#FFF"} style={{ marginRight: 8 }} />
                  <Text style={[styles.modalExportText, { color: isDark ? theme.background : "#FFF" }]}>Export Report</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Time Filter Bottom Sheet */}
      <Modal
        visible={isTimeMenuVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsTimeMenuVisible(false)}
      >
        <View style={StyleSheet.absoluteFill}>
          <BlurView intensity={isDark ? 40 : 25} tint={isDark ? "dark" : "dark"} style={StyleSheet.absoluteFill} />
          <Pressable
            style={styles.actionSheetOverlay}
            onPress={() => setIsTimeMenuVisible(false)}
          >
            <View style={[styles.actionSheetContent, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true}>
              <View style={[styles.actionSheetGrabber, { backgroundColor: isDark ? theme.sep2 : '#CBD5E1' }]} />
              <View style={[styles.actionSheetHeader, { borderBottomColor: isDark ? theme.sep2 : '#F1F5F9' }]}>
                <Text style={[styles.actionSheetTitle, { color: COLORS_THEMED.title }]}>Time Interval</Text>
              </View>
              {TIME_FILTERS.map((filter) => {
                const isActive = timeFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    style={({ pressed }) => [
                      styles.actionSheetItem,
                      isActive && [styles.actionSheetItemActive, { backgroundColor: isDark ? theme.bg1 : '#F8FAFC' }],
                      pressed && { backgroundColor: isDark ? theme.bg1 : '#F1F5F9' }
                    ]}
                    onPress={() => handleSelectTimeFilter(filter)}
                  >
                    <Text style={[styles.actionSheetText, { color: isDark ? theme.textSecondary : '#475569' }, isActive && [styles.actionSheetTextActive, { color: COLORS_THEMED.title }]]}>
                      {filter}
                    </Text>
                    {isActive && <Ionicons name="checkmark-circle" size={20} color={COLORS_THEMED.title} />}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </View>
      </Modal>

      {/* Parameter Bottom Sheet */}
      <Modal
        visible={isParamMenuVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsParamMenuVisible(false)}
      >
        <View style={StyleSheet.absoluteFill}>
          <BlurView intensity={isDark ? 40 : 25} tint={isDark ? "dark" : "dark"} style={StyleSheet.absoluteFill} />
          <Pressable
            style={styles.actionSheetOverlay}
            onPress={() => setIsParamMenuVisible(false)}
          >
            <View style={[styles.actionSheetContent, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true}>
              <View style={[styles.actionSheetGrabber, { backgroundColor: isDark ? theme.sep2 : '#CBD5E1' }]} />
              <View style={[styles.actionSheetHeader, { borderBottomColor: isDark ? theme.sep2 : '#F1F5F9' }]}>
                <Text style={[styles.actionSheetTitle, { color: COLORS_THEMED.title }]}>Soil Parameter</Text>
              </View>
              {PARAMETERS.map((param) => {
                const isActive = selectedParameter === param;
                const color = getParamColor(theme, param);
                return (
                  <Pressable
                    key={param}
                    style={({ pressed }) => [
                      styles.actionSheetItem,
                      isActive && [styles.actionSheetItemActive, { backgroundColor: isDark ? theme.bg1 : '#F8FAFC' }],
                      pressed && { backgroundColor: isDark ? theme.bg1 : '#F1F5F9' }
                    ]}
                    onPress={() => handleSelectParam(param)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.paramColorDot, { backgroundColor: color, marginRight: 12 }]} />
                      <Text style={[styles.actionSheetText, { color: isDark ? theme.textSecondary : '#475569' }, isActive && { color: color, fontFamily: 'Sora_600SemiBold' }]}>
                        {param}
                      </Text>
                    </View>
                    {isActive && <Ionicons name="checkmark-circle" size={20} color={color} />}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    marginVertical: 16,
    gap: 12,
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  paramScroll: {
    paddingHorizontal: 12,
    gap: 8,
    paddingBottom: 4,
  },
  applePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
    marginRight: 8,
  },
  applePillActive: {
    backgroundColor: COLORS.title,
    borderColor: COLORS.title,
  },
  applePillText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
    color: '#64748B',
  },
  applePillTextActive: {
    color: '#FFF',
  },
  paramApplePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
    marginRight: 8,
  },
  paramApplePillText: {
    fontFamily: 'Sora_500Medium',
    fontSize: 13,
    color: '#475569',
  },
  paramColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  mapLoaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyListContainer: {
    marginTop: 8,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: 20,
  },
  greeting: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: COLORS.subtitle,
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: 28,
    color: COLORS.title,
    marginTop: -4,
  },
  exportButton: {
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  exportText: {
    fontFamily: 'Sora_600SemiBold',
    color: '#FFF',
    fontSize: 13,
    marginLeft: 6,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: 10,
    color: COLORS.subtitle,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'Sora_700Bold',
    fontSize: 18,
    color: COLORS.title,
  },
  unitText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 10,
    color: COLORS.subtitle,
  },
  divider: {
    width: 1,
    height: 30,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    marginLeft: 2,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: COLORS.title,
    borderColor: COLORS.title,
  },
  filterLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: 12,
    color: '#64748B',
  },
  filterLabelActive: {
    color: '#FFF',
  },
  paramPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  colorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  paramLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: 12,
    color: '#64748B',
  },
  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: 12,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 13,
    color: COLORS.subtitle,
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    marginLeft: -16, // Offset card padding perfectly
  },
  chartLoader: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    height: 260,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapToggle: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    color: COLORS.accentDark,
  },
  customMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  logIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logInfo: {
    flex: 1,
  },
  logDate: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 14,
    color: COLORS.title,
  },
  logTime: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    color: COLORS.subtitle,
    marginTop: 2,
  },
  logValues: {
    alignItems: 'flex-end',
    marginRight: 10,
  },
  logMainValue: {
    fontFamily: 'Sora_700Bold',
    fontSize: 15,
    color: COLORS.title,
  },
  logUnitSmall: {
    fontSize: 10,
    fontFamily: 'Sora_400Regular',
    color: '#94A3B8',
  },
  logSubValue: {
    fontFamily: 'Sora_500Medium',
    fontSize: 11,
    color: COLORS.subtitle,
    marginTop: 2,
  },
  logUnit: {
    fontFamily: 'Sora_400Regular',
    fontSize: 9,
    color: COLORS.subtitle,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noDataTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: COLORS.title,
    marginBottom: 8,
  },
  noData: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: COLORS.subtitle,
    textAlign: 'center',
    maxWidth: 200,
    lineHeight: 20,
    marginBottom: 24,
  },
  startTestButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  startTestText: {
    fontFamily: 'Sora_600SemiBold',
    color: '#FFF',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 20,
    color: COLORS.title,
  },
  closeButton: {
    padding: 4,
  },
  modalHero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreValue: {
    fontFamily: 'Sora_700Bold',
    fontSize: 28,
    color: COLORS.accentDark,
  },
  scoreLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: 10,
    color: COLORS.subtitle,
    marginTop: -2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    color: COLORS.title,
  },
  modalDate: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: COLORS.subtitle,
  },
  modalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalStatCard: {
    width: '31%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  modalStatLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: 10,
    color: COLORS.subtitle,
    marginBottom: 4,
  },
  modalStatValue: {
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
    color: COLORS.title,
  },
  modalUnit: {
    fontFamily: 'Sora_400Regular',
    fontSize: 9,
    color: COLORS.subtitle,
  },
  recommendationCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recommendationTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: COLORS.title,
    marginLeft: 8,
  },
  recommendationText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  locationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  locationDetailText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    color: COLORS.subtitle,
    marginTop: 2,
  },
  modalExportButton: {
    backgroundColor: COLORS.title,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.title,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalExportText: {
    fontFamily: 'Sora_600SemiBold',
    color: '#FFF',
    fontSize: 15,
  },
  // ── New styles for timeline & modal sections ───────────────────────
  timelineContainer: {
    marginTop: 8,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineLineContainer: {
    width: 20, // Reduced from 24
    alignItems: 'center',
    marginRight: 8, // Reduced from 12
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 24,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 18,
    color: COLORS.title,
    marginBottom: 16,
    marginTop: 24,
  },
  modalGrabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  locationDetailTitle: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 14,
    color: COLORS.title,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningBg,
    marginHorizontal: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
    fontFamily: 'Sora_500Medium',
    fontSize: 12,
    color: COLORS.warningText,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 22,
    color: COLORS.title,
    marginTop: 24,
  },
  emptyText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 15,
    color: COLORS.subtitle,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  // ── Full-screen empty state styles ──────────────────────────────────
  fullEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -40,
  },
  fullEmptyIllustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  fullEmptyTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 22,
    color: COLORS.title,
    marginBottom: 12,
  },
  fullEmptySubtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: 15,
    color: COLORS.subtitle,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 280,
  },
  mapControls: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  mapTypeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mapTypeBtnActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mapTypeLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 10,
    color: '#64748B',
  },
  mapTypeLabelActive: {
    color: COLORS.accent,
  },
  chartEmptyContainer: {
    height: 226,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  chartLottie: {
    width: 140,
    height: 140,
  },
  historyLottie: {
    width: 180,
    height: 180,
    marginBottom: 8,
  },
  historyCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 12,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  historyList: {
    maxHeight: 420, // fixed height — scrollable inside the card
  },
  dropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginVertical: 9,
    gap: 12,
  },
  appleDropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8EDF5',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    minHeight: 46,
  },
  appleDropdownText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
    color: COLORS.title,
    flexShrink: 1,
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  actionSheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  actionSheetGrabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  actionSheetHeader: {
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  actionSheetTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: COLORS.title,
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  actionSheetItemActive: {
  },
  actionSheetText: {
    fontFamily: 'Sora_500Medium',
    fontSize: 15,
  },
  actionSheetTextActive: {
    fontFamily: 'Sora_600SemiBold',
    color: COLORS.title,
  },
  chartTooltipBox: {
    position: 'absolute',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 90,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100,
  },
  tooltipDateText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 3,
  },
  tooltipValueText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
  },
});
