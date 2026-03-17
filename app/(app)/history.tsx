/**
 * history.tsx — Saathi AI History & Analytics Dashboard
 * True Liquid Glassmorphism (No Plastic Neumorphism)
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { LineChart } from 'react-native-chart-kit';

// Keep imports for real data
import { getSoilTests, SoilTest } from '../../services/soil';
import { exportSoilReport } from '../../services/pdfExport';
import { getParameterTrend, getTestLocations, ParameterTrend, MapLocation } from '../../services/analytics';
import { useAuthStore } from '../../store/authStore';

const { width: W } = Dimensions.get('window');

// ─── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  bgLight:  '#E0F5E9',   // Soft Mint
  bgWhite:  '#FFFFFF',   // Pure White
  
  textDark: '#022C22',   // Deep dark green
  textSub:  '#475569',   // Slate
  
  greenBtn: '#059669',   // Solid green for export
  
  valGreen: '#16A34A',
  valBlue:  '#2563EB',
  
  glass:       'rgba(255, 255, 255, 0.4)', 
  glassBorder: 'rgba(255, 255, 255, 0.8)', 
};

// ─── Pure Glass Card ─────────────────────────────────────────────────────────
function GlassCard({ style, children }: { style?: any; children: React.ReactNode }) {
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
});

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [isExporting, setIsExporting] = useState(false);
  const [isParameterOpen, setIsParameterOpen] = useState(false);
  const [selectedParam, setSelectedParam] = useState('Nitrogen (N)');
  
  const [timeFilters] = useState(['Last 30 Days', 'Last 90 Days', 'Last Year', 'All Time']);
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState('Last 30 Days');

  // Database Fetch Architecture Variables
  const [logs, setLogs] = useState<SoilTest[]>([]);
  const [trend, setTrend] = useState<ParameterTrend | null>(null);
  const [locations, setLocations] = useState<MapLocation[]>([]);

  useEffect(() => {
    getSoilTests().then(d => setLogs(Array.isArray(d) ? d : [])).catch(() => setLogs([]));
    getTestLocations().then(d => setLocations(Array.isArray(d) ? d : [])).catch(() => setLocations([]));
  }, [timeFilter]);

  useEffect(() => {
    let days = 30;
    if (timeFilter === 'Last 90 Days') days = 90;
    if (timeFilter === 'Last Year') days = 365;
    if (timeFilter === 'All Time') days = 3650;

    getParameterTrend(selectedParam, days).then(setTrend).catch(() => setTrend(null));
  }, [selectedParam, timeFilter]);

  const handleExport = async () => {
    if (!Array.isArray(logs) || logs.length === 0) {
      alert("No soil tests available to export.");
      return;
    }
    setIsExporting(true);
    try {
      if (user) {
        await exportSoilReport(logs, user as any);
      }
    } catch(e) {
      alert("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const getParamColor = (param: string) => {
    if (param.includes('pH')) return '#2563EB'; // Blue
    if (param.includes('Nitrogen')) return '#EF4444'; // Red
    if (param.includes('Phosphorus')) return '#8B5CF6'; // Violet
    if (param.includes('Potassium')) return '#F97316'; // Orange
    if (param.includes('Moisture')) return '#86EFAC'; // Light Green
    return '#16A34A';
  };

  const getChartData = () => {
    if (!Array.isArray(logs) || logs.length === 0) {
      return { labels: ['No Data'], datasets: [{ data: [0] }] };
    }
    // Take up to last 6 logs for chart clarity, chronologically
    const recentLogs = [...logs].reverse().slice(-6);
    
    return {
      labels: recentLogs.map(l => new Date(l.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
      datasets: [{
        data: recentLogs.map(l => {
          if (selectedParam.includes('pH')) return l.ph || 0;
          if (selectedParam.includes('Nitrogen')) return l.n || 0;
          if (selectedParam.includes('Phosphorus')) return l.p || 0;
          if (selectedParam.includes('Potassium')) return l.k || 0;
          if (selectedParam.includes('Moisture')) return l.moisture || 0;
          return 0;
        })
      }]
    };
  };

  const parameters = ['Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)', 'pH Level', 'Moisture'];

  return (
    <View style={s.root}>
      {/* ── 1. ROOT BACKGROUND: LINEAR GRADIENT ── */}
      <LinearGradient
        colors={[C.bgLight, C.bgWhite]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* ── 2. HEADER & FILTERS ── */}
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

        <View style={{ zIndex: 100 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={{ paddingRight: 16 }}>
            <TouchableOpacity onPress={() => { setIsTimeFilterOpen(!isTimeFilterOpen); setIsParameterOpen(false); }} activeOpacity={0.8}>
              <GlassCard style={[s.filterPill, isTimeFilterOpen && { borderColor: C.greenBtn }]}>
                <Text style={s.filterText}>📅 {timeFilter} <Ionicons name={isTimeFilterOpen ? "chevron-up" : "chevron-down"} size={12} /></Text>
              </GlassCard>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => { setIsParameterOpen(!isParameterOpen); setIsTimeFilterOpen(false); }} activeOpacity={0.8}>
              <GlassCard style={[s.filterPill, isParameterOpen && { borderColor: C.greenBtn }]}>
                <Text style={s.filterText}>📊 {selectedParam} <Ionicons name={isParameterOpen ? "chevron-up" : "chevron-down"} size={12} /></Text>
              </GlassCard>
            </TouchableOpacity>
          </ScrollView>

          {/* Time Filter Dropdown State */}
          {isTimeFilterOpen && (
            <View style={[s.dropdownMenu, { left: 8 }]}>
              {timeFilters.map((tf, index) => (
                <TouchableOpacity 
                  key={tf} 
                  style={[s.dropdownItem, index !== timeFilters.length - 1 && s.dropdownItemBorder]}
                  onPress={() => {
                    setTimeFilter(tf);
                    setIsTimeFilterOpen(false);
                  }}
                >
                  <Text style={[s.dropdownText, timeFilter === tf && s.dropdownTextActive]}>{tf}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Parameter Dropdown State */}
          {isParameterOpen && (
            <View style={s.dropdownMenu}>
              {parameters.map((param, index) => (
                <TouchableOpacity 
                  key={param} 
                  style={[s.dropdownItem, index !== parameters.length - 1 && s.dropdownItemBorder]}
                  onPress={() => {
                    setSelectedParam(param);
                    setIsParameterOpen(false);
                  }}
                >
                  <Text style={[s.dropdownText, selectedParam === param && s.dropdownTextActive]}>{param}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── 3. TREND ANALYSIS CARD ── */}
        <GlassCard style={[s.sectionCard, { zIndex: 1, paddingHorizontal: 0 }]}>
          <Text style={[s.cardTitle, { paddingHorizontal: 20 }]}>{selectedParam.includes('Nitrogen') ? 'Nitrogen Trend Analysis' : `${selectedParam} Trend Analysis`}</Text>
          
          <View style={s.chartPlaceholder}>
            {(!logs || logs.length === 0) ? (
              <>
                <View style={s.gridH} /><View style={[s.gridH, { top: '33%' }]} /><View style={[s.gridH, { top: '66%' }]} />
                <View style={s.gridV} /><View style={[s.gridV, { left: '33%' }]} /><View style={[s.gridV, { left: '66%' }]} />
                <Ionicons name="trending-up" size={80} color={getParamColor(selectedParam)} style={{ position: 'absolute', opacity: 0.2 }} />
                <Text style={{ position: 'absolute', fontFamily: 'Sora_600SemiBold', color: C.textSub }}>No Data Available</Text>
              </>
            ) : (
              <LineChart
                data={getChartData()}
                width={W - 32} 
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
                  propsForDots: {
                    r: "5",
                    strokeWidth: "2",
                    stroke: "#FFFFFF"
                  }
                }}
                bezier
                style={{ marginVertical: 8, borderRadius: 16 }}
              />
            )}
          </View>

          {/* Flat Glass Stat Blocks */}
          <View style={[s.statsRow, { paddingHorizontal: 20 }]}>
            <View style={s.statBlock}>
              <Text style={[s.statVal, { color: getParamColor(selectedParam) }]}>{trend?.averageValue.toFixed(1) || '--'}</Text>
              <Text style={s.statLbl}>Avg {selectedParam.split(' ')[0]}</Text>
            </View>
            <View style={s.statBlock}>
              <Text style={[s.statVal, { color: C.valBlue }]}>{trend?.totalTests || '--'}</Text>
              <Text style={s.statLbl}>Total Tests</Text>
            </View>
            <View style={s.statBlock}>
              <Text style={[s.statVal, { color: C.valGreen }]}>{trend && trend.improvementPercentage > 0 ? '+' : ''}{trend?.improvementPercentage || '--'}%</Text>
              <Text style={s.statLbl}>Improvement</Text>
            </View>
          </View>
        </GlassCard>

        {/* ── 4. FIELD TEST LOCATIONS CARD (REAL MAP) ── */}
        <GlassCard style={[s.sectionCard, { zIndex: 1 }]}>
          <Text style={s.cardTitle}>Field Test Locations</Text>
          
          <View style={s.mapWrapper}>
            <MapView 
              style={s.mapStyle}
              initialRegion={{
                latitude: Array.isArray(locations) && locations.length > 0 ? locations[0].lat : 37.78825,
                longitude: Array.isArray(locations) && locations.length > 0 ? locations[0].lng : -122.4324,
                latitudeDelta: 0.015,
                longitudeDelta: 0.0121,
              }}
              mapType="satellite"
            >
              {Array.isArray(locations) ? locations.map((loc) => (
                <Marker 
                  key={loc.id} 
                  coordinate={{ latitude: loc.lat, longitude: loc.lng }} 
                  pinColor={loc.ph < 6 ? '#EF4444' : loc.ph > 7 ? '#3B82F6' : '#22C55E'} 
                />
              )) : null}
            </MapView>
          </View>

          <View style={s.legendRow}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={s.legendText}>Acidic</Text>
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
        </GlassCard>

        {/* ── 5. TEST HISTORY LOG ── */}
        <Text style={[s.cardTitle, { marginLeft: 8, marginBottom: 12 }]}>Test History Log</Text>
        
        <View style={s.logsContainer}>
          {(Array.isArray(logs) ? logs : []).map((log) => (
            <GlassCard key={log.id} style={s.logRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.logDate}>
                  {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — {new Date(log.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Text style={[s.phText, log.ph < 6 ? {color: '#DC2626'} : log.ph > 7 ? {color: '#2563EB'} : {color: '#16A34A'}, { marginRight: 12 }]}>
                    pH: {log.ph.toFixed(1)} ({log.ph < 6 ? 'Acidic' : log.ph > 7 ? 'Alkaline' : 'Neutral'})
                  </Text>
                  <Text style={s.npkText}>NPK: {log.n}-{log.p}-{log.k}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.textSub} />
            </GlassCard>
          ))}
          {(!Array.isArray(logs) || logs.length === 0) && (
            <Text style={{ textAlign: 'center', marginVertical: 20, color: C.textSub, fontFamily: 'Sora_400Regular' }}>
              No logs found for this period.
            </Text>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 120, // Strict requirement for floating nav
  },

  // Header & Filters
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
  exportBtnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 12,
    color: '#FFF',
  },
  
  filterScroll: { marginBottom: 24, paddingHorizontal: 8, marginHorizontal: -8 },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    marginRight: 10,
  },
  filterText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
    color: C.textDark,
  },

  // Dropdown
  dropdownMenu: {
    position: 'absolute',
    top: 48, // Below the pill
    left: 140, // Below the parameters pill specifically
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
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dropdownText: {
    fontFamily: 'Sora_500Medium',
    fontSize: 13,
    color: C.textDark,
  },
  dropdownTextActive: {
    color: C.greenBtn,
    fontFamily: 'Sora_700Bold',
  },

  // Sections
  sectionCard: { padding: 20, marginBottom: 24 },
  cardTitle: { fontFamily: 'Sora_700Bold', fontSize: 18, color: C.textDark, marginBottom: 16 },

  // Trend Analysis
  chartPlaceholder: {
    height: 180,
    backgroundColor: 'transparent',
    marginBottom: 16,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,0,0,0.03)' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,0,0,0.03)' },
  
  statsRow: { flexDirection: 'row', gap: 8 },
  statBlock: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statVal: { fontFamily: 'Sora_800ExtraBold', fontSize: 20, marginBottom: 4 },
  statLbl: { fontFamily: 'Sora_500Medium', fontSize: 10, color: C.textSub },

  // Map locations
  mapWrapper: {
    height: 250,
    width: '100%',
    borderRadius: 16,
    borderWidth: 1, 
    borderColor: C.glassBorder,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapStyle: {
    width: '100%',
    height: '100%',
  },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontFamily: 'Sora_500Medium', fontSize: 12, color: C.textSub },

  // Logs
  logsContainer: { gap: 10, zIndex: 1 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
  },
  logDate: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: C.textDark, flex: 1 },
  phBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4,
    marginRight: 16,
  },
  phText: { fontFamily: 'Sora_700Bold', fontSize: 11, color: '#DC2626' },
  npkContainer: { flexDirection: 'row', alignItems: 'center' },
  npkText: { fontFamily: 'Sora_700Bold', fontSize: 13, color: C.textDark },
});
