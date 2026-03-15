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

// Keep imports for real data
import { getSoilTests, SoilTest } from '../../services/soil';
import { exportSoilReport } from '../../services/pdfExport';
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
  
  // Database Fetch Architecture Simulation
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // Simulate API fetch delay
    const loadData = async () => {
      await new Promise(r => setTimeout(r, 600));
      setLogs([
        { id: 1, date: 'Mar 11, 8:38 AM', ph: 5.8, npk: '54-12-28', lat: 37.78825, lng: -122.4324 },
        { id: 2, date: 'Mar 10, 4:15 PM', ph: 6.2, npk: '48-15-22', lat: 37.78925, lng: -122.4344 },
        { id: 3, date: 'Mar 08, 9:20 AM', ph: 5.5, npk: '60-10-30', lat: 37.78725, lng: -122.4314 },
        { id: 4, date: 'Mar 05, 2:45 PM', ph: 6.8, npk: '45-18-25', lat: 37.79025, lng: -122.4354 },
      ]);
    };
    loadData();
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000); // Mock export
  };

  const parameters = ['Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)', 'pH Level'];

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
            <GlassCard style={s.filterPill}>
              <Text style={s.filterText}>📅 Last 30 Days <Ionicons name="chevron-down" size={12} /></Text>
            </GlassCard>
            
            <TouchableOpacity onPress={() => setIsParameterOpen(!isParameterOpen)} activeOpacity={0.8}>
              <GlassCard style={[s.filterPill, isParameterOpen && { borderColor: C.greenBtn }]}>
                <Text style={s.filterText}>📊 {selectedParam} <Ionicons name={isParameterOpen ? "chevron-up" : "chevron-down"} size={12} /></Text>
              </GlassCard>
            </TouchableOpacity>
          </ScrollView>

          {/* Functional Dropdown State */}
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
        <GlassCard style={[s.sectionCard, { zIndex: 1 }]}>
          <Text style={s.cardTitle}>{selectedParam} Trend</Text>
          
          <View style={s.chartPlaceholder}>
            {/* Subtle Grid Background Simulation */}
            <View style={s.gridH} />
            <View style={[s.gridH, { top: '33%' }]} />
            <View style={[s.gridH, { top: '66%' }]} />
            <View style={s.gridV} />
            <View style={[s.gridV, { left: '33%' }]} />
            <View style={[s.gridV, { left: '66%' }]} />
            
            {/* Fake line chart */}
            <Ionicons name="trending-up" size={80} color="rgba(22, 163, 74, 0.4)" style={{ position: 'absolute', opacity: 0.5 }} />
          </View>

          {/* Flat Glass Stat Blocks */}
          <View style={s.statsRow}>
            <View style={s.statBlock}>
              <Text style={[s.statVal, { color: C.valGreen }]}>54.0</Text>
              <Text style={s.statLbl}>Avg Nitrogen</Text>
            </View>
            <View style={s.statBlock}>
              <Text style={[s.statVal, { color: C.valBlue }]}>14</Text>
              <Text style={s.statLbl}>Total Tests</Text>
            </View>
            <View style={s.statBlock}>
              <Text style={[s.statVal, { color: C.valGreen }]}>+79.4</Text>
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
                latitude: 37.78825,
                longitude: -122.4324,
                latitudeDelta: 0.015,
                longitudeDelta: 0.0121,
              }}
              mapType="satellite"
            >
              {logs.map((log) => (
                <Marker 
                  key={log.id} 
                  coordinate={{ latitude: log.lat, longitude: log.lng }} 
                  pinColor={log.ph < 6 ? '#EF4444' : log.ph > 7 ? '#3B82F6' : '#22C55E'} 
                />
              ))}
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
          {logs.map((log) => (
            <GlassCard key={log.id} style={s.logRow}>
              <Text style={s.logDate}>{log.date}</Text>
              
              <View style={s.phBadge}>
                <Text style={s.phText}>pH {log.ph}</Text>
              </View>
              
              <View style={s.npkContainer}>
                <Text style={s.npkText}>{log.npk}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.textSub} style={{ marginLeft: 8 }} />
              </View>
            </GlassCard>
          ))}
          {logs.length === 0 && (
            <Text style={{ textAlign: 'center', marginVertical: 20, color: C.textSub, fontFamily: 'Sora_400Regular' }}>
              Loading logs...
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
    height: 150,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 16,
    borderWidth: 1, borderColor: C.glassBorder,
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
