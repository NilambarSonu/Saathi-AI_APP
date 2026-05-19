import { useState, useEffect, useCallback, useRef } from 'react';
import { PermissionsAndroid, Platform, Linking } from 'react-native';
import { Device, State as BleState } from 'react-native-ble-plx';
import { agniBluetoothManager } from './AgniBluetoothManager';
import { BluetoothSoilData, ConnectionStatus, BLEConnectionStatus } from './types';

export interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  time: string;
}

export function useBluetooth() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'idle',
    message: 'Ready to Connect',
    subMessage: 'Tap below to scan for Agni device'
  });
  const [soilData, setSoilData] = useState<BluetoothSoilData | null>(null);
  const [bluetoothState, setBluetoothState] = useState<BleState | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const addLog = useCallback((message: string, level: 'info' | 'warn' | 'error' = 'info') => {
    setLogs(prev => [{
      level,
      message,
      time: new Date().toLocaleTimeString()
    }, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    const subscription = agniBluetoothManager['manager'].onStateChange((state) => {
      setBluetoothState(state);
      if (state === BleState.PoweredOff) {
        setConnectionStatus(prev => ({ ...prev, status: 'bluetooth_off' }));
        addLog('Bluetooth is powered off', 'warn');
      } else if (state === BleState.PoweredOn) {
        setConnectionStatus(prev => ({ ...prev, status: prev.status === 'bluetooth_off' ? 'idle' : prev.status }));
        addLog('Bluetooth is powered on', 'info');
      }
    }, true);
    return () => subscription.remove();
  }, [addLog]);

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    const apiLevel = parseInt(String(Platform.Version), 10);

    let permissions = [];
    if (apiLevel < 31) {
      permissions = [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    } else {
      permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];
    }

    const results = await PermissionsAndroid.requestMultiple(permissions);
    const allGranted = permissions.every(p => results[p] === PermissionsAndroid.RESULTS.GRANTED);

    if (!allGranted) {
      setPermissionDenied(true);
      setConnectionStatus({
        status: 'permission_denied',
        message: 'Permissions Denied',
        subMessage: 'Bluetooth and Location permissions are required'
      });
      addLog('Permissions denied by user', 'error');
    } else {
      setPermissionDenied(false);
    }

    return allGranted;
  }, [addLog]);

  const connect = useCallback(async (): Promise<Device> => {
    const state = await agniBluetoothManager.checkBluetoothState();
    if (state !== BleState.PoweredOn) {
      setConnectionStatus(prev => ({ ...prev, status: 'bluetooth_off' }));
      throw new Error('Bluetooth is off');
    }

    const hasPermissions = await agniBluetoothManager.requestAndroidPermissions();
    if (!hasPermissions) {
      setPermissionDenied(true);
      setConnectionStatus({
        status: 'permission_denied',
        message: 'Permissions Denied',
        subMessage: 'Bluetooth and Location permissions are required'
      });
      throw new Error('Permissions not granted');
    }

    setConnectionStatus({
      status: 'scanning',
      message: 'Scanning...',
      subMessage: 'Looking for AGNI-SOIL-SENSOR'
    });
    addLog('Starting scan for Agni device...');

    try {
      const device = await agniBluetoothManager.scanAndConnect(
        (name) => {
          setConnectionStatus(prev => ({
            ...prev,
            status: 'connecting',
            message: 'Device Found',
            subMessage: `Connecting to ${name}...`,
            deviceName: name
          }));
          addLog(`Found device: ${name}`);
        },
        (msg) => {
          setConnectionStatus(prev => ({
            ...prev,
            subMessage: msg
          }));
          addLog(msg);
        }
      );

      setConnectionStatus({
        status: 'connected',
        message: 'Connected',
        subMessage: 'Device is ready for data transfer',
        deviceName: device.name || undefined
      });
      addLog('Successfully connected to Agni device');

      return device;
    } catch (error: any) {
      setConnectionStatus({
        status: 'error',
        message: 'Connection Failed',
        subMessage: error.message || 'Unknown error occurred'
      });
      addLog(`Connection error: ${error.message}`, 'error');
      throw error;
    }
  }, [addLog]);

  const disconnect = useCallback(async () => {
    await agniBluetoothManager.disconnect();
    setConnectionStatus({
      status: 'idle',
      message: 'Ready to Connect',
      subMessage: 'Tap below to scan for Agni device'
    });
    setSoilData(null);
    addLog('Disconnected from device');
  }, [addLog]);

  const enableBluetooth = useCallback(async () => {
    return await agniBluetoothManager.requestEnableBluetooth((nextStatus) => {
      setConnectionStatus(prev => ({ ...prev, status: nextStatus }));
    });
  }, []);

  const retryPermission = useCallback(async () => {
    const granted = await agniBluetoothManager.requestAndroidPermissions();
    if (granted) {
      setPermissionDenied(false);
      setConnectionStatus(prev => ({ ...prev, status: 'idle' }));
    }
  }, []);

  useEffect(() => {
    return () => {
      agniBluetoothManager.disconnect();
    };
  }, []);

  return {
    status: connectionStatus.status,
    connectionStatus,
    bluetoothState,
    soilData,
    logs,
    permissionDenied,
    connect,
    disconnect,
    retryPermission,
    enableBluetooth,
    isConnected: agniBluetoothManager.isConnected(),
    setSoilData,
    addLog
  };
}
