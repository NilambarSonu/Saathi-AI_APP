import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { hideTabBar, showTabBar } from '@/constants/Animations';
import {
  View, Text, TouchableOpacity, StyleSheet, Pressable,
  ScrollView, Dimensions, Linking, ActivityIndicator, Modal, Platform, Alert
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { Buffer } from 'buffer';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  FadeOutRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Layout,
  runOnJS,
} from 'react-native-reanimated';

import { useBluetooth } from '@/features/ble/useBluetooth';
import { useLiveData } from '@/features/ble/LiveDataContext';
import { agniBluetoothManager } from '@/features/ble/AgniBluetoothManager';
import type { State as BleState } from 'react-native-ble-plx';
import { ReceivedFile } from '@/features/ble/types';
import { useTheme } from '@/context/ThemeContext';


const { width } = Dimensions.get('window');
type TabKey = 'soil' | 'guide';
const TAB_CONTENT_MIN_HEIGHT = 432;

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; colors: [string, string, ...string[]] }> = {
  idle:             { label: 'Scan for Agni Device',      colors: ['#C77DEF', '#7B2CBF', '#5A189A'] },
  scanning:         { label: 'Stop Scanning',             colors: ['#F59E0B', '#D97706']            },
  connecting:       { label: 'Connecting…',               colors: ['#FCD34D', '#F59E0B']            },
  connected:        { label: 'Fetching Soil Data…',         colors: ['#70E000', '#38B000']            },
  transferring:     { label: 'Receiving Soil Data…',      colors: ['#34D399', '#059669']            },
  complete:         { label: 'Transfer Complete ✓',        colors: ['#70E000', '#38B000']            },
  error:            { label: 'Retry Connection',          colors: ['#F59E0B', '#D97706']            },
  bluetooth_off:    { label: 'Reconnect Agni...',         colors: ['#7dadfbff', '#2c529eff']            },
  activating_bluetooth: { label: 'Activating Bluetooth…', colors: ['#FCD34D', '#F59E0B']            },
  permission_denied:{ label: 'Grant BT Permissions',      colors: ['#FCD34D', '#D97706']            },
};

function getStatusVisual(status: string, bluetoothState: BleState | null, isDark: boolean) {
  const isConnected = status === 'connected' || status === 'transferring' || status === 'complete';
  const isScanning = status === 'scanning' || status === 'connecting';

  if (status === 'permission_denied') {
    return {
      label: 'Offline',
      dotColor: '#EF4444',
      textColor: isDark ? '#FCA5A5' : '#B91C1C',
      backgroundColor: isDark ? '#450A0A' : '#FEE2E2',
      pulse: false,
      emphasized: true,
    };
  }

  if (bluetoothState === 'PoweredOff') {
    return {
      label: 'Offline',
      dotColor: '#EF4444',
      textColor: isDark ? '#FCA5A5' : '#B91C1C',
      backgroundColor: isDark ? '#450A0A' : '#FEE2E2',
      pulse: false,
      emphasized: false,
    };
  }

  if (isScanning) {
    return {
      label: 'Scanning...',
      dotColor: '#3B82F6',
      textColor: isDark ? '#93C5FD' : '#1D4ED8',
      backgroundColor: isDark ? '#172554' : '#DBEAFE',
      pulse: true,
      emphasized: false,
    };
  }

  if (isConnected) {
    return {
      label: 'Connected',
      dotColor: '#16A34A',
      textColor: isDark ? '#86EFAC' : '#166534',
      backgroundColor: isDark ? '#052E16' : '#DCFCE7',
      pulse: false,
      emphasized: true,
    };
  }

  if (bluetoothState === 'PoweredOn') {
    return {
      label: 'Online',
      dotColor: '#16A34A',
      textColor: isDark ? '#86EFAC' : '#15803D',
      backgroundColor: isDark ? '#064E3B' : '#ECFDF3',
      pulse: false,
      emphasized: false,
    };
  }

  return {
    label: 'Offline',
    dotColor: '#EF4444',
    textColor: isDark ? '#FCA5A5' : '#B91C1C',
    backgroundColor: isDark ? '#450A0A' : '#FEE2E2',
    pulse: false,
    emphasized: false,
  };
}

type StatusBadgeProps = {
  status: string;
  bluetoothState: BleState | null;
};

function StatusBadge({ status, bluetoothState }: StatusBadgeProps) {
  const { isDark } = useTheme();
  const visual = useMemo(() => getStatusVisual(status, bluetoothState, isDark), [status, bluetoothState, isDark]);

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={[s.statusBadge, { backgroundColor: visual.backgroundColor }]}
    >
      <View style={[s.statusDot, { backgroundColor: visual.dotColor }]} />
      <Text
        style={[
          s.statusBadgeText,
          { color: visual.textColor },
          visual.emphasized && s.statusBadgeStrong,
        ]}
      >
        {visual.label}
      </Text>
    </Animated.View>
  );
}

type TabSwitcherProps = {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
};

function TabSwitcher({ activeTab, onChange }: TabSwitcherProps) {
  const { theme } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const x = useSharedValue(0);
  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'soil', label: 'Soil Reports' },
    { key: 'guide', label: 'Quick Start' },
  ];

  useEffect(() => {
    if (!containerWidth) return;
    const nextX = activeTab === 'soil' ? 0 : containerWidth / 2;
    x.value = withTiming(nextX, { duration: 220 });
  }, [activeTab, containerWidth, x]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <View
      style={[s.tabContainer, { backgroundColor: theme.surfaceAlt }]}
      onLayout={(e) => {
        const widthNow = e.nativeEvent.layout.width;
        if (widthNow !== containerWidth) setContainerWidth(widthNow);
      }}
    >
      {containerWidth > 0 && (
        <Animated.View
          style={[
            s.tabActiveIndicator,
            {
              width: containerWidth / 2,
            },
            indicatorStyle,
          ]}
        >
          <LinearGradient
            colors={['#B269F7', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.tabActiveGradient}
          />
        </Animated.View>
      )}

      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={s.tab}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(tab.key);
            }}
          >
            <Animated.View entering={FadeIn.duration(120)}>
              <Text style={[s.tabText, { color: isActive ? '#FFFFFF' : theme.textSecondary }]}>{tab.label}</Text>
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

function QuickStartView() {
  const { theme } = useTheme();
  return (
    <View style={s.guideContent}>
      <View style={s.guideHeader}>
        <View style={[s.sparkleBox, { backgroundColor: theme.fillBlue }]}><Text style={s.sparkleIcon}>✨</Text></View>
        <Text style={[s.guideHeaderText, { color: theme.textPrimary }]}>Quick Start Guide</Text>
      </View>
      <View style={s.stepList}>
        {[
          { id: 1, text: 'Ensure Bluetooth is ON and location permission is granted.' },
          { id: 2, text: 'Power on your Agni sensor — the LED should blink blue.' },
          { id: 3, text: 'Tap "Scan for Agni Device" — the app auto-detects AGNI-SOIL-SENSOR.' },
          { id: 4, text: 'Stay within 5 m. Soil files transfer automatically over BLE.' },
          { id: 5, text: 'Switch to "Soil Reports" tab to see received files.' },
        ].map(step => (
          <View key={step.id} style={s.stepItem}>
            <View style={[s.stepBadge, { borderColor: theme.primary }]}>
              <Text style={[s.stepBadgeText, { color: theme.primary }]}>{step.id}</Text>
            </View>
            <Text style={[s.stepText, { color: theme.textSecondary }]}>{step.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ConnectScreen() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const {
    status, bluetoothState, logs,
    permissionDenied, connect, disconnect, retryPermission, enableBluetooth,
    addLog
  } = useBluetooth();

  const { receivedFiles, addFile, clearFiles } = useLiveData();

  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ReceivedFile | null>(null);
  const [showDangerModal, setShowDangerModal] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  
  const [activeTab, setActiveTab] = useState<TabKey>('soil');
  const [tabDirection, setTabDirection] = useState<1 | -1>(1);

  const modalY = useSharedValue(600);

  const closeFileModal = useCallback(() => {
    modalY.value = withTiming(600, { duration: 250 }, () => {
      runOnJS(setViewModalVisible)(false);
    });
  }, []);

  const onPanGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.translationY > 0) {
      modalY.value = event.nativeEvent.translationY;
    }
  };

  const onPanHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === 4) { // State.ACTIVE
      if (event.nativeEvent.translationY > 100 || event.nativeEvent.velocityY > 500) {
        closeFileModal();
      } else {
        modalY.value = withTiming(0);
      }
    }
  };

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalY.value }],
    opacity: 1,
  }));

  useEffect(() => {
    if (viewModalVisible) {
      modalY.value = 600;
      modalY.value = withTiming(0, { duration: 350 });
    }
  }, [viewModalVisible]);

  const currentFileDataRef = useRef<Uint8Array>(new Uint8Array(0));
  const controlMessageBufferRef = useRef<string>('');
  const currentFilenameRef = useRef<string>('');

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;
  const isBusy = status === 'scanning' || status === 'connecting' || status === 'transferring' || status === 'activating_bluetooth';
  const isConnected = status === 'connected' || status === 'transferring' || status === 'complete';

  const handleNotification = useCallback((bytes: Uint8Array) => {
    try {
      const textData = Buffer.from(bytes).toString('utf-8');

      // Accumulate into control buffer and check if we have a complete control message
      controlMessageBufferRef.current += textData;
      const accumulated = controlMessageBufferRef.current;

      // ── FILE_END ────────────────────────────────────────────────────────────
      if (accumulated.includes('FILE_END:')) {
        const fileEndIndex = accumulated.indexOf('FILE_END:');
        const afterFileEnd = accumulated.slice(fileEndIndex + 'FILE_END:'.length);
        
        // Check if we have the complete filename (ends with .json)
        if (afterFileEnd.includes('.json')) {
          const fileName = afterFileEnd.split('.json')[0].trim() + '.json';
          controlMessageBufferRef.current = ''; // reset control buffer
          
          addLog(`Transfer complete for: ${fileName}`);
          
          if (currentFileDataRef.current.length === 0) {
            addLog(`No data received for ${fileName}`, 'error');
            currentFilenameRef.current = '';
            return;
          }

          try {
            const fileContent = Buffer.from(currentFileDataRef.current).toString('utf-8');
            
            // Validate it's real JSON before adding
            JSON.parse(fileContent);

            // Use setTimeout to ensure state update runs on JS thread
            setTimeout(() => {
              addFile({ filename: fileName, content: fileContent });
              Toast.show({
                type: 'success',
                text1: 'File Received!',
                text2: `Successfully downloaded ${fileName}`,
              });
            }, 0);

            addLog(`File ${fileName} received successfully (${currentFileDataRef.current.length} bytes)`);
          } catch (decodeError: any) {
            addLog(`Error decoding ${fileName}: ${decodeError.message}`, 'error');
          }

          // Always reset buffer after FILE_END regardless of success/failure
          currentFileDataRef.current = new Uint8Array(0);
          currentFilenameRef.current = '';
          return;
        }
        return;
      }

      // ── TRANSFER_COMPLETE ────────────────────────────────────────────────────
      if (accumulated.includes('TRANSFER_COMPLETE')) {
        controlMessageBufferRef.current = ''; // reset
        addLog('All files received from device!');
        // Return to idle state immediately
        disconnect();
        return;
      }

      // ── FILE_START ───────────────────────────────────────────────────────────
      if (accumulated.includes('FILE_START:')) {
        const fileStartIndex = accumulated.indexOf('FILE_START:');
        const afterFileStart = accumulated.slice(fileStartIndex + 'FILE_START:'.length);
        
        // Check if we have the complete filename
        if (afterFileStart.includes('.json')) {
          const fileName = afterFileStart.split('.json')[0].trim() + '.json';
          currentFilenameRef.current = fileName;
          controlMessageBufferRef.current = ''; // reset control buffer
          currentFileDataRef.current = new Uint8Array(0); // reset data buffer for new file
          
          addLog(`Receiving file: ${fileName}`);
          return;
        }
        return;
      }

      // ── RAW DATA ─────────────────────────────────────────────────────────────
      if (currentFilenameRef.current) {
        controlMessageBufferRef.current = '';
        
        const newBuffer = new Uint8Array(currentFileDataRef.current.length + bytes.length);
        newBuffer.set(currentFileDataRef.current);
        newBuffer.set(bytes, currentFileDataRef.current.length);
        currentFileDataRef.current = newBuffer;
      } else {
        addLog(`Pre-transfer data (${bytes.length} bytes): ${textData.slice(0, 50)}`);
      }

    } catch (error: any) {
      addLog(`Error processing notification: ${error.message}`, 'error');
    }
  }, [addFile, addLog, disconnect]);

  const handlePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (status === 'scanning' || status === 'transferring') {
      await disconnect();
      return;
    }
    
    if (status === 'connected' || status === 'complete') {
      await disconnect();
    } else if (status === 'permission_denied') {
      await retryPermission();
    } else if (status === 'bluetooth_off' || bluetoothState === 'PoweredOff') {
      await enableBluetooth();
    } else if (!isBusy) {
      try {
        currentFileDataRef.current = new Uint8Array(0);
        controlMessageBufferRef.current = '';
        currentFilenameRef.current = '';
        clearFiles();

        const device = await connect();
        
        await agniBluetoothManager.subscribeToFileTransfer(
          handleNotification,
          (err) => {
            addLog(`Transfer error: ${err.message}`, 'error');
            Toast.show({ type: 'error', text1: 'Transfer Error', text2: err.message });
          }
        );
      } catch (e) {
        // Error handled in useBluetooth
      }
    }
  };

  const handleAnalyze = (file: ReceivedFile) => {
    try {
      const soilData = JSON.parse(file.content);
      
      navigation.navigate('(app)', { 
        screen: 'ai-chat',
        params: { 
          soilFileAttachment: JSON.stringify({
            filename: file.filename,
            data: soilData,
            displayName: file.filename
          })
        }
      });
    } catch (e) {
      Alert.alert('Error', 'This file contains invalid data and cannot be analyzed.');
    }
  };

  const handleViewFile = (file: ReceivedFile) => {
    setSelectedFile(file);
    setViewModalVisible(true);
  };

  const handleFormat = async () => {
    setIsFormatting(true);
    setShowDangerModal(false);
    addLog('Connecting for format...');
    
    try {
      await connect();
      addLog('Sending format command...');
      await agniBluetoothManager.sendCommand('CLEAR_FARMLAND_DATA');
      
      Toast.show({
        type: 'success',
        text1: 'Format Complete',
        text2: 'SD card farmland data cleared',
      });
      
      await disconnect();
    } catch (error: any) {
      addLog(`Format failed: ${error.message}`, 'error');
      Toast.show({
        type: 'error',
        text1: 'Format Failed',
        text2: error.message,
      });
    } finally {
      setIsFormatting(false);
    }
  };

  const handleTabChange = (nextTab: TabKey) => {
    if (nextTab === activeTab) return;
    setTabDirection(nextTab === 'guide' ? 1 : -1);
    setActiveTab(nextTab);
  };

  const contentEntering = tabDirection === 1
    ? FadeInRight.duration(240)
    : FadeInLeft.duration(240);

  const contentExiting = tabDirection === 1
    ? FadeOutLeft.duration(200)
    : FadeOutRight.duration(200);

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: theme.background }]}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={hideTabBar}
          onScrollEndDrag={showTabBar}
          onMomentumScrollBegin={hideTabBar}
          onMomentumScrollEnd={showTabBar}
          scrollEventThrottle={16}
        >

        {/* ── HEADER ── */}
        <View style={s.header}>
          <View>
            <Text style={[s.pageTitle, { color: theme.textPrimary }]}>Live Connect</Text>
            <Text style={[s.pageSub, { color: theme.textSecondary }]}>Pair With Your Agni Soil Sensor</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setShowDangerModal(true)}>
              <Feather name="trash-2" size={20} color={theme.error} />
            </TouchableOpacity>
            <StatusBadge status={status} bluetoothState={bluetoothState} />
          </View>
        </View>

        {/* ── PERMISSION DENIED BANNER ── */}
        {permissionDenied && (
          <Animated.View entering={FadeInDown.duration(400)} style={[s.alertBanner, { borderLeftColor: theme.warning, backgroundColor: isDark ? '#3D2B16' : '#FEF2F2' }]}>
            <Ionicons name="shield-outline" size={22} color={theme.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[s.alertTitle, { color: isDark ? theme.textPrimary : '#991B1B' }]}>Permissions Denied</Text>
              <Text style={[s.alertBody, { color: theme.textSecondary }]}>Bluetooth and Location permissions are required for scanning.</Text>
            </View>
            <TouchableOpacity onPress={() => Linking.openSettings()}>
              <Text style={[s.alertAction, { color: theme.warning }]}>Open →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── HERO ── */}
        <View style={s.heroContainer}>
          <View style={[s.radarCircle, isConnected && s.radarCircleActive]}>
            <LottieView
              source={require('assets/animations/Bluetooth.json')}
              autoPlay
              loop
              resizeMode="contain"
              style={s.lottieMain}
            />
          </View>

          <TouchableOpacity
            style={s.connectBtnContainer}
            onPress={handlePress}
            disabled={status === 'connecting' || status === 'activating_bluetooth'}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={cfg.colors}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[s.connectBtn, isBusy && { opacity: 0.65 }]}
            >
              <Text style={s.connectBtnText}>{cfg.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── TABS ── */}
        <TabSwitcher activeTab={activeTab} onChange={handleTabChange} />

        {/* ── CONTENT CARD ── */}
        <Animated.View entering={FadeInDown.duration(600)} style={[s.contentCardWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[s.contentCard, { backgroundColor: theme.surface }]}>
            <Animated.View
              key={activeTab}
              entering={contentEntering}
              exiting={contentExiting}
              style={s.tabContentAnimated}
            >
              {activeTab === 'soil' ? (
                <View style={s.reportsSectionInside}>
                  {receivedFiles.length > 0 ? (
                    <>
                      <View style={[s.reportsHeader, { borderBottomColor: theme.sep1 }]}>
                        <Text style={[s.reportsTitle, { color: theme.textPrimary }]}>Received Soil Reports</Text>
                        <View style={[s.reportsBadge, { backgroundColor: theme.fillPurple }]}>
                          <Text style={[s.reportsBadgeText, { color: theme.purple }]}>{receivedFiles.length}</Text>
                        </View>
                      </View>

                      <ScrollView 
                        style={s.reportsScrollArea} 
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {receivedFiles.map((file, index) => (
                          <Animated.View 
                            layout={Layout.springify()} 
                            entering={FadeInDown.delay(index * 100).duration(400)} 
                            key={file.filename} 
                            style={[s.fileRow, { borderBottomColor: theme.sep2 }]}
                          >
                            <View style={s.fileLeft}>
                              <Feather name="file-text" size={18} color={theme.textMuted} />
                              <Text style={[s.fileName, { color: theme.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                                {file.filename}
                              </Text>
                            </View>

                            <View style={s.fileActions}>
                              <TouchableOpacity
                                style={[s.iconBtn, { backgroundColor: theme.surfaceAlt }]}
                                onPress={() => handleViewFile(file)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Feather name="eye" size={18} color={theme.textSecondary} />
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[s.iconBtn, s.analyzeBtn]}
                                onPress={() => handleAnalyze(file)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Feather name="send" size={16} color="#FFFFFF" />
                              </TouchableOpacity>
                            </View>
                          </Animated.View>
                        ))}
                      </ScrollView>
                    </>
                  ) : (
                    <View style={s.emptyState}>
                      <View style={s.animationHeader}>
                        <LottieView
                          source={require('assets/animations/soil-analysis-data.json')}
                          autoPlay
                          loop
                          style={s.lottieSoilHeader}
                        />
                      </View>
                      <Text style={[s.emptyText, { color: theme.textMuted }]}>
                        Waiting for sensor data...{'\n'}Reports will appear here automatically.
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <QuickStartView />
              )}
            </Animated.View>
          </View>
        </Animated.View>

        {/* ── SESSION LOG ── */}
        {logs.length > 0 && (
          <View style={[s.logCard, { backgroundColor: isDark ? theme.surfaceAlt : '#0D1F12' }]}>
            <Text style={[s.logTitle, { color: theme.success }]}>Session Log</Text>
            {logs.slice(0, 10).map((entry, i) => (
              <View key={i} style={s.logRow}>
                <Text style={[s.logLevel, {
                  color: entry.level === 'error' ? theme.error
                       : entry.level === 'warn'  ? theme.warning : theme.success,
                }]}>
                  {entry.level.toUpperCase().padEnd(5)}
                </Text>
                <Text style={[s.logLine, { color: theme.textSecondary }]}>{entry.time}  {entry.message}</Text>
              </View>
            ))}
          </View>
        )}

        </ScrollView>

        {/* ── FILE VIEWER MODAL ── */}
        <Modal visible={viewModalVisible} transparent animationType="none">
          <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={s.modalOverlay}>
              <PanGestureHandler
                onGestureEvent={onPanGestureEvent}
                onHandlerStateChange={onPanHandlerStateChange}
              >
                <Animated.View style={[s.modalSheet, modalAnimatedStyle, { backgroundColor: theme.modalBackground }]}>
                  <View style={[s.modalHeader, { borderBottomColor: theme.sep1 }]}>
                    <View style={[s.gestureHandle, { backgroundColor: theme.sep2 }]} />
                    <View style={s.headerContent}>
                      <Text style={[s.modalTitle, { color: theme.textPrimary }]}>{selectedFile?.filename}</Text>
                      <TouchableOpacity onPress={closeFileModal}>
                        <Feather name="x" size={20} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={true}>
                    <Text style={[s.jsonText, { color: theme.textSecondary }]}>
                      {selectedFile ? JSON.stringify(JSON.parse(selectedFile.content), null, 2) : ''}
                    </Text>
                  </ScrollView>
                </Animated.View>
              </PanGestureHandler>
            </View>
          </GestureHandlerRootView>
        </Modal>

        {/* ── DANGER ZONE MODAL ── */}
        <Modal
          visible={showDangerModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDangerModal(false)}
        >
          <View style={s.modalOverlayCenter}>
            <View style={[s.dangerModalContent, { backgroundColor: theme.modalBackground }]}>
              <Text style={[s.modalTitleDanger, { color: theme.error }]}>⚠️ Danger Zone</Text>
              <Text style={[s.modalTextDanger, { color: theme.textSecondary }]}>
                This permanently deletes all farmland data from the SD card. Cannot be undone!
              </Text>
              
              <View style={s.modalButtons}>
                <TouchableOpacity 
                  style={[s.modalButton, s.cancelButton, { backgroundColor: theme.surfaceAlt }]} 
                  onPress={() => setShowDangerModal(false)}
                >
                  <Text style={[s.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[s.modalButton, s.deleteButton, { backgroundColor: theme.error }, isFormatting && s.buttonDisabled]} 
                  onPress={handleFormat}
                  disabled={isFormatting}
                >
                  {isFormatting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FFF" />
                  )}
                  <Text style={s.buttonText}>{isFormatting ? 'Formatting...' : 'Format SD Card'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 140 },

  header: { paddingTop: 5, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 32, letterSpacing: -0.5 },
  pageSub:   { fontFamily: 'Sora_400Regular',   fontSize: 12, marginTop: 2 },

  statusBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot:       { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: { fontFamily: 'Sora_600SemiBold', fontSize: 13 },
  statusBadgeStrong: { fontFamily: 'Sora_700Bold' },

  alertBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 16, padding: 16,
    marginBottom: 12, borderLeftWidth: 4,
  },
  alertTitle: { fontFamily: 'Sora_700Bold', fontSize: 14, marginBottom: 2 },
  alertBody:  { fontFamily: 'Sora_400Regular', fontSize: 13, lineHeight: 18 },
  alertAction:{ fontFamily: 'Sora_600SemiBold', fontSize: 13, marginTop: 6 },

  heroContainer: { alignItems: 'center', marginVertical: 30 },
  radarCircle:      { width: 260, height: 260, borderRadius: 130, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  radarCircleActive:{ shadowOpacity: 0.15 },
  lottieMain: { width: 220, height: 220, backgroundColor: 'transparent' },

  connectBtnContainer: { marginTop: 20, width: 260, height: 58, borderRadius: 29, shadowColor: '#C77DFF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  connectBtn:          { width: '100%', height: '100%', borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  connectBtnText:      { fontFamily: 'Sora_700Bold', fontSize: 16, color: '#FFFFFF' },

  disconnectLink:     { marginTop: 14, paddingVertical: 6, paddingHorizontal: 20 },
  disconnectLinkText: { fontFamily: 'Sora_500Medium', fontSize: 13, color: '#92400E', textDecorationLine: 'underline' },
  
  simLink: { marginTop: 10, paddingVertical: 4 },
  simLinkText: { fontFamily: 'Sora_600SemiBold', fontSize: 12, color: '#10B981', opacity: 0.8 },

  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    padding: 4,
    marginVertical: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  tabActiveIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    borderRadius: 26,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  tabActiveGradient: {
    flex: 1,
    borderRadius: 26,
  },
  tab:          { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 26, zIndex: 2 },
  tabText:      { fontFamily: 'Sora_600SemiBold', fontSize: 14 },
  tabTextActive:{ color: '#FFFFFF' },

  contentCardWrapper: { borderRadius: 32, overflow: 'hidden', marginVertical: 10, borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 8 },
  contentCard:        { padding: 24, minHeight: TAB_CONTENT_MIN_HEIGHT, borderRadius: 20, overflow: 'hidden' },
  tabContentAnimated: { width: '100%', minHeight: TAB_CONTENT_MIN_HEIGHT - 48, overflow: 'hidden', borderRadius: 16, backgroundColor: 'transparent' },

  animationHeader: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  lottieSoilHeader: {
    width: '100%',
    height: 280,
  },

  reportsSectionInside: {
    width: '100%',
  },
  reportsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  reportsTitle: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 15,
  },
  reportsBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  reportsBadgeText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 12,
  },
  reportsScrollArea: {
    maxHeight: TAB_CONTENT_MIN_HEIGHT - 120,
    marginTop: 5,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  fileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  fileName: {
    fontFamily: 'Sora_500Medium',
    marginLeft: 10,
    fontSize: 14,
    flex: 1,
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeBtn: {
    backgroundColor: '#7C3AED',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },

  logCard:  { borderRadius: 20, padding: 16, marginTop: 24, gap: 4 },
  logTitle: { fontFamily: 'Sora_600SemiBold', fontSize: 13, marginBottom: 8 },
  logRow:   { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  logLevel: { fontFamily: 'Sora_700Bold', fontSize: 10, width: 40, paddingTop: 2 },
  logLine:  { fontFamily: 'Sora_400Regular', fontSize: 11, lineHeight: 18, flex: 1 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  gestureHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 14,
  },
  modalScroll: {
    padding: 16,
  },
  jsonText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },

  guideContent: { padding: 10, minHeight: TAB_CONTENT_MIN_HEIGHT - 48, width: '100%', alignSelf: 'stretch', backgroundColor: 'transparent' },
  guideHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  sparkleBox:   { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sparkleIcon:  { fontSize: 24 },
  guideHeaderText: { fontFamily: 'Sora_700Bold', fontSize: 20 },
  stepList:     { gap: 20 },
  stepItem:     { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBadge:    { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText:{ fontFamily: 'Sora_700Bold', fontSize: 14 },
  stepText:     { fontFamily: 'Sora_400Regular', fontSize: 15, flex: 1, lineHeight: 22 },

  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dangerModalContent: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitleDanger: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 20,
    marginBottom: 10,
  },
  modalTextDanger: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButton: {},
  cancelButtonText: {
    fontFamily: 'Sora_600SemiBold',
  },
  deleteButton: {},
  buttonText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

});
