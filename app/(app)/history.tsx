import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { exportSoilReport } from '../../services/pdfExport';
import { getSoilTests, SoilTest } from '../../services/soil';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

// Mock Data
const MOCK_HISTORY = [
  { id: '1', date: 'Today, 10:45 AM', field: 'North Field', ph: 6.8, n: 82, p: 34, k: 145 },
  { id: '2', date: 'Yesterday, 04:20 PM', field: 'South Block', ph: 5.5, n: 40, p: 20, k: 90 },
  { id: '3', date: 'Oct 12, 09:15 AM', field: 'East Acre', ph: 7.2, n: 95, p: 45, k: 180 },
];

export default function HistoryScreen() {
  const [activeTab, setActiveTab] = useState<'trends' | 'logs'>('trends');
  const [records, setRecords] = useState<SoilTest[]>([]);
  const { user } = useAuthStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const data = await getSoilTests();
      setRecords(data);
    } catch (e) {
      console.log('Failed to load soil records:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      await exportSoilReport(records, user);
    } catch (e) {
      console.log('Export failed:', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Soil Analytics</Text>
          <Text style={styles.subtitle}>Track your farm's health over time</Text>
        </View>
        
        <Pressable 
          style={[styles.exportBtn, isExporting && { opacity: 0.7 }]} 
          onPress={handleExport}
          disabled={isExporting}
        >
          <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
          <Text style={styles.exportBtnText}>{isExporting ? 'Exporting...' : 'Export PDF'}</Text>
        </Pressable>
      </View>

      {/* Custom Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable 
          style={[styles.tab, activeTab === 'trends' && styles.tabActive]}
          onPress={() => setActiveTab('trends')}
        >
          <Text style={[styles.tabText, activeTab === 'trends' && styles.tabTextActive]}>Trends & Charts</Text>
        </Pressable>
        <Pressable 
          style={[styles.tab, activeTab === 'logs' && styles.tabActive]}
          onPress={() => setActiveTab('logs')}
        >
          <Text style={[styles.tabText, activeTab === 'logs' && styles.tabTextActive]}>Test Logs</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'trends' ? (
          <View style={styles.trendsContainer}>
            {/* Using a Lottie animation as a mock for a complex interactive chart for now */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>pH Level History</Text>
                <Text style={styles.chartFilter}>Last 30 Days ▾</Text>
              </View>
              <View style={styles.animationWrapper}>
                <LottieView
                  source={require('../../animations/history-trend.json')}
                  autoPlay
                  loop
                  style={{ width: '100%', height: 200 }}
                />
              </View>
              <View style={styles.chartFooter}>
                <Text style={styles.chartInsight}>
                  <Text style={{ fontFamily: 'Sora_700Bold', color: Colors.primary }}>Insight: </Text>
                  pH levels have stabilized around 6.5 - 7.0, optimal for most crops.
                </Text>
              </View>
            </View>

            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>NPK Distribution</Text>
                <Text style={styles.chartFilter}>All Fields ▾</Text>
              </View>
              
              <View style={styles.npkBars}>
                <View style={styles.npkRow}>
                  <Text style={styles.npkLabel}>Nitrogen (N)</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: '70%', backgroundColor: Colors.blue }]} />
                  </View>
                  <Text style={styles.npkValue}>Optimal</Text>
                </View>
                <View style={styles.npkRow}>
                  <Text style={styles.npkLabel}>Phosphorus (P)</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: '40%', backgroundColor: Colors.warning }]} />
                  </View>
                  <Text style={styles.npkValue}>Low</Text>
                </View>
                <View style={styles.npkRow}>
                  <Text style={styles.npkLabel}>Potassium (K)</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: '85%', backgroundColor: Colors.primary }]} />
                  </View>
                  <Text style={styles.npkValue}>High</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.logsContainer}>
            {isLoading ? (
              <Text style={{ textAlign: 'center', marginTop: 20, color: Colors.textSecondary }}>Loading tests...</Text>
            ) : records.length > 0 ? records.map((item) => (
              <Pressable key={item.id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View>
                    <Text style={styles.logField}>{item.locationDetails || 'Soil Test'}</Text>
                    <Text style={styles.logDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                  </View>
                  <View style={styles.phBadge}>
                    <Text style={styles.phValue}>pH {item.ph.toFixed(1)}</Text>
                  </View>
                </View>

                <View style={styles.logDivider} />

                <View style={styles.logGrid}>
                  <View style={styles.logStat}>
                    <Text style={styles.statLabel}>Nitrogen</Text>
                    <Text style={styles.statValue}>{item.n} <Text style={{fontSize:10}}>ppm</Text></Text>
                  </View>
                  <View style={styles.logStat}>
                    <Text style={styles.statLabel}>Phosphorus</Text>
                    <Text style={styles.statValue}>{item.p} <Text style={{fontSize:10}}>ppm</Text></Text>
                  </View>
                  <View style={styles.logStat}>
                    <Text style={styles.statLabel}>Potassium</Text>
                    <Text style={styles.statValue}>{item.k} <Text style={{fontSize:10}}>ppm</Text></Text>
                  </View>
                </View>
              </Pressable>
            )) : MOCK_HISTORY.map((item) => (
              <Pressable key={item.id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View>
                    <Text style={styles.logField}>{item.field}</Text>
                    <Text style={styles.logDate}>{item.date}</Text>
                  </View>
                  <View style={styles.phBadge}>
                    <Text style={styles.phValue}>pH {item.ph}</Text>
                  </View>
                </View>

                <View style={styles.logDivider} />

                <View style={styles.logGrid}>
                  <View style={styles.logStat}>
                    <Text style={styles.statLabel}>Nitrogen</Text>
                    <Text style={styles.statValue}>{item.n} <Text style={{fontSize:10}}>ppm</Text></Text>
                  </View>
                  <View style={styles.logStat}>
                    <Text style={styles.statLabel}>Phosphorus</Text>
                    <Text style={styles.statValue}>{item.p} <Text style={{fontSize:10}}>ppm</Text></Text>
                  </View>
                  <View style={styles.logStat}>
                    <Text style={styles.statLabel}>Potassium</Text>
                    <Text style={styles.statValue}>{item.k} <Text style={{fontSize:10}}>ppm</Text></Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
        
        {/* Bottom spacing for TabBar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: { fontFamily: 'Sora_800ExtraBold', fontSize: 24, color: Colors.textPrimary },
  subtitle: { fontFamily: 'Sora_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F7ED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6D0'
  },
  exportBtnText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 6
  },
  
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.lg,
    padding: 4,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Spacing.radius.md },
  tabActive: { backgroundColor: Colors.primary, ...Spacing.shadows.sm },
  tabText: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: Colors.textSecondary },
  tabTextActive: { color: '#FFF' },

  content: { paddingHorizontal: Spacing.xl },

  trendsContainer: { gap: Spacing.xl },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.xl,
    padding: Spacing.lg,
    ...Spacing.shadows.sm,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  chartTitle: { fontFamily: 'Sora_700Bold', fontSize: 16, color: Colors.textPrimary },
  chartFilter: { fontFamily: 'Sora_600SemiBold', fontSize: 12, color: Colors.textSecondary },
  
  animationWrapper: { height: 200, width: '100%', alignItems: 'center', justifyContent: 'center' },
  
  chartFooter: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  chartInsight: { fontFamily: 'Sora_400Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  npkBars: { gap: Spacing.lg, marginTop: Spacing.sm },
  npkRow: { flexDirection: 'row', alignItems: 'center' },
  npkLabel: { width: 90, fontFamily: 'Sora_600SemiBold', fontSize: 11, color: Colors.textPrimary },
  barTrack: { flex: 1, height: 8, backgroundColor: Colors.surfaceAlt, borderRadius: 4, marginHorizontal: Spacing.sm },
  barFill: { height: 8, borderRadius: 4 },
  npkValue: { width: 60, fontFamily: 'Sora_600SemiBold', fontSize: 11, color: Colors.textSecondary, textAlign: 'right' },

  logsContainer: { gap: Spacing.md },
  logCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.lg,
    padding: Spacing.lg,
    ...Spacing.shadows.sm,
  },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logField: { fontFamily: 'Sora_700Bold', fontSize: 16, color: Colors.textPrimary, marginBottom: 2 },
  logDate: { fontFamily: 'Sora_400Regular', fontSize: 12, color: Colors.textSecondary },
  phBadge: { backgroundColor: '#F4FBF6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#C8E6C9' },
  phValue: { fontFamily: 'Sora_700Bold', fontSize: 13, color: Colors.primary },
  
  logDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.md },
  
  logGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  logStat: { flex: 1, alignItems: 'center' },
  statLabel: { fontFamily: 'Sora_400Regular', fontSize: 11, color: Colors.textSecondary, marginBottom: 4 },
  statValue: { fontFamily: 'Sora_700Bold', fontSize: 16, color: Colors.textPrimary }
});
