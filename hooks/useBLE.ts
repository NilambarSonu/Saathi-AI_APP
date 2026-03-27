/**
 * hooks/useBLE.ts  (v2 — Production-grade)
 *
 * Exposes:
 *   status          — BLEStatus state machine
 *   bluetoothState  — raw BleState from manager (for BT-OFF banner)
 *   soilData        — last received SoilData | null
 *   logs            — structured LogEntry[] (newest first, max 80)
 *   connect         — permissions → scan → connect → listen
 *   disconnect      — full teardown
 *   retryPermission — re-trigger connect after user grants permission
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { State as BleState } from 'react-native-ble-plx';
import { bleService, BLEStatus, LogEntry } from '../services/bleService';
import type { SoilData } from '../database/datastorage';

const BLE_CONNECT_INTENT_KEY = 'saathi_ble_connect_intent';
import { useSoil } from './useSoil';

export type { BLEStatus, LogEntry };

export interface UseBLEReturn {
  status:         BLEStatus;
  bluetoothState: BleState | null;
  soilData:       SoilData | null;
  logs:           LogEntry[];
  permissionDenied: boolean;
  connect:        () => Promise<void>;
  disconnect:     () => Promise<void>;
  retryPermission:() => Promise<void>;
}

// ── Friendly error messages ──────────────────────────────────────────────────
function friendlyError(raw: string): string {
  if (raw.startsWith('PERMISSION_DENIED:'))
    return 'Bluetooth permissions denied. Go to Settings → Apps → Saathi AI → Permissions and enable Bluetooth.';
  if (raw.startsWith('BT_NOT_READY:'))
    return 'Bluetooth is OFF. Please enable Bluetooth in your device settings and try again.';
  if (raw.startsWith('SCAN_TIMEOUT:'))
    return 'Device not found. Make sure the Agni sensor is nearby and powered on, then retry.';
  if (raw.startsWith('SCAN_IN_PROGRESS'))
    return 'A scan is already running — please wait a moment.';
  if (raw.startsWith('BLE not available'))
    return 'Bluetooth is not available in this build. Please install the Saathi AI APK.';
  return raw;
}

// ─────────────────────────────────────────────────────────────────────────────
export function useBLE(): UseBLEReturn {
  const [status,          setStatus]          = useState<BLEStatus>('idle');
  const [bluetoothState,  setBluetoothState]  = useState<BleState | null>(null);
  const [soilData,        setSoilData]        = useState<SoilData | null>(null);
  const [logs,            setLogs]            = useState<LogEntry[]>([]);
  const [permissionDenied,setPermissionDenied]= useState(false);

  // Hook into the SaaS backend processor
  const soilAPI = useSoil();
  const processSoilDataRef = useRef(soilAPI.processSoilData);

  useEffect(() => {
    processSoilDataRef.current = soilAPI.processSoilData;
  }, [soilAPI.processSoilData]);

  const isMounted = useRef(true);
  const connectIntentRef = useRef(false);
  const scanBootRef = useRef(false);

  // ── Safe setters ───────────────────────────────────────────────────────
  const safeSetStatus = useCallback((s: BLEStatus) => {
    if (isMounted.current) setStatus(s);
  }, []);

  const safeBtState = useCallback((s: BleState) => {
    if (isMounted.current) setBluetoothState(s);
  }, []);

  const addLog = useCallback((entry: LogEntry) => {
    if (isMounted.current)
      setLogs(prev => [entry, ...prev].slice(0, 80));
  }, []);

  const handleData = useCallback((data: SoilData) => {
    if (isMounted.current) {
      setSoilData(data);
      processSoilDataRef.current(data);
    }
  }, []);

  // ── Mount / unmount ────────────────────────────────────────────────────
  const beginScan = useCallback(async () => {
    if (scanBootRef.current || bleService.isScanning) return;
    scanBootRef.current = true;

    try {
      await bleService.scanAndConnect({
        onStatusChange:   safeSetStatus,
        onLog:            addLog,
        onData:           handleData,
        onBluetoothState: safeBtState,
      });

      bleService.startListening();
      connectIntentRef.current = false;
      await AsyncStorage.removeItem(BLE_CONNECT_INTENT_KEY);
    } catch (err: any) {
      const msg = err?.message ?? '';

      if (msg.startsWith('BT_NOT_READY:')) {
        // Keep intent and wait for the Bluetooth state watcher to fire PoweredOn.
        safeSetStatus('idle');
        return;
      }

      if (msg.startsWith('SCAN_IN_PROGRESS')) return;

      safeSetStatus('error');
      addLog({
        level:   'error',
        message: friendlyError(msg),
        time:    new Date().toLocaleTimeString(),
      });
    } finally {
      scanBootRef.current = false;
    }
  }, [safeSetStatus, addLog, handleData, safeBtState]);

  const handleBluetoothState = useCallback((s: BleState) => {
    safeBtState(s);
    if (s === 'PoweredOn' && connectIntentRef.current) {
      void beginScan();
    }
  }, [safeBtState, beginScan]);

  useEffect(() => {
    isMounted.current = true;

    // Start BT state watcher immediately so the banner appears on screen open
    bleService.startBluetoothStateWatcher({
      onStatusChange:   safeSetStatus,
      onLog:            addLog,
      onData:           () => {},          // BT state watcher doesn't emit data
      onBluetoothState: handleBluetoothState,
    });

    void (async () => {
      const hasIntent = await AsyncStorage.getItem(BLE_CONNECT_INTENT_KEY);
      if (hasIntent !== '1') return;

      connectIntentRef.current = true;
      const isOn = await bleService.isBluetoothPoweredOn();
      if (isOn) {
        void beginScan();
      } else {
        safeSetStatus('bluetooth_off');
      }
    })();

    return () => {
      isMounted.current = false;
      bleService.disconnect().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Connect ────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    // Prevent duplicate session
    if (status === 'scanning' || status === 'connecting') return;

    setSoilData(null);
    setLogs([]);
    setPermissionDenied(false);
    connectIntentRef.current = true;
    await AsyncStorage.setItem(BLE_CONNECT_INTENT_KEY, '1');

    try {
      // 1. Permissions
      await bleService.requestAndroidPermissions();

      // 2. If BT is off, trigger system enable prompt (non-error UX path)
      const isOn = await bleService.isBluetoothPoweredOn();
      if (!isOn) {
        safeSetStatus('bluetooth_off');
        const enabled = await bleService.requestEnableBluetooth();
        if (!enabled) {
          connectIntentRef.current = false;
          await AsyncStorage.removeItem(BLE_CONNECT_INTENT_KEY);
          safeSetStatus('idle');
          return;
        }
      }

      // 3. Scan → Connect
      await beginScan();

    } catch (err: any) {
      const msg = err?.message ?? '';

      if (msg.startsWith('PERMISSION_DENIED:')) {
        setPermissionDenied(true);
        safeSetStatus('permission_denied');
      } else {
        safeSetStatus('error');
        addLog({
          level:   'error',
          message: friendlyError(msg),
          time:    new Date().toLocaleTimeString(),
        });
      }
    }
  }, [status, safeSetStatus, addLog, beginScan]);

  // ── Disconnect ─────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    connectIntentRef.current = false;
    await AsyncStorage.removeItem(BLE_CONNECT_INTENT_KEY);
    await bleService.disconnect();
    if (isMounted.current) {
      setStatus('idle');
      addLog({ level: 'info', message: 'Session ended by user.', time: new Date().toLocaleTimeString() });
    }
  }, [addLog]);

  // ── Retry after permission denial ──────────────────────────────────────
  const retryPermission = useCallback(async () => {
    setPermissionDenied(false);
    await connect();
  }, [connect]);

  return {
    status,
    bluetoothState,
    soilData,
    logs,
    permissionDenied,
    connect,
    disconnect,
    retryPermission,
  };
}
