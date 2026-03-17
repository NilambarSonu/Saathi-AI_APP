/**
 * live-connect.tsx — Saathi AI Live Connect Screen
 * CRITICAL ARCHITECTURE RESET: True React Native Glassmorphism
 */
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Animated, Easing, Dimensions, Platform, Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';

// BLE Hooks
import { Device } from 'react-native-ble-plx';
import { 
  startScanning, stopScanning, setDeviceDiscoveredListener,
  connectDevice, subscribeToSoilData, disconnectDevice, 
  setLogListener, isBLEAvailable
} from '../../hooks/useBLE';

const { width: W } = Dimensions.get('window');

// ─── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  bgLight:  '#E0F5E9',   // Soft Mint
  bgWhite:  '#FFFFFF',   // Pure White
  
  textDark: '#022C22',   // Deep dark green
  textSub:  '#475569',   // Slate
  
  purple:   '#1A5C35',   // Brand Green
  purpleLight: '#E8F5EE', // Light brand green
  
  white:    '#FFFFFF',
  
  glass:       'rgba(255, 255, 255, 0.3)', // Strict rule: No grey tints
  glassBorder: 'rgba(255, 255, 255, 0.6)', // Strict transparent white border
};

// ─── Pure Glass Card ─────────────────────────────────────────────────────────
function GlassCard({ style, children }: { style?: any; children: React.ReactNode }) {
  return (
    <BlurView intensity={50} tint="light" style={[gc.card, style]}>
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
    marginBottom: 20,
    // Removed all custom elevation / inner shadows
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function LiveConnectScreen() {
  const router = useRouter();
  
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'connecting' | 'connected' | 'completed'>('idle');
  const [logMsg, setLogMsg] = useState('Make sure Agni device is powered on');
  const [devices, setDevices] = useState<Device[]>([]);
  const [showSoilData, setShowSoilData] = useState(false);
  
  // Animation values for radar rings
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // BLE Listeners
  useEffect(() => {
    setDeviceDiscoveredListener((device) => {
      setDevices((prev) => {
        if (prev.find(d => d.id === device.id)) return prev;
        return [...prev, device].sort((a, b) => {
          if (a.name === 'AGNI-SOIL-SENSOR') return -1;
          if (b.name === 'AGNI-SOIL-SENSOR') return 1;
          return 0;
        });
      });
    });

    setLogListener((msg) => {
      setLogMsg(msg);
      if (msg.includes('FOUND DEVICE')) setScanState('connected');
      if (msg.includes('Second transfer finished')) setScanState('completed');
    });

    return () => {
      setLogListener(null);
      setDeviceDiscoveredListener(null);
      stopScanning();
    };
  }, []);

  // Radar Animation Loop
  useEffect(() => {
    if (scanState === 'scanning' || scanState === 'connecting') {
      pulseAnim.setValue(0);
      Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
    }
  }, [scanState]);

  const handleScanToggle = () => {
    if (scanState === 'scanning' || scanState === 'connecting') {
      stopScanning();
      setScanState('idle');
      setLogMsg('Scan cancelled.');
    } else {
      setDevices([]);
      setScanState('scanning');
      setLogMsg('Searching for nearby devices...');
      startScanning();
    }
  };

  const handleConnect = async (device: Device) => {
    if (device.name !== 'AGNI-SOIL-SENSOR') {
      setScanState('idle');
      setLogMsg(`Cannot connect to a non-Agni device.`);
      return;
    }
    
    try {
      stopScanning();
      setScanState('connecting');
      setLogMsg(`Connecting to ${device.name}...`);
      await connectDevice(device);
      setScanState('connected');
      await subscribeToSoilData();
    } catch (e: any) {
      setScanState('idle');
      setLogMsg(`Failed to connect: ${e.message || 'Unknown error'}`);
    }
  };

  const currentStatusText = () => {
    switch (scanState) {
      case 'idle': return 'Ready to Connect';
      case 'scanning': return 'Scanning...';
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Analyzing Soil...';
      case 'completed': return 'Data Synced!';
      default: return '';
    }
  };

  // Interpolations for radar pulses (3 concentric rings)
  const createRingStyle = (maxScale: number, startOpacity: number) => ({
    transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, maxScale] }) }],
    opacity: pulseAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [startOpacity, 0, 0] })
  });

  return (
    <View style={s.root}>
      {/* ── ROOT BACKGROUND: VIBRANT LINEAR GRADIENT ── */}
      <LinearGradient
        colors={[C.bgLight, C.bgWhite]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* ── 1. HEADER ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={C.textDark} />
          </TouchableOpacity>
          <View style={{ marginTop: 12 }}>
            <Text style={s.title}>Live Connect</Text>
            <Text style={s.subtitle}>Pair with AGNI-SOIL-SENSOR</Text>
          </View>
        </View>

        {!isBLEAvailable() ? (
          <GlassCard style={{ padding: 24, alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>📡</Text>
            <Text style={{ fontFamily: 'Sora_800ExtraBold', color: C.textDark, fontSize: 18, marginBottom: 10 }}>Bluetooth is disabled</Text>
            <Text style={{ fontFamily: 'Sora_400Regular', color: C.textSub, textAlign: 'center', marginBottom: 20 }}>
              Bluetooth is disabled. Please enable Bluetooth to connect device.
            </Text>
            <TouchableOpacity 
              style={[s.purpleBtn, { alignSelf: 'center', paddingHorizontal: 30, opacity: 0.5 }]}
              disabled
            >
              <Text style={s.purpleBtnText}>Scan Disabled</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : (
          <>
            {/* ── 2. RADAR HERO CARD ── */}
            <GlassCard style={s.heroCard}>
              <View style={s.radarArea}>
                {/* Radar pulses */}
                {(scanState === 'scanning' || scanState === 'connecting') && (
                  <>
                    <Animated.View style={[s.radarRing, createRingStyle(3.0, 0.15)]} />
                    <Animated.View style={[s.radarRing, createRingStyle(2.1, 0.3)]} />
                    <Animated.View style={[s.radarRing, createRingStyle(1.4, 0.5)]} />
                  </>
                )}
                
                {/* Center Circle */}
                <View style={[s.radarCenter, { backgroundColor: C.purple }]}>
                  {scanState === 'completed' ? (
                    <LottieView
                      source={require('../../animations/vs.json')}
                      autoPlay loop={false} style={{ width: 60, height: 60 }}
                    />
                  ) : (
                    <LottieView
                      source={require('../../animations/Bluetooth-icon.json')}
                      autoPlay loop style={{ width: 50, height: 50, transform: [{ scale: 1.5 }] }}
                    />
                  )}
                </View>
              </View>

              <View style={s.heroStatusArea}>
                <Text style={s.heroStatusTitle}>{currentStatusText()}</Text>
                <Text style={s.heroStatusSub}>{logMsg}</Text>
              </View>

              {/* Devices List (if found) */}
              {(scanState === 'scanning' || devices.length > 0) && scanState !== 'completed' && scanState !== 'connected' && scanState !== 'connecting' && (
                <View style={s.devicesList}>
                  {devices.length === 0 ? (
                    <Text style={s.emptyList}>Searching for nearby devices...</Text>
                  ) : (
                    devices.map((d, i) => {
                      const isAgni = d.name === 'AGNI-SOIL-SENSOR';
                      return (
                        <TouchableOpacity
                          key={d.id + i}
                          style={[s.deviceRow, !isAgni && { opacity: 0.5 }]}
                          onPress={() => handleConnect(d)}
                          disabled={!isAgni}
                        >
                          <Ionicons name="hardware-chip-outline" size={24} color={isAgni ? C.purple : C.textSub} />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={s.deviceName}>{d.name || 'Unknown Device'}</Text>
                            <Text style={s.deviceId}>{d.id}</Text>
                          </View>
                          <View style={[s.rssiBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <Text style={[s.rssiText, isAgni && { color: C.purple }]}>{d.rssi} dB</Text>
                          </View>
                        </TouchableOpacity>
                      )
                    })
                  )}
                </View>
              )}

              {/* CTA Buttons */}
              <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginTop: (scanState === 'scanning' || devices.length > 0) ? 0 : 20 }}>
                <TouchableOpacity 
                  style={[s.purpleBtn, { flex: 1 }, scanState === 'connecting' && { opacity: 0.7 }]}
                  onPress={handleScanToggle}
                  disabled={scanState === 'connecting'}
                >
                  <Text style={s.purpleBtnText}>
                    {scanState === 'scanning' ? "STOP" : scanState === 'connected' ? "CONNECTED" : "CONNECT"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[s.secondaryBtn, { flex: 1 }]}
                  onPress={() => setShowSoilData(!showSoilData)}
                >
                  <Text style={[s.purpleBtnText, { color: C.purple }]}>SOIL DATA</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>

            {/* ── 3. QUICK START GUIDE ── */}
            {scanState === 'idle' && devices.length === 0 && (
              <GlassCard style={s.guideCard}>
                <Text style={s.sectionTitle}>Quick Start Guide</Text>
                
                <View style={s.stepRow}>
                  <View style={[s.stepNum, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={[s.numText, { color: '#059669' }]}>1</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.stepTitle}>Power on Agni</Text>
                    <Text style={s.stepBody}>Hold the orange button for 2 seconds.</Text>
                  </View>
                </View>

                <View style={s.stepDivider} />

                <View style={s.stepRow}>
                  <View style={[s.stepNum, { backgroundColor: '#DBEAFE' }]}>
                    <Text style={[s.numText, { color: '#2563EB' }]}>2</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.stepTitle}>Tap Scan</Text>
                    <Text style={s.stepBody}>Select AGNI-SOIL-SENSOR from the list.</Text>
                  </View>
                </View>

                <View style={s.stepDivider} />

                <View style={s.stepRow}>
                  <View style={[s.stepNum, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[s.numText, { color: '#D97706' }]}>3</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.stepTitle}>Insert Probes</Text>
                    <Text style={s.stepBody}>Push into soil — data transfers automatically.</Text>
                  </View>
                </View>
              </GlassCard>
            )}

            {/* ── 4. SOIL DATA (Empty or Filled) ── */}
            {showSoilData && (
              scanState !== 'completed' ? (
                <GlassCard style={s.dataCardEmpty}>
                  <Text style={s.sectionTitle}>Soil Analysis Data</Text>
                  <View style={s.emptyIconCircle}>
                    <MaterialCommunityIcons name="file-search-outline" size={32} color={C.purple} />
                  </View>
                  <Text style={s.emptyTitle}>No soil data available</Text>
                  <Text style={s.emptySub}>Connect your Agni device to view analysis</Text>
                </GlassCard>
              ) : (
                <GlassCard style={s.dataCardFilled}>
                  <Text style={[s.sectionTitle, { marginBottom: 16 }]}>Soil Analysis Complete 🌱</Text>
                  <View style={s.dataGrid}>
                    <View style={s.dataBox}><Text style={s.dataVal}>6.8</Text><Text style={s.dataLbl}>pH Level</Text></View>
                    <View style={s.dataBox}><Text style={s.dataVal}>45%</Text><Text style={s.dataLbl}>Moisture</Text></View>
                    <View style={s.dataBox}><Text style={s.dataVal}>82</Text><Text style={s.dataLbl}>N (ppm)</Text></View>
                    <View style={s.dataBox}><Text style={s.dataVal}>34</Text><Text style={s.dataLbl}>P (ppm)</Text></View>
                  </View>
                  <TouchableOpacity style={[s.purpleBtn, { marginTop: 16 }]} onPress={() => router.push('/(app)/ai-chat')}>
                    <MaterialCommunityIcons name="robot-outline" size={20} color={C.white} />
                    <Text style={s.purpleBtnText}>Get AI Advisory</Text>
                  </TouchableOpacity>
                </GlassCard>
              )
            )}
          </>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 150, // Space for bottom nav
  },

  // Header
  header: { marginBottom: 24, paddingHorizontal: 4 },
  backBtn: { 
    width: 44, height: 44, borderRadius: 22, 
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1, borderColor: C.glassBorder,
  },
  title: { fontFamily: 'Sora_800ExtraBold', fontSize: 26, color: C.textDark, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Sora_500Medium', fontSize: 13, color: C.textSub, marginTop: 4 },

  // Hero Card
  heroCard: { padding: 24, alignItems: 'center' },
  radarArea: { height: 200, width: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  radarCenter: { 
    width: 72, height: 72, borderRadius: 36, 
    alignItems: 'center', justifyContent: 'center', zIndex: 10, 
  },
  radarRing: {
    position: 'absolute', width: 72, height: 72, borderRadius: 36,
    borderWidth: 2, borderColor: 'rgba(26, 92, 53, 0.4)', backgroundColor: 'transparent',
  },
  heroStatusArea: { alignItems: 'center', marginBottom: 24, minHeight: 48 },
  heroStatusTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 18, color: C.textDark, marginBottom: 4 },
  heroStatusSub: { fontFamily: 'Sora_500Medium', fontSize: 13, color: C.textSub, textAlign: 'center', paddingHorizontal: 20 },
  
  // Sleek Pill Button
  purpleBtn: {
    width: '100%', height: 56, borderRadius: 100, backgroundColor: C.purple,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    // Soft outer shadow as requested
    ...Platform.select({
      ios: { shadowColor: C.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
      android: { elevation: 6 }
    })
  },
  secondaryBtn: {
    width: '100%', height: 56, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1, borderColor: C.purple,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  purpleBtnText: { fontFamily: 'Sora_700Bold', fontSize: 16, color: C.white },

  // Devices
  devicesList: { width: '100%', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 16, padding: 12, marginBottom: 24, borderWidth: 1, borderColor: C.glassBorder },
  emptyList: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.textSub, textAlign: 'center', padding: 16 },
  deviceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  deviceName: { fontFamily: 'Sora_700Bold', fontSize: 14, color: C.textDark },
  deviceId: { fontFamily: 'Sora_400Regular', fontSize: 11, color: C.textSub },
  rssiBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: C.glassBorder },
  rssiText: { fontFamily: 'Sora_700Bold', fontSize: 10, color: C.textSub },

  // Sections
  sectionTitle: { fontFamily: 'Sora_700Bold', fontSize: 17, color: C.textDark, marginBottom: 16 },
  
  // Guide Card
  guideCard: { padding: 24 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  // Solid color circular badge
  stepNum: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: 'Sora_800ExtraBold', fontSize: 16 },
  stepTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: C.textDark, marginBottom: 2 },
  stepBody: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.textSub, lineHeight: 18 },
  stepDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginVertical: 16, marginLeft: 52 },

  // Empty Data Card
  dataCardEmpty: { padding: 24, alignItems: 'center' },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: C.textDark, marginBottom: 4 },
  emptySub: { fontFamily: 'Sora_400Regular', fontSize: 12, color: C.textSub, textAlign: 'center' },

  // Filled Data Card
  dataCardFilled: { padding: 24 },
  dataGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dataBox: { 
    width: '48%', backgroundColor: 'rgba(255,255,255,0.4)', 
    padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.glassBorder,
    alignItems: 'center',
  },
  dataVal: { fontFamily: 'Sora_800ExtraBold', fontSize: 24, color: C.purple, marginBottom: 4 },
  dataLbl: { fontFamily: 'Sora_500Medium', fontSize: 11, color: C.textSub, textAlign: 'center' },
});
