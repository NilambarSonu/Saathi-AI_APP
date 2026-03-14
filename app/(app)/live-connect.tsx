import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import Button from '../../components/ui/Button';
import FuturisticButton from '../../components/ui/FuturisticButton';
import LottieView from 'lottie-react-native';
import { Device } from 'react-native-ble-plx';
import { 
  startScanning, 
  stopScanning, 
  setDeviceDiscoveredListener,
  connectDevice, 
  subscribeToSoilData, 
  disconnectDevice, 
  setLogListener,
  isBLEAvailable
} from '../../hooks/useBLE';
import { Linking, TouchableOpacity } from 'react-native';

export default function LiveConnectScreen() {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'connecting' | 'connected' | 'completed'>('idle');
  const [logMsg, setLogMsg] = useState('Make sure Agni device is powered on');
  const [devices, setDevices] = useState<Device[]>([]);
  
  // Animation values for radar rings
  const pulseAnim1 = new Animated.Value(0);
  const pulseAnim2 = new Animated.Value(0);

  useEffect(() => {
    setDeviceDiscoveredListener((device) => {
      setDevices((prev) => {
        // Only keep unique devices
        if (prev.find(d => d.id === device.id)) return prev;
        return [...prev, device].sort((a, b) => {
          // Put AGNI devices at the top
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

  useEffect(() => {
    if (scanState === 'scanning') {
      Animated.loop(
        Animated.stagger(500, [
          Animated.sequence([
            Animated.timing(pulseAnim1, { toValue: 1, duration: 2000, useNativeDriver: true }),
            Animated.timing(pulseAnim1, { toValue: 0, duration: 0, useNativeDriver: true })
          ]),
          Animated.sequence([
            Animated.timing(pulseAnim2, { toValue: 1, duration: 2000, useNativeDriver: true }),
            Animated.timing(pulseAnim2, { toValue: 0, duration: 0, useNativeDriver: true })
          ])
        ])
      ).start();
    } else {
      pulseAnim1.stopAnimation();
      pulseAnim2.stopAnimation();
    }
  }, [scanState]);

  const handleScanToggle = () => {
    if (scanState === 'scanning') {
      stopScanning();
      setScanState('idle');
      setLogMsg('Scan cancelled.');
    } else {
      setDevices([]);
      setScanState('scanning');
      startScanning();
    }
  };

  const handleConnect = async (device: Device) => {
    if (device.name !== 'AGNI-SOIL-SENSOR') return;
    
    try {
      stopScanning();
      setScanState('connecting');
      await connectDevice(device);
      setScanState('connected');
      await subscribeToSoilData();
    } catch (err: any) {
      setScanState('idle');
      setLogMsg(`Connection Error: ${err.message}`);
    }
  };

  const currentStatusText = () => {
    switch (scanState) {
      case 'idle': return 'Ready to Connect';
      case 'scanning': return 'Scanning for devices...';
      case 'connecting': return 'Connecting to Agni...';
      case 'connected': return 'Syncing Soil Data...';
      case 'completed': return 'Data Sync Complete!';
      default: return '';
    }
  };

  const pulseStyle1 = {
    transform: [{ scale: pulseAnim1.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }],
    opacity: pulseAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] })
  };

  const pulseStyle2 = {
    transform: [{ scale: pulseAnim2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }],
    opacity: pulseAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] })
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Connect</Text>
        <Text style={styles.subtitle}>Pair with AGNI-SOIL-SENSOR</Text>
      </View>

      {!isBLEAvailable() ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📡</Text>
          <Text style={styles.errorTitle}>Bluetooth Not Available</Text>
          <Text style={styles.errorBody}>
            BLE device pairing requires a production build of the app. 
            This feature is not available in Expo Go.{'\n\n'}
            Please install the Saathi AI app from the Play Store / App Store to connect your Agni device.
          </Text>
          <TouchableOpacity 
            style={styles.errorBtn}
            onPress={() => Linking.openURL('https://saathiai.org')}
          >
            <Text style={styles.errorBtnText}>Learn More →</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <>
      <View style={styles.card}>
        <View style={styles.radarContainer}>
          {scanState === 'scanning' && (
            <>
              <Animated.View style={[styles.pulseRing, pulseStyle1]} />
              <Animated.View style={[styles.pulseRing, pulseStyle2]} />
            </>
          )}
          
          <View style={styles.radarCenter}>
            {scanState === 'completed' ? (
              <LottieView
                source={require('../../animations/vs.json')}
                autoPlay
                loop={false}
                style={{ width: 80, height: 80 }}
              />
            ) : (
              <LottieView
                source={require('../../animations/Bluetooth.json')}
                autoPlay={scanState === 'scanning'}
                loop
                style={{ width: 80, height: 80 }}
              />
            )}
          </View>
        </View>

        <Text style={styles.statusText}>{currentStatusText()}</Text>
        <Text style={styles.logText}>{logMsg}</Text>

        {(scanState === 'idle' || scanState === 'scanning') && (
          <View style={{ marginTop: Spacing.md }}>
            {scanState === 'idle' ? (
              <FuturisticButton 
                title="Scan for Agni Device"
                icon="📡"
                onPress={handleScanToggle}
              />
            ) : (
              <Button 
                title="Stop Scanning"
                variant="secondary"
                onPress={handleScanToggle}
              />
            )}
          </View>
        )}
      </View>

      {/* Device List */}
      {(scanState === 'scanning' || devices.length > 0) && scanState !== 'completed' && scanState !== 'connected' && scanState !== 'connecting' && (
        <View style={styles.deviceListCard}>
          <Text style={styles.guideTitle}>Discovered Devices</Text>
          {devices.length === 0 ? (
            <Text style={styles.emptyText}>Searching...</Text>
          ) : (
            devices.map(device => {
              const isAgni = device.name === 'AGNI-SOIL-SENSOR';
              return (
                <Pressable 
                  key={device.id} 
                  style={[styles.deviceRow, !isAgni && styles.deviceRowDisabled]}
                  onPress={() => handleConnect(device)}
                >
                  <View>
                    <Text style={[styles.deviceName, !isAgni && styles.deviceNameDisabled]}>
                      {device.name || 'Unknown Device'}
                    </Text>
                    <Text style={styles.deviceId}>{device.id}</Text>
                  </View>
                  <View style={styles.rssiContainer}>
                    <Text style={styles.rssiText}>{device.rssi} dBm</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      )}

      {/* Guide Card falls back if idle and no devices */}
      {scanState === 'idle' && devices.length === 0 && (
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>Quick Start Guide</Text>
          <View style={styles.step}>
            <View style={[styles.stepBadge, { backgroundColor: Colors.primary }]}><Text style={styles.stepNum}>1</Text></View>
            <Text style={styles.stepText}>Power on Agni — hold orange button 2 seconds</Text>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepBadge, { backgroundColor: Colors.blue }]}><Text style={styles.stepNum}>2</Text></View>
            <Text style={styles.stepText}>Tap Scan, select AGNI-SOIL-SENSOR from list</Text>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepBadge, { backgroundColor: Colors.warning }]}><Text style={styles.stepNum}>3</Text></View>
            <Text style={styles.stepText}>Insert probes into soil — data transfers automatically</Text>
          </View>
        </View>
      )}

      {scanState === 'completed' && (
        <View style={styles.resultsCard}>
          <Text style={styles.resultsHeader}>Soil Analysis Complete 🌱</Text>
          <View style={styles.resultsGrid}>
            <View style={styles.resultItem}><Text style={styles.resultVal}>6.8</Text><Text style={styles.resultCol}>pH Level</Text></View>
            <View style={styles.resultItem}><Text style={styles.resultVal}>45%</Text><Text style={styles.resultCol}>Moisture</Text></View>
            <View style={styles.resultItem}><Text style={styles.resultVal}>82</Text><Text style={styles.resultCol}>N (ppm)</Text></View>
            <View style={styles.resultItem}><Text style={styles.resultVal}>34</Text><Text style={styles.resultCol}>P (ppm)</Text></View>
          </View>
          <Button 
            title="Get AI Analysis"
            variant="primary"
            onPress={() => {}}
            style={{ marginTop: Spacing.md }}
          />
        </View>
      )}
      </>
      )}

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingTop: 60, paddingHorizontal: Spacing.xl },
  header: { marginBottom: Spacing.xl },
  title: { fontFamily: 'Sora_800ExtraBold', fontSize: 24, color: Colors.textPrimary },
  subtitle: { fontFamily: 'Sora_400Regular', fontSize: 13, color: Colors.textSecondary },
  
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 40, backgroundColor: Colors.surface, borderRadius: Spacing.radius.xxl, ...Spacing.shadows.md },
  errorIcon: { fontSize: 56, marginBottom: 16 },
  errorTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 20, color: '#1A2E1E', textAlign: 'center', marginBottom: 10 },
  errorBody: { fontFamily: 'Sora_400Regular', fontSize: 14, color: '#6B8A72', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  errorBtn: { height: 48, paddingHorizontal: 28, backgroundColor: '#1A7B3C', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  errorBtnText: { fontFamily: 'Sora_700Bold', fontSize: 14, color: '#fff' },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Spacing.shadows.md,
    marginBottom: Spacing.xl,
  },
  radarContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  radarCenter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  statusText: { fontFamily: 'Sora_700Bold', fontSize: 18, color: Colors.textPrimary, marginBottom: 8 },
  logText: { fontFamily: 'Sora_400Regular', fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.sm, height: 40 },

  deviceListCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.xl,
    padding: Spacing.lg,
    ...Spacing.shadows.sm,
  },
  deviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  deviceRowDisabled: { opacity: 0.5 },
  deviceName: { fontFamily: 'Sora_700Bold', fontSize: 15, color: Colors.primary },
  deviceNameDisabled: { color: Colors.textSecondary, fontFamily: 'Sora_600SemiBold' },
  deviceId: { fontFamily: 'Sora_400Regular', fontSize: 11, color: Colors.textMuted },
  rssiContainer: { backgroundColor: Colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  rssiText: { fontFamily: 'Sora_600SemiBold', fontSize: 11, color: Colors.primary },
  emptyText: { fontFamily: 'Sora_400Regular', fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center', paddingVertical: Spacing.lg },

  guideCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.xl,
    padding: Spacing.lg,
    ...Spacing.shadows.sm,
  },
  guideTitle: { fontFamily: 'Sora_700Bold', fontSize: 16, color: Colors.textPrimary, marginBottom: Spacing.md },
  step: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, paddingRight: 20 },
  stepBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  stepNum: { color: '#FFF', fontFamily: 'Sora_700Bold', fontSize: 12 },
  stepText: { fontFamily: 'Sora_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

  resultsCard: {
    backgroundColor: '#F4FBF6',
    borderRadius: Spacing.radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultsHeader: { fontFamily: 'Sora_700Bold', fontSize: 16, color: Colors.textPrimary, marginBottom: Spacing.md },
  resultsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: Spacing.lg },
  resultItem: { width: '47%', backgroundColor: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight },
  resultVal: { fontFamily: 'Sora_800ExtraBold', fontSize: 20, color: Colors.primary },
  resultCol: { fontFamily: 'Sora_400Regular', fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
});
