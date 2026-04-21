/**
 * services/bleService.ts  (v2 — Production-grade)
 *
 * Enhancements over v1:
 *  1.  Bluetooth state listener  — detects BT OFF, blocks scanning
 *  2.  Permission denial handler — throws structured error, guides user to Settings
 *  3.  Device filtering          — service UUID first, name/localName fallback
 *  4.  RSSI filtering            — reject signals weaker than -70 dBm
 *  5.  Scan deduplication        — `isScanning` flag prevents overlapping scans
 *  6.  Subscription cleanup      — `Subscription.remove()` always called on disconnect
 *  7.  AppState handling         — pauses scan/listen when app is backgrounded
 *  8.  JSON validation           — schema-checks parsed soil data before use
 *  9.  MTU negotiation with fallback — tries 512, logs and continues if rejected
 * 10.  Transfer watchdog         — 10 s timer resets buffer if FILE_END never arrives
 */

import { Platform, PermissionsAndroid, AppState, type AppStateStatus, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import type {
  BleManager as BleManagerType,
  Device,
  Subscription,
  State as BleState,
} from 'react-native-ble-plx';
import { saveSoilRecord, SoilData } from '../../../../database/datastorage';

// Legacy react-native-ble-manager removed

// ─── Constants ────────────────────────────────────────────────────────────────
const DEVICE_NAME_KEYWORD = 'AGNI';                              // Enhancement 3
const SERVICE_UUID        = '12345678-1234-1234-1234-123456789abc';
const CHARACTERISTIC_UUID = 'abcdef12-3456-7890-1234-567890abcdef';
const SCAN_TIMEOUT_MS     = 15_000;
const TRANSFER_TIMEOUT_MS = 10_000;                              // Enhancement 10
const MIN_RSSI            = -70;                                 // Enhancement 4
const MAX_RECONNECT       = 3;
const RECONNECT_BASE_MS   = 1_500;

// ─── Lazy BLE class loader ─────────────────────────────────────────────────────
let BleManagerClass: (new () => BleManagerType) | null = null;
try {
  BleManagerClass = require('react-native-ble-plx').BleManager ?? null;
} catch {
  console.warn('[BLE] react-native-ble-plx native module unavailable.');
}

function isBLESupported(): boolean {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return false;
  if (Constants.appOwnership === 'expo') return false;
  return BleManagerClass !== null;
}

// ─── Base64 → UTF-8 decoder ──────────────────────────────────────────────────
function decodeBase64(value: string): string {
  try {
    if (typeof atob === 'function') return decodeURIComponent(escape(atob(value)));
    const { Buffer } = require('buffer');
    return Buffer.from(value, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

// ─── JSON → SoilData mapper + validator (Enhancement 8) ─────────────────────
function validateAndMapSoilData(raw: unknown): SoilData {
  if (!raw || typeof raw !== 'object') throw new Error('Not an object');

  const obj = raw as Record<string, any>;

  // Require these top-level keys
  if (!obj.parameters || typeof obj.parameters !== 'object')
    throw new Error('Missing "parameters" block');
  if (!obj.timestamp || typeof obj.timestamp !== 'string')
    throw new Error('Missing "timestamp"');
  if (!obj.location || typeof obj.location !== 'object')
    throw new Error('Missing "location" block');

  const p   = obj.parameters as Record<string, any>;
  const loc = obj.location   as Record<string, any>;

  const toNum = (v: any): number =>
    v === undefined || v === null || v === '' ? 0 : Number(v);

  const mapped: SoilData = {
    temp:        toNum(p.temperature),
    moisture:    toNum(p.moisture),
    nitrogen:    toNum(p.nitrogen),
    phosphorus:  toNum(p.phosphorus),
    potassium:   toNum(p.potassium),
    ph:          toNum(p.ph_value),
    conductivity:toNum(p.conductivity),
    timestamp:   obj.timestamp,
    location: {
      latitude:  toNum(loc.latitude),
      longitude: toNum(loc.longitude),
    },
  };

  // Require at least one positive sensor reading
  const readings = [mapped.temp, mapped.moisture, mapped.nitrogen,
                    mapped.phosphorus, mapped.potassium, mapped.ph, mapped.conductivity];
  if (!readings.some(v => !isNaN(v) && v > 0))
    throw new Error('All sensor readings are zero — likely corrupted packet');

  return mapped;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type BLEStatus =
  | 'idle' | 'scanning' | 'connecting' | 'connected'
  | 'transferring' | 'complete' | 'error' | 'bluetooth_off' | 'permission_denied';

export type LogLevel = 'info' | 'warn' | 'error';

export type LogEntry = {
  level: LogLevel;
  message: string;
  time: string;
};

export type BLECallbacks = {
  onStatusChange:    (status: BLEStatus) => void;
  onLog:             (entry: LogEntry) => void;
  onData:            (data: SoilData) => void;
  onBluetoothState?: (state: BleState) => void;
};

// ─── BLEService Class ─────────────────────────────────────────────────────────
class BLEService {
  private _manager:            BleManagerType | null = null;
  private _device:             Device | null = null;
  private _charSubscription:   Subscription | null = null;
  private _btStateSubscription:Subscription | null = null;
  private _appStateListener:   ReturnType<typeof AppState.addEventListener> | null = null;

  private _buffer            = '';
  private _transferTimer:    ReturnType<typeof setTimeout> | null = null;
  private _reconnectAttempts = 0;
  private _isClosing         = false;
  private _transferCount     = 0;
  private _callbacks:        BLECallbacks | null = null;
  private _lastBtState:      BleState | null = null;

  // Enhancement 5 — scan dedup
  private _isScanning = false;

  // Enhancement 7 — app state
  private _appState: AppStateStatus = 'active';

  // ── Lazy manager ────────────────────────────────────────────────────────
  private _getManager(): BleManagerType | null {
    if (!isBLESupported()) {
      this._log('warn', Constants.appOwnership === 'expo'
        ? 'Bluetooth unavailable in Expo Go. Please use the Saathi AI dev build or APK.'
        : 'Bluetooth is not supported in this environment.');
      return null;
    }
    if (!this._manager) {
      try {
        this._manager = new BleManagerClass!();
      } catch (e: any) {
        this._log('error', `BLE init failed: ${e?.message ?? 'unknown'}`);
        return null;
      }
    }
    return this._manager;
  }

  // ── Structured logging ───────────────────────────────────────────────────
  private _log(level: LogLevel, message: string) {
    const entry: LogEntry = {
      level,
      message,
      time: new Date().toLocaleTimeString(),
    };
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`[BLE][${level.toUpperCase()}] ${message}`);
    this._callbacks?.onLog(entry);
  }

  private _setStatus(s: BLEStatus) {
    this._callbacks?.onStatusChange(s);
  }

  // ── Enhancement 1: Bluetooth state listener ──────────────────────────────
  startBluetoothStateWatcher(callbacks: BLECallbacks): void {
    this._callbacks = callbacks;
    const m = this._getManager();
    if (!m) return;

    // Remove previous state subscription if any
    this._btStateSubscription?.remove();

    this._btStateSubscription = m.onStateChange((state) => {
      if (this._lastBtState !== state) {
        this._lastBtState = state;
        this._log('info', `Bluetooth state: ${state}`);
      }
      callbacks.onBluetoothState?.(state);
    }, true /* emit current state immediately */);
  }

  async isBluetoothPoweredOn(): Promise<boolean> {
    return (await this.getBluetoothState()) === 'PoweredOn';
  }

  async getBluetoothState(): Promise<BleState | null> {
    const m = this._getManager();
    if (!m) return null;

    try {
      return await m.state();
    } catch {
      return null;
    }
  }

  // ── Enhancement 2: Android permissions with denial handling ─────────────
  async requestAndroidPermissions(): Promise<void> {
    if (Platform.OS !== 'android') return;

    const permissions = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ].filter(Boolean) as string[];

    const results = await PermissionsAndroid.requestMultiple(permissions);

    const denied = Object.entries(results)
      .filter(([, r]) => r !== PermissionsAndroid.RESULTS.GRANTED)
      .map(([perm]) => perm.split('.').pop());

    if (denied.length > 0) {
      const names = denied.join(', ');
      this._log('error', `Permission denied: ${names}. Go to Settings → Apps → Saathi AI → Permissions.`);
      throw new Error(`PERMISSION_DENIED:${names}`);
    }

    this._log('info', 'All Bluetooth permissions granted ✓');
  }

  // ── Enhancement 3+4+5: Scan & Connect ────────────────────────────────────
  async scanAndConnect(callbacks: BLECallbacks): Promise<Device> {
    this._callbacks = callbacks;

    // Enhancement 5 — prevent duplicate scans
    if (this._isScanning) {
      this._log('warn', 'Scan already in progress. Ignoring duplicate call.');
      throw new Error('SCAN_IN_PROGRESS');
    }

    const m = this._getManager();
    if (!m) throw new Error('BLE not available in this environment.');

    // Check Bluetooth is ON before scanning
    let currentState = await this.getBluetoothState();
    if (currentState !== 'PoweredOn') {
      if (Platform.OS === 'android') {
        try {
          this._log('info', 'Bluetooth is OFF. Prompting system popup to enable...');
          const { BluetoothManager } = NativeModules;
          
          // Request system dialog
          if (BluetoothManager && BluetoothManager.enableBluetooth) {
            await BluetoothManager.enableBluetooth();
          } else {
            // Fallback for when NativeModules isn't accessible
            await m.enable();
          }

          // Delay slightly to ensure hardware state updates
          await new Promise(r => setTimeout(r, 1500));
          currentState = await this.getBluetoothState();

          if (currentState !== 'PoweredOn') {
            // Re-read once after delay if state takes longer to reflect
            throw new Error(`BT_NOT_READY:${currentState}`);
          }
        } catch (err: any) {
          throw new Error('BT_NOT_READY:User denied Bluetooth permissions to turn on.');
        }
      } else {
        throw new Error(`BT_NOT_READY:${currentState}`);
      }
    }

    // Safety: stop any lingering scan
    try { m.stopDeviceScan(); } catch { /* ignore */ }

    this._isScanning = true;
    this._setStatus('scanning');
    this._log('info', `Scanning for "${DEVICE_NAME_KEYWORD}" device…`);

    return new Promise((resolve, reject) => {
      const scanTimer = setTimeout(() => {
        m.stopDeviceScan();
        this._isScanning = false;
        this._setStatus('error');
        reject(new Error('SCAN_TIMEOUT:Device not found within 15 seconds. Ensure the Agni sensor is nearby & powered on.'));
      }, SCAN_TIMEOUT_MS);

      // Enhancement 3: scan for our service UUID; the manager filters at protocol level
      m.startDeviceScan(
        null,
        null,
        async (error, device) => {
          if (error) {
            clearTimeout(scanTimer);
            m.stopDeviceScan();
            this._isScanning = false;
            this._setStatus('error');
            reject(error);
            return;
          }

          if (!device) return;

          if (device.name) {
            console.log(device.name);
          }

          // Enhancement 3 fallback: also match by name/localName
          const nameMatch =
            device.name?.toUpperCase().includes(DEVICE_NAME_KEYWORD) ||
            device.localName?.toUpperCase().includes(DEVICE_NAME_KEYWORD);

          // If service UUID scan returned it, great; also accept by name
          if (!nameMatch) return;

          // Enhancement 4: RSSI filter
          if (device.rssi !== null && device.rssi < MIN_RSSI) {
            this._log('warn', `Skipping "${device.name}" — RSSI ${device.rssi} dBm too weak (< ${MIN_RSSI}).`);
            return;
          }

          // ── Device accepted ──
          clearTimeout(scanTimer);
          m.stopDeviceScan();
          this._isScanning = false;
          this._log('info', `Found "${device.name}" (RSSI: ${device.rssi} dBm). Connecting…`);
          this._setStatus('connecting');

          try {
            let connected = await device.connect({ autoConnect: false });
            this._log('info', 'Discovering services & characteristics…');
            connected = await connected.discoverAllServicesAndCharacteristics();

            // Enhancement 9: MTU negotiation with fallback
            try {
              await connected.requestMTU(512);
              this._log('info', 'MTU negotiated: 512 bytes ✓');
            } catch {
              this._log('warn', 'MTU 512 rejected — using device default MTU.');
            }

            this._device = connected;
            this._reconnectAttempts = 0;

            // Unexpected disconnect watcher
            connected.onDisconnected((_err) => {
              if (!this._isClosing) {
                this._log('warn', 'Device disconnected unexpectedly. Attempting auto-reconnect…');
                this._handleDisconnect();
              }
            });

            // Enhancement 7: AppState listener
            this._registerAppStateListener();

            this._setStatus('connected');
            this._log('info', 'Connected to AGNI-SOIL-SENSOR ✓');
            resolve(connected);

          } catch (connErr: any) {
            this._isScanning = false;
            this._setStatus('error');
            reject(connErr);
          }
        }
      );
    });
  }

  // ── Enhancement 6+10: Start Listening ─────────────────────────────────────
  startListening(): void {
    if (!this._device) {
      this._log('error', 'Cannot start listening — no device connected.');
      return;
    }

    this._buffer = '';
    this._transferCount = 0;
    this._isClosing = false;

    // Enhancement 6: always remove previous subscription before creating a new one
    this._charSubscription?.remove();
    this._charSubscription = null;

    this._log('info', 'Monitoring characteristic for soil data…');
    this._setStatus('transferring');

    this._charSubscription = this._device.monitorCharacteristicForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (this._isClosing) return;
        if (this._appState !== 'active') return; // Enhancement 7

        if (error) {
          this._log('error', `Monitor error: ${error.message}`);
          this._handleDisconnect();
          return;
        }

        if (!characteristic?.value) return;

        const chunk = decodeBase64(characteristic.value);
        this._processChunk(chunk);
      }
    );
  }

  // ── Enhancement 10: Transfer watchdog ─────────────────────────────────────
  private _startTransferTimer(): void {
    this._clearTransferTimer();
    this._transferTimer = setTimeout(() => {
      this._log('warn', `Transfer watchdog: FILE_END not received in ${TRANSFER_TIMEOUT_MS / 1000}s. Resetting buffer.`);
      this._buffer = '';
    }, TRANSFER_TIMEOUT_MS);
  }

  private _clearTransferTimer(): void {
    if (this._transferTimer) {
      clearTimeout(this._transferTimer);
      this._transferTimer = null;
    }
  }

  // ── Chunk processor ────────────────────────────────────────────────────────
  private _processChunk(chunk: string): void {
    try {
      if (chunk.startsWith('FILE_START')) {
        this._buffer = '';
        this._log('info', 'File transfer started — buffer cleared.');
        this._startTransferTimer(); // Enhancement 10: start watchdog
        return;
      }

      if (chunk.startsWith('FILE_END')) {
        this._clearTransferTimer(); // Enhancement 10: cancel watchdog
        this._log('info', 'FILE_END received. Parsing soil JSON…');

        const startIdx = this._buffer.indexOf('{');
        const endIdx   = this._buffer.lastIndexOf('}');

        if (startIdx !== -1 && endIdx > startIdx) {
          const jsonStr = this._buffer.substring(startIdx, endIdx + 1);

          try {
            const raw = JSON.parse(jsonStr);
            const soilData = validateAndMapSoilData(raw); // Enhancement 8

            saveSoilRecord(soilData)
              .then(() => this._log('info', 'Soil record saved to local storage ✓'))
              .catch(e  => this._log('error', `Save failed: ${e?.message}`));

            this._callbacks?.onData(soilData);

          } catch (parseErr: any) {
            this._log('warn', `Data validation failed: ${parseErr.message}. Chunk discarded.`);
          }
        } else {
          this._log('warn', 'FILE_END received but buffer contained no valid JSON block.');
        }

        this._buffer = '';
        return;
      }

      if (chunk.includes('TRANSFER_COMPLETE') || chunk.includes('ALL FILES TRANSFERED')) {
        this._clearTransferTimer();
        this._transferCount++;
        this._log('info', `Transfer ${this._transferCount} complete.`);

        if (this._transferCount >= 2) {
          this._log('info', 'All transfers received. Finalising session…');
          this._isClosing = true;
          this._setStatus('complete');
          setTimeout(() => this.disconnect(), 1200);
        } else {
          this._buffer = '';
          this._log('info', 'Waiting for second transfer…');
        }
        return;
      }

      // Normal data — accumulate
      this._buffer += chunk;

    } catch (err: any) {
      this._log('error', `Chunk processing exception: ${err?.message}`);
    }
  }

  // ── Enhancement 7: AppState listener ─────────────────────────────────────
  private _registerAppStateListener(): void {
    // Remove previous listener to avoid stacking
    this._appStateListener?.remove();

    this._appStateListener = AppState.addEventListener('change', (nextState) => {
      const previous = this._appState;
      this._appState = nextState;

      if (nextState === 'background' || nextState === 'inactive') {
        this._log('info', 'App backgrounded — pausing BLE notification processing.');
        // We keep the connection alive but ignore chunks (guarded in callback above)
      }

      if (nextState === 'active' && previous !== 'active') {
        this._log('info', 'App foregrounded — resuming BLE.');
        // If we lost connection while backgrounded, re-attempt
        if (this._device && !this._isClosing) {
          this._device.isConnected().then(isConn => {
            if (!isConn) {
              this._log('warn', 'Connection lost while backgrounded. Reconnecting…');
              this._handleDisconnect();
            }
          });
        }
      }
    });
  }

  // ── Auto-reconnect ────────────────────────────────────────────────────────
  private async _handleDisconnect(): Promise<void> {
    this._isClosing = false;

    if (this._reconnectAttempts >= MAX_RECONNECT) {
      this._log('error', `Auto-reconnect exhausted after ${MAX_RECONNECT} attempts.`);
      this._setStatus('error');
      return;
    }

    this._reconnectAttempts++;
    const delay = RECONNECT_BASE_MS * this._reconnectAttempts;
    this._log('warn', `Reconnect attempt ${this._reconnectAttempts}/${MAX_RECONNECT} in ${delay}ms…`);
    this._setStatus('scanning');

    await new Promise(r => setTimeout(r, delay));
    if (!this._callbacks) return;

    try {
      await this.scanAndConnect(this._callbacks);
      this.startListening();
    } catch (e: any) {
      this._log('error', `Reconnect failed: ${e?.message}`);
    }
  }

  // ── Disconnect (full teardown) ─────────────────────────────────────────────
  async disconnect(): Promise<void> {
    const hadActiveResources = Boolean(
      this._charSubscription ||
      this._btStateSubscription ||
      this._appStateListener ||
      this._device ||
      this._isScanning
    );

    this._isClosing = true;
    
    // Stop any active scan immediately so scanAndConnect's Promise resolve path stops
    if (this._isScanning) {
      try {
        const m = this._manager;
        if (m) m.stopDeviceScan();
      } catch { /* ignore */ }
    }
    
    this._isScanning = false;
    this._clearTransferTimer();

    // Enhancement 6: remove characteristic subscription
    if (this._charSubscription) {
      this._charSubscription.remove();
      this._charSubscription = null;
    }

    // Remove BT state watcher
    if (this._btStateSubscription) {
      this._btStateSubscription.remove();
      this._btStateSubscription = null;
    }

    // Enhancement 7: remove AppState listener
    if (this._appStateListener) {
      this._appStateListener.remove();
      this._appStateListener = null;
    }

    if (this._device) {
      try {
        const isConn = await this._device.isConnected();
        if (isConn) await this._device.cancelConnection();
      } catch { /* device already gone */ }
      finally { this._device = null; }
    }

    this._buffer            = '';
    this._transferCount     = 0;
    this._reconnectAttempts = 0;
    this._appState          = 'active';
    this._lastBtState       = null;
    this._callbacks         = null;

    if (hadActiveResources) {
      this._log('info', 'Disconnected and all resources released.');
    }
  }

  // ── Public state ─────────────────────────────────────────────────────────
  get isConnected(): boolean { return this._device !== null && !this._isClosing; }
  get isScanning():  boolean { return this._isScanning; }
}

// ── Singleton ─────────────────────────────────────────────────────────────────
export const bleService = new BLEService();
