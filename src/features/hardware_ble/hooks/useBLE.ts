import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';
import type { State as BleState } from 'react-native-ble-plx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  bleService,
  type AgniBlePayload,
  type BLEStatus,
  type LogEntry,
} from '../services/bleService';
import { useSoil } from '../../soil_analysis/hooks/useSoil';

const BLE_CONNECT_INTENT_KEY = 'saathi_ble_connect_intent';

export type { BLEStatus, LogEntry, AgniBlePayload };

export interface UseBLEReturn {
  status: BLEStatus;
  bluetoothState: BleState | null;
  soilData: AgniBlePayload | null;
  latestPayload: AgniBlePayload | null;
  latestError: string | null;
  logs: LogEntry[];
  permissionDenied: boolean;
  bluetoothOffModalVisible: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  retryPermission: () => Promise<void>;
  openBluetoothSettings: () => Promise<void>;
  enableBluetooth: () => Promise<boolean>;
  cancelBluetoothPrompt: () => Promise<void>;
}

function friendlyError(raw: string): string {
  if (raw.startsWith('PERMISSION_DENIED:')) {
    return 'Bluetooth permission denied. Please enable Bluetooth permissions in Settings.';
  }
  if (raw.startsWith('BT_NOT_READY:')) {
    return 'Bluetooth is OFF. Please turn Bluetooth on and try again.';
  }
  if (raw.startsWith('SCAN_TIMEOUT:')) {
    return 'No Agni device found nearby. Make sure it is powered on and in range.';
  }
  if (raw.startsWith('CONNECT_TIMEOUT:')) {
    return 'Agni took too long to connect. Please retry.';
  }
  if (raw.startsWith('BLE_PROTOCOL_GAP:')) {
    return 'BLE protocol is not fully configured yet. UUIDs, command, and response format are still placeholders.';
  }
  return raw;
}

export function useBLE(): UseBLEReturn {
  const [status, setStatus] = useState<BLEStatus>('idle');
  const [bluetoothState, setBluetoothState] = useState<BleState | null>(null);
  const [soilData, setSoilData] = useState<AgniBlePayload | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [bluetoothOffModalVisible, setBluetoothOffModalVisible] = useState(false);
  const [latestError, setLatestError] = useState<string | null>(null);

  const isMounted = useRef(true);
  const connectIntentRef = useRef(false);
  const soilAPI = useSoil();
  const processSoilDataRef = useRef(soilAPI.processSoilData);

  useEffect(() => {
    processSoilDataRef.current = soilAPI.processSoilData;
  }, [soilAPI.processSoilData]);

  const addLog = useCallback((entry: LogEntry) => {
    if (!isMounted.current) return;
    setLogs((previous) => [entry, ...previous].slice(0, 80));
  }, []);

  const handleError = useCallback(
    (message: string) => {
      if (!isMounted.current) return;
      const nextMessage = friendlyError(message);
      setLatestError(nextMessage);
      addLog({
        level: 'error',
        message: nextMessage,
        time: new Date().toLocaleTimeString(),
      });
    },
    [addLog]
  );

  const handleData = useCallback((payload: AgniBlePayload) => {
    if (!isMounted.current) return;
    setLatestError(null);
    setSoilData(payload);
    processSoilDataRef.current(payload);
  }, []);

  const bindCallbacks = useCallback(() => {
    bleService.startBluetoothStateWatcher({
      onStatusChange: (nextStatus) => {
        if (!isMounted.current) return;
        setStatus(nextStatus);
        if (nextStatus === 'bluetooth_off') setBluetoothOffModalVisible(false);
      },
      onLog: addLog,
      onData: handleData,
      onBluetoothState: (state) => {
        if (!isMounted.current) return;
        setBluetoothState(state);
        if (state === 'PoweredOn') {
          setBluetoothOffModalVisible(false);
          if (connectIntentRef.current) {
            void connect();
          }
        }
      },
      onError: handleError,
    });
  }, [addLog, handleData, handleError]);

  useEffect(() => {
    isMounted.current = true;
    bindCallbacks();

    void (async () => {
      const hasIntent = await AsyncStorage.getItem(BLE_CONNECT_INTENT_KEY);
      if (hasIntent === '1') {
        connectIntentRef.current = true;
      }
    })();

    return () => {
      isMounted.current = false;
      void bleService.disconnect();
    };
  }, [bindCallbacks]);

  const connect = useCallback(async () => {
    if (status === 'scanning' || status === 'connecting' || status === 'transferring') {
      return;
    }

    setSoilData(null);
    setLogs([]);
    setPermissionDenied(false);
    setLatestError(null);
    connectIntentRef.current = true;
    await AsyncStorage.setItem(BLE_CONNECT_INTENT_KEY, '1');

    try {
      await bleService.connectAndRead({
        onStatusChange: setStatus,
        onLog: addLog,
        onData: handleData,
        onBluetoothState: setBluetoothState,
        onError: handleError,
      });
      connectIntentRef.current = false;
      await AsyncStorage.removeItem(BLE_CONNECT_INTENT_KEY);
    } catch (error: any) {
      const message = error?.message || 'Unknown BLE error';

      if (message.startsWith('PERMISSION_DENIED:')) {
        setPermissionDenied(true);
        setStatus('permission_denied');
      } else if (message.startsWith('BT_NOT_READY:')) {
        setBluetoothOffModalVisible(false);
        setStatus('bluetooth_off');
      } else {
        setStatus('error');
      }

      handleError(message);
    }
  }, [addLog, handleData, handleError, status]);

  const disconnect = useCallback(async () => {
    connectIntentRef.current = false;
    await AsyncStorage.removeItem(BLE_CONNECT_INTENT_KEY);
    await bleService.disconnect();
    if (!isMounted.current) return;
    setStatus('idle');
    addLog({
      level: 'info',
      message: 'BLE session ended.',
      time: new Date().toLocaleTimeString(),
    });
  }, [addLog]);

  const retryPermission = useCallback(async () => {
    setPermissionDenied(false);
    await connect();
  }, [connect]);

  const openBluetoothSettings = useCallback(async () => {
    setBluetoothOffModalVisible(false);
    await Linking.openSettings();
  }, []);

  const enableBluetooth = useCallback(async () => {
    const enabled = await bleService.requestEnableBluetooth();
    if (enabled) {
      setBluetoothOffModalVisible(false);
      setStatus((prev) => (prev === 'bluetooth_off' ? 'idle' : prev));
    }
    return enabled;
  }, []);

  const cancelBluetoothPrompt = useCallback(async () => {
    connectIntentRef.current = false;
    setBluetoothOffModalVisible(false);
    await AsyncStorage.removeItem(BLE_CONNECT_INTENT_KEY);
    setStatus('idle');
  }, []);

  const latestPayload = useMemo(() => soilData, [soilData]);

  return {
    status,
    bluetoothState,
    soilData,
    latestPayload,
    latestError,
    logs,
    permissionDenied,
    bluetoothOffModalVisible,
    connect,
    disconnect,
    retryPermission,
    openBluetoothSettings,
    enableBluetooth,
    cancelBluetoothPrompt,
  };
}


