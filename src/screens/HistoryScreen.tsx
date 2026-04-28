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

const getParamColor = (param: ParameterName): string => {
  switch (param) {
    case 'Nitrogen': return '#EF4444';
    case 'Phosphorus': return '#8B5CF6';
    case 'Potassium': return '#F59E0B';
    case 'pH Level': return '#2563EB';
    case 'Moisture': return '#10B981';
    default: return '#10B981';
  }
};

export default function HistoryScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { currentIndex } = useNavigationStore();
  const { addSoilMarkers } = useSoilMarkers();
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
  const [isMapReady, setIsMapReady] = useState(false);
  const [isTimeMenuVisible, setIsTimeMenuVisible] = useState(false);
  const [isParamMenuVisible, setIsParamMenuVisible] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Safety fallback to dismiss the perpetual loader if onMapReady never fires
  useEffect(() => {
    const timer = setTimeout(() => {
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
  }, []);



  // Change map mode without resetting ready state to prevent blank flashes and reloading loops
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

  // Fallback to ensure map loader disappears even if onMapReady doesn't fire
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isMapReady) {
      timer = setTimeout(() => {
        console.log('[History] Map ready fallback triggered');
        setIsMapReady(true);
      }, 2500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isMapReady]);

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
        color: (opacity = 1) => getParamColor(selectedParameter),
        strokeWidth: 3
      }]
    };
  }, [filteredLogs, selectedParameter]);

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
      latitude: 20.5937,
      longitude: 78.9629,
      latitudeDelta: 20,
      longitudeDelta: 20,
    };
  }, [logs]);

  // Animate map to region when initial region changes or map becomes ready
  useEffect(() => {
    if (isMapReady && mapRef.current && mapInitialRegion) {
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

  // ── Full-screen empty state when user has zero soil tests ────────────────
  if (!loading && logs.length === 0 && !error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <LinearGradient colors={[COLORS.backgroundTop, COLORS.backgroundBottom]} style={StyleSheet.absoluteFill} />

        {/* Keep the header so the screen isn't disorienting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Analytics Lab</Text>
          </View>
        </View>

        <View style={styles.fullEmptyState}>
          <LottieView
            source={require('../../assets/animations/soil-analysis-data.json')}
            autoPlay
            loop
            style={{ width: 220, height: 220 }}
            resizeMode="contain"
          />
          <Text style={styles.fullEmptyTitle}>No Data Available</Text>
          <Text style={styles.fullEmptySubtitle}>
            Your soil analysis history will appear here once tests are recorded.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={[COLORS.backgroundTop, COLORS.backgroundBottom]} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Analytics Lab</Text>
        </View>
        <TouchableOpacity style={styles.exportButton} onPress={handleExport} disabled={isExporting}>
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color={COLORS.warningText} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* 1. Field Location - Map */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Field Locations</Text>
            <View style={styles.mapControls}>
              <Pressable
                onPress={() => handleSetMapMode('satellite')}
                style={({ pressed }) => [styles.mapTypeBtn, mapMode === 'satellite' && styles.mapTypeBtnActive, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.mapTypeLabel, mapMode === 'satellite' && styles.mapTypeLabelActive]}>Satellite</Text>
              </Pressable>
              <Pressable
                onPress={() => handleSetMapMode('standard')}
                style={({ pressed }) => [styles.mapTypeBtn, mapMode === 'standard' && styles.mapTypeBtnActive, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.mapTypeLabel, mapMode === 'standard' && styles.mapTypeLabelActive]}>Standard</Text>
              </Pressable>
              <Pressable
                onPress={() => handleSetMapMode('osm')}
                style={({ pressed }) => [styles.mapTypeBtn, mapMode === 'osm' && styles.mapTypeBtnActive, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.mapTypeLabel, mapMode === 'osm' && styles.mapTypeLabelActive]}>OSM</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.mapContainer}>
            {currentIndex === 3 ? (
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
                onMapReady={() => setIsMapReady(true)}
                showsUserLocation={true}
                showsMyLocationButton={true}
                scrollEnabled={true}
                zoomEnabled={true}
                zoomControlEnabled={true}
                rotateEnabled={false}
                pitchEnabled={false}
                moveOnMarkerPress={false}
              >
                {mapMode === 'osm' && (
                  <UrlTile
                    urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    tileCache={true}
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
                    <View style={[styles.customMarker, { borderColor: getParamColor(selectedParameter) }]}>
                      <View style={[styles.markerDot, { backgroundColor: getParamColor(selectedParameter) }]} />
                    </View>
                  </Marker>
                ))}
              </MapView>
            ) : (
              <View style={styles.mapLoaderOverlay}>
                <ActivityIndicator size="small" color={COLORS.accent} />
              </View>
            )}
            {currentIndex === 3 && !isMapReady && (
              <View style={styles.mapLoaderOverlay}>
                <ActivityIndicator size="small" color={COLORS.accent} />
              </View>
            )}
          </View>
        </View>

        {/* 2. Premium Apple Style Dropdown Filters */}
        <View style={styles.dropdownRow}>
          <Pressable 
            style={({ pressed }) => [styles.appleDropdownBtn, pressed && { opacity: 0.7 }]} 
            onPress={handleOpenTimeMenu}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.title} style={{ marginRight: 8 }} />
              <Text style={styles.appleDropdownText} numberOfLines={1}>{timeFilter}</Text>
            </View>
            <Ionicons name="chevron-down" size={14} color={COLORS.subtitle} />
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.appleDropdownBtn, pressed && { opacity: 0.7 }]} 
            onPress={handleOpenParamMenu}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.paramColorDot, { backgroundColor: getParamColor(selectedParameter), marginRight: 8 }]} />
              <Text style={styles.appleDropdownText} numberOfLines={1}>{selectedParameter}</Text>
            </View>
            <Ionicons name="chevron-down" size={14} color={COLORS.subtitle} />
          </Pressable>
        </View>

        {/* 3. Trend Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selectedParameter} Trend Analysis</Text>
          {loading ? (
            <View style={styles.chartLoader}><ActivityIndicator color={COLORS.accent} /></View>
          ) : filteredLogs.length === 0 ? (
            <View style={styles.chartEmptyContainer}>
              <LottieView source={require('../../assets/animations/history-trend.json')} autoPlay loop style={styles.chartLottie} resizeMode="contain" />
              <Text style={styles.noDataTitle}>No Trend Data</Text>
              <Text style={styles.noData}>Insufficient data to show trend for {timeFilter}.</Text>
            </View>
          ) : (
            <LineChart
              data={chartData} width={SCREEN_WIDTH - 24} height={226}
              chartConfig={{
                backgroundColor: '#FFF', backgroundGradientFrom: '#FFF', backgroundGradientTo: '#FFF',
                decimalPlaces: selectedParameter === 'pH Level' ? 1 : 0,
                color: (opacity = 1) => getParamColor(selectedParameter),
                labelColor: (opacity = 1) => '#94A3B8',
                style: { borderRadius: 16 },
                propsForDots: { r: '5', strokeWidth: '2', stroke: '#FFF' },
                propsForLabels: { fontFamily: 'Sora_400Regular', fontSize: 10 }
              }}
              bezier style={styles.chart} withInnerLines={false} withOuterLines={false} withVerticalLines={false}
            />
          )}
        </View>

        {/* 4. Stats */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg {selectedParameter}</Text>
            <Text style={[styles.statValue, { color: getParamColor(selectedParameter) }]}>
              {selectedParameter === 'pH Level' ? stats.avg.toFixed(1) : stats.avg.toFixed(0)}
              <Text style={styles.unitText}> {UNITS[selectedParameter]}</Text>
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Tests</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Trend</Text>
            <View style={styles.trendRow}>
              <Ionicons name={stats.change >= 0 ? "trending-up" : "trending-down"} size={16} color={stats.change >= 0 ? "#10B981" : "#EF4444"} />
              <Text style={[styles.trendText, { color: stats.change >= 0 ? "#10B981" : "#EF4444" }]}>{Math.abs(stats.change).toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        {/* 5. History log title */}
        <View style={[styles.historyCard, { paddingBottom: 16 }]}>
          <Text style={styles.cardTitle}>
            Test History Log ({timeFilter === 'All Time' ? 'All Time' : `Last ${timeFilter}`})
          </Text>
          {loading && <View style={styles.chartLoader}><ActivityIndicator color={COLORS.accent} /></View>}
          {!loading && filteredLogs.length === 0 ? (
            <View style={styles.noDataContainer}>
              <LottieView source={require('../../assets/animations/soil-analysis-data.json')} autoPlay loop style={styles.historyLottie} resizeMode="contain" />
              <Text style={styles.noDataTitle}>No Records</Text>
              <Text style={styles.noData}>No soil tests in the selected {timeFilter} range.</Text>
            </View>
          ) : (
            <View style={{ marginTop: 10 }}>
                {filteredLogs.map((log, index) => (
                  <View style={styles.timelineRow} key={log.id || index.toString()}>
                    <View style={styles.timelineLineContainer}>
                      <View style={styles.timelineDot} />
                      {index !== filteredLogs.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <TouchableOpacity style={styles.timelineContent} onPress={() => openDetails(log)} activeOpacity={0.7}>
                      <View style={styles.logIcon}><Ionicons name="leaf" size={18} color={COLORS.accent} /></View>
                      <View style={styles.logInfo}>
                        <Text style={styles.logDate}>{format(parseISO(log.testDate), 'MMM d, yyyy')}</Text>
                        <Text style={styles.logTime}>{format(parseISO(log.testDate), 'hh:mm a')}</Text>
                      </View>
                      <View style={styles.logValues}>
                        <Text style={[styles.logMainValue, { color: getParamColor(selectedParameter) }]}>
                          {selectedParameter === 'pH Level' ? 'pH' : (selectedParameter === 'Moisture' ? 'M' : selectedParameter.charAt(0))}{' '}
                          {Number(log[getParamKey(selectedParameter)]).toFixed(selectedParameter === 'pH Level' ? 1 : 0)}
                          <Text style={styles.logUnitSmall}> {UNITS[selectedParameter]}</Text>
                        </Text>
                        <Text style={styles.logSubValue}>
                          {selectedParameter !== 'pH Level' && `pH:${Number(log.ph).toFixed(1)} `}
                          {selectedParameter !== 'Nitrogen' && `N:${Number(log.nitrogen).toFixed(0)} `}
                          {selectedParameter !== 'Phosphorus' && `P:${Number(log.phosphorus).toFixed(0)} `}
                          {selectedParameter !== 'Potassium' && `K:${Number(log.potassium).toFixed(0)}`}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
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
          <View style={styles.modalContent}>
            <View style={styles.modalGrabber} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Test Details</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close-circle-outline" size={28} color={COLORS.subtitle} />
              </TouchableOpacity>
            </View>

            {selectedLog && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* 1. Metrics Section */}
                <Text style={styles.sectionTitle}>Metrics</Text>
                <View style={styles.modalHero}>
                  <View style={styles.scoreCircle}>
                    <Text style={styles.scoreValue}>{selectedLog.healthScore || 'N/A'}</Text>
                    <Text style={styles.scoreLabel}>Health Score</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <View style={[styles.statusDot, { backgroundColor: selectedLog.status === 'Critical' ? '#EF4444' : '#10B981' }]} />
                    <Text style={styles.statusText}>{selectedLog.status || 'Good'}</Text>
                  </View>
                  <Text style={styles.modalDate}>
                    {format(parseISO(selectedLog.testDate), 'MMMM d, yyyy • hh:mm a')}
                  </Text>
                </View>

                <View style={styles.modalStatsGrid}>
                  <View style={styles.modalStatCard}>
                    <Text style={styles.modalStatLabel}>Nitrogen</Text>
                    <Text style={styles.modalStatValue}>{Number(selectedLog.nitrogen).toFixed(0)} <Text style={styles.modalUnit}>ppm</Text></Text>
                  </View>
                  <View style={styles.modalStatCard}>
                    <Text style={styles.modalStatLabel}>Phosphorus</Text>
                    <Text style={styles.modalStatValue}>{Number(selectedLog.phosphorus).toFixed(0)} <Text style={styles.modalUnit}>ppm</Text></Text>
                  </View>
                  <View style={styles.modalStatCard}>
                    <Text style={styles.modalStatLabel}>Potassium</Text>
                    <Text style={styles.modalStatValue}>{Number(selectedLog.potassium).toFixed(0)} <Text style={styles.modalUnit}>ppm</Text></Text>
                  </View>
                  <View style={styles.modalStatCard}>
                    <Text style={styles.modalStatLabel}>pH Level</Text>
                    <Text style={styles.modalStatValue}>{Number(selectedLog.ph).toFixed(1)}</Text>
                  </View>
                  <View style={styles.modalStatCard}>
                    <Text style={styles.modalStatLabel}>Moisture</Text>
                    <Text style={styles.modalStatValue}>{selectedLog.moisture != null ? `${Number(selectedLog.moisture).toFixed(1)}%` : 'N/A'}</Text>
                  </View>
                  <View style={styles.modalStatCard}>
                    <Text style={styles.modalStatLabel}>Temp</Text>
                    <Text style={styles.modalStatValue}>{selectedLog.temperature != null ? `${Number(selectedLog.temperature).toFixed(1)}°C` : 'N/A'}</Text>
                  </View>
                </View>

                {/* 2. AI Recommendation Section */}
                <Text style={styles.sectionTitle}>AI Recommendation</Text>
                <View style={styles.recommendationCard}>
                  <View style={styles.recommendationHeader}>
                    <Ionicons name="sparkles" size={20} color={COLORS.accent} />
                    <Text style={styles.recommendationTitle}>Insights</Text>
                  </View>
                  {selectedLog.recommendation?.recommendations ? (
                    <Text style={styles.recommendationText}>
                      {selectedLog.recommendation.recommendations}
                    </Text>
                  ) : (
                    <Text style={styles.recommendationText}>
                      Based on your soil analysis, your soil health is currently stable. Maintain regular organic composting and ensure balanced irrigation.
                    </Text>
                  )}
                  {selectedLog.recommendation?.naturalFertilizers && selectedLog.recommendation.naturalFertilizers.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[styles.recommendationTitle, { fontSize: 13, marginBottom: 8, marginLeft: 0 }]}>🌿 Natural Fertilizers</Text>
                      {selectedLog.recommendation.naturalFertilizers.slice(0, 3).map((f, i) => (
                        <Text key={i} style={[styles.recommendationText, { marginBottom: 4 }]}>
                          • <Text style={{ fontFamily: 'Sora_600SemiBold' }}>{f.name}</Text> — {f.amount}
                        </Text>
                      ))}
                    </View>
                  )}
                  {selectedLog.recommendation?.chemicalFertilizers && selectedLog.recommendation.chemicalFertilizers.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[styles.recommendationTitle, { fontSize: 13, marginBottom: 8, marginLeft: 0 }]}>🧪 Chemical Fertilizers</Text>
                      {selectedLog.recommendation.chemicalFertilizers.slice(0, 3).map((f, i) => (
                        <Text key={i} style={[styles.recommendationText, { marginBottom: 4 }]}>
                          • <Text style={{ fontFamily: 'Sora_600SemiBold' }}>{f.name}</Text> — {f.amount}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>

                {/* 3. Location Section */}
                <Text style={styles.sectionTitle}>Location</Text>
                <View style={styles.locationCard}>
                  {selectedLog.latitude != null ? (
                    <>
                      <Ionicons name="location" size={24} color={COLORS.accent} style={{ marginRight: 12 }} />
                      <View>
                        <Text style={styles.locationDetailTitle}>Coordinates</Text>
                        <Text style={styles.locationDetailText}>
                          {Number(selectedLog.latitude).toFixed(6)}, {Number(selectedLog.longitude).toFixed(6)}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Ionicons name="location-outline" size={24} color={COLORS.subtitle} style={{ marginRight: 12 }} />
                      <View>
                        <Text style={styles.locationDetailTitle}>Location Unavailable</Text>
                        <Text style={styles.locationDetailText}>No coordinates recorded</Text>
                      </View>
                    </>
                  )}
                </View>
                
                <TouchableOpacity 
                  style={styles.modalExportButton}
                  onPress={() => {
                    setIsModalVisible(false);
                    exportSoilReport([selectedLog], user as any);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="download-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.modalExportText}>Export Report</Text>
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
          {Platform.OS === 'ios' && <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />}
          <Pressable 
            style={styles.actionSheetOverlay} 
            onPress={() => setIsTimeMenuVisible(false)}
          >
            <View style={styles.actionSheetContent} onStartShouldSetResponder={() => true}>
              <View style={styles.actionSheetGrabber} />
              <View style={styles.actionSheetHeader}>
                <Text style={styles.actionSheetTitle}>Time Interval</Text>
              </View>
              {TIME_FILTERS.map((filter) => {
                const isActive = timeFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    style={({ pressed }) => [
                      styles.actionSheetItem, 
                      isActive && styles.actionSheetItemActive,
                      pressed && { backgroundColor: '#F1F5F9' }
                    ]}
                    onPress={() => handleSelectTimeFilter(filter)}
                  >
                    <Text style={[styles.actionSheetText, isActive && styles.actionSheetTextActive]}>
                      {filter}
                    </Text>
                    {isActive && <Ionicons name="checkmark-circle" size={20} color={COLORS.title} />}
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
          {Platform.OS === 'ios' && <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />}
          <Pressable 
            style={styles.actionSheetOverlay} 
            onPress={() => setIsParamMenuVisible(false)}
          >
            <View style={styles.actionSheetContent} onStartShouldSetResponder={() => true}>
              <View style={styles.actionSheetGrabber} />
              <View style={styles.actionSheetHeader}>
                <Text style={styles.actionSheetTitle}>Soil Parameter</Text>
              </View>
              {PARAMETERS.map((param) => {
                const isActive = selectedParameter === param;
                const color = getParamColor(param);
                return (
                  <Pressable
                    key={param}
                    style={({ pressed }) => [
                      styles.actionSheetItem, 
                      isActive && styles.actionSheetItemActive,
                      pressed && { backgroundColor: '#F1F5F9' }
                    ]}
                    onPress={() => handleSelectParam(param)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.paramColorDot, { backgroundColor: color, marginRight: 12 }]} />
                      <Text style={[styles.actionSheetText, isActive && { color: color, fontFamily: 'Sora_600SemiBold' }]}>
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
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyListContainer: {
    marginTop: 8,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF',
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
    backgroundColor: '#F1F5F9',
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
    marginBottom: 20,
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
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#FFF',
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
    borderBottomColor: '#F1F5F9',
  },
  logIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
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
    backgroundColor: '#F0FDF4',
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
    backgroundColor: '#FFF',
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
    borderColor: '#F0FDF4',
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
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    backgroundColor: COLORS.warningBg,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
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
    width: 10, // Reduced from 12
    height: 10, // Reduced from 12
    borderRadius: 5,
    backgroundColor: COLORS.accent,
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    backgroundColor: '#FFF',
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
    marginBottom: 100, // extra bottom padding so tab bar doesn't cover last item
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
    marginVertical: 12,
    gap: 12,
  },
  appleDropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  appleDropdownText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 14,
    color: COLORS.title,
    flex: 1,
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  actionSheetContent: {
    backgroundColor: '#FFF',
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
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  actionSheetHeader: {
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    backgroundColor: '#F8FAFC',
  },
  actionSheetText: {
    fontFamily: 'Sora_500Medium',
    fontSize: 15,
    color: '#475569',
  },
  actionSheetTextActive: {
    fontFamily: 'Sora_600SemiBold',
    color: COLORS.title,
  },
});

