import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Animated, 
  Easing, 
  ActivityIndicator,
  Platform
} from 'react-native';
import { State, Device } from 'react-native-ble-plx';
import { bleService } from '../../src/services/bleService';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ConnectScreen() {
  const [bluetoothState, setBluetoothState] = useState<State | null>(null);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  
  // Animation values for Nothing X style UX
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const listFadeAnim = useRef(new Animated.Value(0)).current;

  // Initialize and check state
  useEffect(() => {
    checkBluetoothState();
    
    // Subscribe to bluetooth state changes dynamically
    const subscription = bleService.manager.onStateChange((state) => {
      setBluetoothState(state);
    }, true);

    return () => {
      subscription.remove();
      bleService.stopScan();
    };
  }, []);

  const checkBluetoothState = async () => {
    try {
      const state = await bleService.getBluetoothState();
      setBluetoothState(state);
    } catch (e) {
      console.log('Error checking state', e);
    }
  };

  const handleTurnOn = async () => {
    try {
      // triggers the Android system-level popup dialog (Allow / Deny)
      const isEnabled = await bleService.enableBluetoothPopup();
      if (isEnabled) {
        setBluetoothState(State.PoweredOn);
      }
    } catch (error) {
      console.log('User denied popup or enable failed', error);
    }
  };

  const startLoopingRipple = () => {
    rippleAnim.setValue(0);
    Animated.loop(
      Animated.timing(rippleAnim, {
        toValue: 1, // scales up and fades out
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  };

  const stopLoopingRipple = () => {
    rippleAnim.stopAnimation();
    rippleAnim.setValue(0);
  };

  const startScan = async () => {
    if (bluetoothState !== State.PoweredOn) return;

    try {
      // Request proper Android 12+ permissions
      const permissionsGranted = await bleService.requestPermissions();
      if (!permissionsGranted) {
        console.log('Required permissions not granted by user.');
        return;
      }

      setScanning(true);
      setDevices([]);
      
      // Animate List Fade out if re-scanning
      listFadeAnim.setValue(0);
      startLoopingRipple();

      bleService.startScan((device) => {
        setDevices((prev) => {
          // Avoid duplicate devices from continuous BLE advertisements
          if (!prev.find(d => d.id === device.id)) {
            return [...prev, device];
          }
          return prev;
        });
      });

      // Animate List Fade In slowly when scanning starts
      Animated.timing(listFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      // Automatically Stop Scan after 10 seconds (per requirements)
      setTimeout(() => {
        stopScan();
      }, 10000); 
    } catch (e) {
      console.log('Scan sequence failed:', e);
      stopScan();
    }
  };

  const stopScan = () => {
    bleService.stopScan();
    setScanning(false);
    stopLoopingRipple();
  };



  const renderDevice = ({ item }: { item: Device }) => (
    <Animated.View style={[styles.deviceItem, { opacity: listFadeAnim }]}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.deviceRssi}>Signal Strength: {item.rssi || 'N/A'} dBm</Text>
      </View>
      <TouchableOpacity style={styles.connectBtn} activeOpacity={0.7}>
        <Text style={styles.connectBtnText}>Connect</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const showBluetoothSheet = bluetoothState !== null && bluetoothState !== State.PoweredOn;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={styles.container}>
        {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Add Device</Text>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        {/* Ripple & Scan Button Center */}
        <View style={styles.scanArea}>
          {scanning && (
            <Animated.View 
              style={[
                styles.ripple, 
                { 
                  transform: [{ scale: rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 3] }) }],
                  opacity: rippleAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.7, 0.1, 0] })
                }
              ]} 
            />
          )}
          <TouchableOpacity 
            style={[styles.scanButton, scanning && styles.scanButtonActive]} 
            onPress={scanning ? stopScan : startScan}
            disabled={bluetoothState !== State.PoweredOn}
            activeOpacity={0.7}
          >
            {scanning ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.scanButtonText}>Scan</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Device List */}
        <View style={styles.listContainer}>
          <FlatList
            data={devices}
            keyExtractor={(item) => item.id}
            renderItem={renderDevice}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              scanning ? (
                <Text style={styles.emptyText}>Searching around...</Text>
              ) : (
                <Text style={styles.emptyText}>Tap Scan to find nearby devices.</Text>
              )
            }
          />
        </View>
      </View>

      {/* Contextual Bottom Sheet overlay */}
      {showBluetoothSheet && (
        <>
          {/* BACKDROP */}
          <View style={styles.backdrop} />
          
          {/* BOTTOM SHEET */}
          <View style={styles.bottomSheet}>
            <Text style={styles.sheetTitle}>Bluetooth is OFF</Text>
            <Text style={styles.sheetSubTitle}>Turn on Bluetooth to scan devices</Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.turnOnBtn} onPress={handleTurnOn} activeOpacity={0.8}>
                <Text style={styles.turnOnBtnText}>Turn ON</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
      </View>
    </SafeAreaView>
  );
}

// Minimalistic styling reflecting the Nothing OS dark luxury vibe
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  title: {
    color: '#fff',
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  mainContent: {
    flex: 1,
  },
  scanArea: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    zIndex: 10,
  },
  scanButtonActive: {
    backgroundColor: '#cfcfcf',
    transform: [{ scale: 0.95 }], // Slight press effect built-in style 
  },
  scanButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ripple: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#121212',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  listContent: {
    paddingBottom: 40,
    paddingTop: 20,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1c1c1c',
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
  },
  deviceInfo: {
    flex: 1,
    marginRight: 10,
  },
  deviceName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  deviceRssi: {
    color: '#888',
    fontSize: 13,
  },
  connectBtn: {
    backgroundColor: '#e62222', // Subtle red accent from Nothing palette elements
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  connectBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  // Bottom Sheet UI
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 998,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
    elevation: 20,
    zIndex: 999,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    color: '#000',
  },
  sheetSubTitle: {
    fontSize: 14,
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  turnOnBtn: {
    flex: 1,
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  turnOnBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

