import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
  StatusBar,
  RefreshControl,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import { LineChart } from 'react-native-chart-kit';
import { format, subDays, isAfter, parseISO } from 'date-fns';
import { hideTabBar, showTabBar } from '@/constants/Animations';
import { getSoilTests, SoilTest } from '@/features/soil_analysis/services/soil';
import { exportSoilReport } from '@/services/pdfExport';
import { useAuthStore } from '@/store/authStore';
import { useSoilMarkers } from '@/context/SoilMarkersContext';

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
const TIME_FILTERS = ['30 Days', '90 Days', '1 Year', 'All Time'] as const;

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
  const { addSoilMarkers } = useSoilMarkers();
  
  const [logs, setLogs] = useState<SoilTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const [selectedParameter, setSelectedParameter] = useState<ParameterName>('Nitrogen');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30 Days');
  const [mapMode, setMapMode] = useState<'google' | 'osm'>('google');
  const [selectedLog, setSelectedLog] = useState<SoilTest | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

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
        .filter(l => l.latitude && l.longitude)
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
      console.error('[History] Error status:', err?.response?.status);
      console.error('[History] Error data:', err?.response?.data);
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

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Filter logs based on time range
  const filteredLogs = useMemo(() => {
    if (timeFilter === 'All Time') return logs;
    
    const now = new Date();
    let daysToSubtract = 30;
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
    const testsWithLoc = logs.filter(l => l.latitude && l.longitude);
    if (!testsWithLoc.length) {
      return {
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 15,
        longitudeDelta: 15,
      };
    }
    return {
      latitude: Number(testsWithLoc[0].latitude),
      longitude: Number(testsWithLoc[0].longitude),
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
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
            <Text style={styles.greeting}>Soil History</Text>
            <Text style={styles.title}>Analytics Lab</Text>
          </View>
        </View>

        <View style={styles.fullEmptyState}>
          <View style={styles.fullEmptyIllustration}>
            <Ionicons name="analytics-outline" size={64} color={COLORS.accent} />
          </View>
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
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={hideTabBar}
        onScrollEndDrag={showTabBar}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Soil History</Text>
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

        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color={COLORS.warningText} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Stats Summary Bar */}
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
              <Ionicons 
                name={stats.change >= 0 ? "trending-up" : "trending-down"} 
                size={16} 
                color={stats.change >= 0 ? "#10B981" : "#EF4444"} 
              />
              <Text style={[styles.trendText, { color: stats.change >= 0 ? "#10B981" : "#EF4444" }]}>
                {Math.abs(stats.change).toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {TIME_FILTERS.map(f => (
              <TouchableOpacity 
                key={f} 
                onPress={() => setTimeFilter(f)}
                style={[styles.filterPill, timeFilter === f && styles.filterPillActive]}
              >
                <Text style={[styles.filterLabel, timeFilter === f && styles.filterLabelActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {PARAMETERS.map(p => (
              <TouchableOpacity 
                key={p} 
                onPress={() => setSelectedParameter(p)}
                style={[styles.paramPill, selectedParameter === p && { backgroundColor: getParamColor(p) + '15', borderColor: getParamColor(p) }]}
              >
                <View style={[styles.colorDot, { backgroundColor: getParamColor(p) }]} />
                <Text style={[styles.paramLabel, selectedParameter === p && { color: getParamColor(p) }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Chart Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selectedParameter} Trend</Text>
          {loading ? (
            <View style={styles.chartLoader}>
              <ActivityIndicator color={COLORS.accent} />
            </View>
          ) : (
            <LineChart
              data={chartData}
              width={SCREEN_WIDTH - 48}
              height={200}
              chartConfig={{
                backgroundColor: '#FFF',
                backgroundGradientFrom: '#FFF',
                backgroundGradientTo: '#FFF',
                decimalPlaces: selectedParameter === 'pH Level' ? 1 : 0,
                color: (opacity = 1) => getParamColor(selectedParameter),
                labelColor: (opacity = 1) => '#94A3B8',
                style: { borderRadius: 16 },
                propsForDots: {
                  r: '5',
                  strokeWidth: '2',
                  stroke: '#FFF'
                },
                propsForLabels: {
                  fontFamily: 'Sora_400Regular',
                  fontSize: 10
                }
              }}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={false}
              withVerticalLines={false}
            />
          )}
        </View>

        {/* Map Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Field Locations</Text>
            <TouchableOpacity onPress={() => setMapMode(m => m === 'google' ? 'osm' : 'google')}>
              <Text style={styles.mapToggle}>{mapMode === 'google' ? 'Switch to OSM' : 'Switch to Google'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={mapMode === 'google' ? PROVIDER_GOOGLE : undefined}
              initialRegion={mapInitialRegion}
              mapType={mapMode === 'google' ? 'satellite' : 'none'}
            >
              {mapMode === 'osm' && (
                <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
              )}
              {logs.filter(l => l.latitude && l.longitude).map((log, idx) => (
                <Marker
                  key={log.id}
                  coordinate={{ latitude: Number(log.latitude), longitude: Number(log.longitude) }}
                  title={`Test on ${format(parseISO(log.testDate), 'MMM d, yyyy')}`}
                >
                  <View style={[styles.customMarker, { borderColor: getParamColor(selectedParameter) }]}>
                    <View style={[styles.markerDot, { backgroundColor: getParamColor(selectedParameter) }]} />
                  </View>
                </Marker>
              ))}
            </MapView>
          </View>
        </View>

        {/* History Log */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Test History</Text>
          {loading ? (
            <ActivityIndicator style={{ margin: 20 }} color={COLORS.accent} />
          ) : filteredLogs.length === 0 ? (
            <View style={styles.noDataContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="analytics-outline" size={32} color={COLORS.accent} />
              </View>
              <Text style={styles.noDataTitle}>No Data Available</Text>
              <Text style={styles.noData}>
                No soil tests found for the selected filters.
              </Text>
            </View>
          ) : (
            <View style={styles.timelineContainer}>
              {filteredLogs.map((log, index) => (
                <View key={log.id} style={styles.timelineRow}>
                  <View style={styles.timelineLineContainer}>
                    <View style={styles.timelineDot} />
                    {index !== filteredLogs.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <TouchableOpacity 
                    style={styles.timelineContent}
                    onPress={() => openDetails(log)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.logIcon}>
                      <Ionicons name="leaf" size={20} color={COLORS.accent} />
                    </View>
                    <View style={styles.logInfo}>
                      <Text style={styles.logDate}>{format(parseISO(log.testDate), 'MMMM d, yyyy')}</Text>
                      <Text style={styles.logTime}>{format(parseISO(log.testDate), 'hh:mm a')}</Text>
                    </View>
                    <View style={styles.logValues}>
                      <Text style={styles.logMainValue}>pH {Number(log.ph).toFixed(1)}</Text>
                      <Text style={styles.logSubValue}>N:{Number(log.nitrogen).toFixed(0)} P:{Number(log.phosphorus).toFixed(0)} K:{Number(log.potassium).toFixed(0)} <Text style={styles.logUnit}>ppm</Text></Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#CBD5E1" style={{ marginLeft: 4 }} />
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
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: 24,
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
    marginHorizontal: 24,
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
  filterScroll: {
    paddingLeft: 24,
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
    marginHorizontal: 24,
    padding: 20,
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
    fontSize: 18,
    color: COLORS.title,
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    marginLeft: -16,
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
    width: '100%',
    height: '100%',
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
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
    marginHorizontal: 24,
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
});



