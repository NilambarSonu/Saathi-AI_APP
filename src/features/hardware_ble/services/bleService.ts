import { AppState, Platform, Linking, type AppStateStatus } from 'react-native';
import { request, check, requestMultiple, PERMISSIONS, RESULTS } from 'react-native-permissions';
import {
  BleError,
  BleManager,
  Characteristic,
  Device,
  type State as BleState,
  type Subscription,
} from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { saveSoilRecord, type SoilData } from '@/services/storage/datastorage';

const DEVICE_NAME_KEYWORD = 'AGNI';
const SCAN_TIMEOUT_MS = 12_000;
const CONNECT_TIMEOUT_MS = 15_000;
const READ_TIMEOUT_MS = 12_000;
const AGNI_PROTOCOL = {
  serviceUuid: 'REPLACE_ME',
  writeCharacteristicUuid: 'REPLACE_ME',
  notifyCharacteristicUuid: 'REPLACE_ME',
  command: 'REPLACE_ME',
  commandEncoding: 'text' as 'text' | 'hex',
  responseFormat: 'REPLACE_ME',
};

function normalizeUuid(value: string): string {
  return value.trim().toLowerCase();
}

function isPlaceholder(value: string): boolean {
  return !value || value.includes('REPLACE_ME');
}

function ensureProtocolConfigured(): void {
  if (
    isPlaceholder(AGNI_PROTOCOL.serviceUuid) ||
    isPlaceholder(AGNI_PROTOCOL.writeCharacteristicUuid) ||
    isPlaceholder(AGNI_PROTOCOL.notifyCharacteristicUuid) ||
    isPlaceholder(AGNI_PROTOCOL.command) ||
    isPlaceholder(AGNI_PROTOCOL.responseFormat)
  ) {
    throw new Error('BLE_PROTOCOL_GAP: Update Agni BLE UUIDs, command, and response format placeholders.');
  }
}

function toBase64Command(command: string, encoding: 'text' | 'hex'): string {
  if (encoding === 'hex') {
    const normalized = command.replace(/\s+/g, '');
    if (!/^[0-9a-fA-F]+$/.test(normalized) || normalized.length % 2 !== 0) {
      throw new Error('INVALID_BLE_COMMAND: Hex command must contain an even number of hex characters.');
    }
    return Buffer.from(normalized, 'hex').toString('base64');
  }

  return Buffer.from(command, 'utf8').toString('base64');
}

function decodeBase64(value: string): string {
  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function normalizeNumeric(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseSoilPayload(rawPayload: string): SoilData {
  let parsed: any;
  try {
    parsed = JSON.parse(rawPayload);
  } catch {
    throw new Error('BLE_PARSE_ERROR: Device response was not valid JSON.');
  }

  const metrics = parsed?.metrics ?? parsed?.parameters ?? parsed;
  const location = parsed?.location ?? {};

  const soilData: SoilData = {
    temp: normalizeNumeric(metrics?.temperature ?? metrics?.temp ?? parsed?.temperature),
    moisture: normalizeNumeric(metrics?.moisture ?? parsed?.moisture),
    nitrogen: normalizeNumeric(metrics?.nitrogen ?? metrics?.n ?? parsed?.nitrogen),
    phosphorus: normalizeNumeric(metrics?.phosphorus ?? metrics?.p ?? parsed?.phosphorus),
    potassium: normalizeNumeric(metrics?.potassium ?? metrics?.k ?? parsed?.potassium),
    ph: normalizeNumeric(metrics?.ph ?? metrics?.pH ?? parsed?.ph),
    conductivity: normalizeNumeric(
      metrics?.conductivity ?? metrics?.ec ?? parsed?.conductivity ?? parsed?.ec
    ),
    timestamp:
      typeof parsed?.timestamp === 'string' && parsed.timestamp.trim().length > 0
        ? parsed.timestamp
        : new Date().toISOString(),
    location: {
      latitude: normalizeNumeric(location?.latitude ?? parsed?.latitude),
      longitude: normalizeNumeric(location?.longitude ?? parsed?.longitude),
    },
  };

  const hasAnySignal = [
    soilData.temp,
    soilData.moisture,
    soilData.nitrogen,
    soilData.phosphorus,
    soilData.potassium,
    soilData.ph,
    soilData.conductivity,
  ].some((value) => value !== 0);

  if (!hasAnySignal) {
    throw new Error('BLE_PARSE_ERROR: Parsed payload did not contain usable soil readings.');
  }

  return soilData;
}

export type BLEStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'transferring'
  | 'complete'
  | 'error'
  | 'bluetooth_off'
  | 'activating_bluetooth'
  | 'permission_denied';

export type LogLevel = 'info' | 'warn' | 'error';

export type LogEntry = {
  level: LogLevel;
  message: string;
  time: string;
};

export interface AgniBlePayload extends SoilData {
  rawPayload: string;
  deviceId: string;
}

export type BLECallbacks = {
  onStatusChange: (status: BLEStatus) => void;
  onLog: (entry: LogEntry) => void;
  onData: (data: AgniBlePayload) => void;
  onBluetoothState?: (state: BleState) => void;
  onError?: (message: string) => void;
};

class BLEService {
  private manager = new BleManager();
  private device: Device | null = null;
  private notifySubscription: Subscription | null = null;
  private bluetoothSubscription: Subscription | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private callbacks: BLECallbacks | null = null;
  private scanTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingResponseTimer: ReturnType<typeof setTimeout> | null = null;
  private scanResolver: ((device: Device) => void) | null = null;
  private scanRejecter: ((reason?: unknown) => void) | null = null;
  private lastSeenDevices = new Set<string>();
  private activeAppState: AppStateStatus = AppState.currentState;
  private latestPayload: AgniBlePayload | null = null;
  private latestError: string | null = null;
  private currentStatus: BLEStatus = 'idle';
  private currentBluetoothState: BleState | null = null;
  private currentWriteCharacteristic: Characteristic | null = null;
  private currentNotifyCharacteristic: Characteristic | null = null;

  get isConnected(): boolean {
    return this.device !== null;
  }

  get isScanning(): boolean {
    return this.scanResolver !== null;
  }

  get latestSoilPayload(): AgniBlePayload | null {
    return this.latestPayload;
  }

  get latestFailure(): string | null {
    return this.latestError;
  }

  private emitLog(level: LogLevel, message: string): void {
    const entry: LogEntry = {
      level,
      message,
      time: new Date().toLocaleTimeString(),
    };

    this.callbacks?.onLog(entry);
    if (level === 'error') {
      this.latestError = message;
      this.callbacks?.onError?.(message);
    }
  }

  private setStatus(status: BLEStatus): void {
    this.currentStatus = status;
    this.callbacks?.onStatusChange(status);
  }

  private resetResponseTimer(): void {
    if (this.pendingResponseTimer) {
      clearTimeout(this.pendingResponseTimer);
    }

    this.pendingResponseTimer = setTimeout(() => {
      this.emitLog('warn', 'BLE read timed out waiting for Agni response.');
      this.setStatus('error');
    }, READ_TIMEOUT_MS);
  }

  private clearResponseTimer(): void {
    if (this.pendingResponseTimer) {
      clearTimeout(this.pendingResponseTimer);
      this.pendingResponseTimer = null;
    }
  }

  startBluetoothStateWatcher(callbacks: BLECallbacks): void {
    this.callbacks = callbacks;
    this.bluetoothSubscription?.remove();
    this.bluetoothSubscription = this.manager.onStateChange((state) => {
      this.currentBluetoothState = state;
      this.callbacks?.onBluetoothState?.(state);

      // Only set bluetooth_off if we aren't in the middle of activating it or if permissions are missing
      if (
        state !== 'PoweredOn' && 
        this.currentStatus !== 'permission_denied' && 
        this.currentStatus !== 'activating_bluetooth'
      ) {
        this.setStatus('bluetooth_off');
      }
    }, true);

    this.registerAppStateListener();
  }

  private registerAppStateListener(): void {
    this.appStateSubscription?.remove();
    this.appStateSubscription = AppState.addEventListener('change', (nextState) => {
      this.activeAppState = nextState;
      if (nextState !== 'active' && this.isScanning) {
        this.stopScan('App moved to background. Scan stopped safely.');
      }
    });
  }

  async getBluetoothState(): Promise<BleState> {
    const state = await this.manager.state();
    this.currentBluetoothState = state;
    return state;
  }

  async isBluetoothPoweredOn(): Promise<boolean> {
    return (await this.getBluetoothState()) === 'PoweredOn';
  }

  private isActivating = false;

  /**
   * Triggers the native Android Bluetooth activation dialog.
    * Uses Android's request-enable intent with a library fallback.
   */
  async requestEnableBluetooth(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return this.isBluetoothPoweredOn();
    }

    if (this.isActivating) return false;
    this.isActivating = true;

    try {
      // 1. Fast-path: Check permissions and state immediately
      const hasPermissions = await this.requestAndroidPermissions();
      if (!hasPermissions) {
        this.isActivating = false;
        return false;
      }

      if (await this.isBluetoothPoweredOn()) {
        this.setStatus('idle');
        this.isActivating = false;
        return true;
      }

      // 2. Trigger Activation Dialog
      this.setStatus('activating_bluetooth');

      // Small delay improves dialog reliability when screen transitions just occurred.
      await new Promise((resolve) => setTimeout(resolve, 800));

      let promptTriggered = false;
      try {
        await Linking.sendIntent('android.bluetooth.adapter.action.REQUEST_ENABLE');
        promptTriggered = true;
      } catch {
        // Ignore here and fall back to manager.enable().
      }

      // Fallback for devices or environments where sendIntent is unavailable.
      if (!promptTriggered) {
        const managerAny = this.manager as any;
        if (typeof managerAny.enable === 'function') {
          await managerAny.enable().catch(() => {
            // Keep fallback silent; final state check below decides success.
          });
        }
      }

      // Poll for up to 15 seconds because enabling hardware may not be immediate.
      for (let i = 0; i < 30; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (await this.isBluetoothPoweredOn()) {
          break;
        }
      }

      // 3. Final State Sync
      const finalState = await this.getBluetoothState();
      const success = finalState === 'PoweredOn';
      this.setStatus(success ? 'idle' : 'bluetooth_off');
      return success;

    } catch (error: any) {
      this.setStatus('bluetooth_off');
      return false;
    } finally {
      this.isActivating = false;
    }
  }

  /**
   * Helper to request all required Android permissions for BLE operations.
   */
  async requestAndroidPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    const sdkVersion = Number(Platform.Version);
    const permissions = sdkVersion >= 31 
      ? [
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN, 
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT, 
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION, 
          PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE
        ]
      : [PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION];

    const results = await requestMultiple(permissions);
    const allGranted = permissions.every(p => results[p] === RESULTS.GRANTED || results[p] === RESULTS.LIMITED);
    
    if (!allGranted) {
      this.setStatus('permission_denied');
    }
    
    return allGranted;
  }

  private matchesTargetDevice(device: Device): boolean {
    const advertised = (device.serviceUUIDs || []).map(normalizeUuid);
    const targetService = normalizeUuid(AGNI_PROTOCOL.serviceUuid);
    const hasService = !isPlaceholder(AGNI_PROTOCOL.serviceUuid) && advertised.includes(targetService);
    const hasName =
      device.name?.toUpperCase().includes(DEVICE_NAME_KEYWORD) ||
      device.localName?.toUpperCase().includes(DEVICE_NAME_KEYWORD);

    return Boolean(hasService || hasName);
  }

  private clearScanState(): void {
    if (this.scanTimer) {
      clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }
    this.scanResolver = null;
    this.scanRejecter = null;
  }

  async scanForDevice(): Promise<Device> {
    const state = await this.getBluetoothState();
    if (state !== 'PoweredOn') {
      this.setStatus('bluetooth_off');
      throw new Error('BT_NOT_READY: Bluetooth is turned off.');
    }

    if (this.isScanning) {
      throw new Error('SCAN_IN_PROGRESS');
    }

    this.setStatus('scanning');
    this.lastSeenDevices.clear();

    return new Promise<Device>((resolve, reject) => {
      this.scanResolver = resolve;
      this.scanRejecter = reject;

      this.scanTimer = setTimeout(() => {
        this.stopScan();
        reject(new Error('SCAN_TIMEOUT: No Agni device found within scan timeout.'));
      }, SCAN_TIMEOUT_MS);

      this.manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (error) {
          this.stopScan();
          reject(error);
          return;
        }

        if (!device || !this.matchesTargetDevice(device)) return;
        if (this.lastSeenDevices.has(device.id)) return;

        this.lastSeenDevices.add(device.id);
        this.stopScan();
        resolve(device);
      });
    });
  }

  stopScan(reason?: string): void {
    try {
      this.manager.stopDeviceScan();
    } catch {
      // no-op
    }
    this.clearScanState();
    if (reason) {
      this.emitLog('info', reason);
    }
  }

  private async discoverProtocolCharacteristics(device: Device): Promise<void> {
    ensureProtocolConfigured();

    const services = await device.services();
    const service = services.find(
      (item) => normalizeUuid(item.uuid) === normalizeUuid(AGNI_PROTOCOL.serviceUuid)
    );

    if (!service) {
      throw new Error('BLE_PROTOCOL_GAP: Agni service UUID not found on connected device.');
    }

    const characteristics = await service.characteristics();
    this.currentWriteCharacteristic =
      characteristics.find(
        (item) =>
          normalizeUuid(item.uuid) === normalizeUuid(AGNI_PROTOCOL.writeCharacteristicUuid)
      ) || null;
    this.currentNotifyCharacteristic =
      characteristics.find(
        (item) =>
          normalizeUuid(item.uuid) === normalizeUuid(AGNI_PROTOCOL.notifyCharacteristicUuid)
      ) || null;

    if (!this.currentWriteCharacteristic || !this.currentNotifyCharacteristic) {
      throw new Error('BLE_PROTOCOL_GAP: Required Agni characteristics were not found.');
    }
  }

  async connectToDevice(device: Device): Promise<Device> {
    this.setStatus('connecting');
    this.emitLog('info', `Connecting to ${device.name || device.localName || device.id}...`);

    const connected = await withTimeout(
      device.connect({ autoConnect: false }).then((result) => result.discoverAllServicesAndCharacteristics()),
      CONNECT_TIMEOUT_MS,
      'CONNECT_TIMEOUT: Agni connection timed out.'
    );

    this.device = connected;
    await this.discoverProtocolCharacteristics(connected);
    connected.onDisconnected((error) => {
      if (error) {
        this.emitLog('warn', `Disconnected: ${error.message}`);
      }

      this.device = null;
      this.currentWriteCharacteristic = null;
      this.currentNotifyCharacteristic = null;
      this.notifySubscription?.remove();
      this.notifySubscription = null;

      if (this.activeAppState === 'active') {
        this.emitLog('warn', 'BLE connection dropped. Tap retry to reconnect.');
        this.setStatus('error');
      } else {
        this.setStatus('idle');
      }
    });

    this.setStatus('connected');
    this.emitLog('info', 'Agni connected and services discovered.');
    return connected;
  }

  async subscribeToResponses(): Promise<void> {
    if (!this.device || !this.currentNotifyCharacteristic) {
      throw new Error('BLE_NOT_READY: No notify/read characteristic available.');
    }

    this.notifySubscription?.remove();
    this.notifySubscription = this.device.monitorCharacteristicForService(
      AGNI_PROTOCOL.serviceUuid,
      AGNI_PROTOCOL.notifyCharacteristicUuid,
      async (error: BleError | null, characteristic: Characteristic | null) => {
        if (error) {
          this.emitLog('error', `BLE monitor error: ${error.message}`);
          this.setStatus('error');
          return;
        }

        if (!characteristic?.value) return;

        this.clearResponseTimer();
        try {
          const rawPayload = decodeBase64(characteristic.value);
          const soilData = parseSoilPayload(rawPayload);
          const payload: AgniBlePayload = {
            ...soilData,
            rawPayload,
            deviceId: this.device?.id || 'AGNI-SOIL-SENSOR',
          };

          this.latestPayload = payload;
          await saveSoilRecord(soilData).catch(() => {});
          this.callbacks?.onData(payload);
          this.emitLog('info', 'Soil data received from Agni.');
          this.setStatus('complete');
        } catch (parseError: any) {
          this.emitLog('error', parseError?.message || 'Failed to parse BLE payload.');
          this.setStatus('error');
        }
      }
    );
  }

  async requestSoilReading(): Promise<void> {
    ensureProtocolConfigured();

    if (!this.device || !this.currentWriteCharacteristic) {
      throw new Error('BLE_NOT_READY: Connect to Agni before requesting data.');
    }

    await this.subscribeToResponses();
    this.setStatus('transferring');
    this.emitLog('info', 'Sending Agni command over BLE...');

    const encodedCommand = toBase64Command(AGNI_PROTOCOL.command, AGNI_PROTOCOL.commandEncoding);
    this.resetResponseTimer();

    await this.device.writeCharacteristicWithResponseForService(
      AGNI_PROTOCOL.serviceUuid,
      AGNI_PROTOCOL.writeCharacteristicUuid,
      encodedCommand
    );
  }

  async connectAndRead(callbacks: BLECallbacks): Promise<AgniBlePayload | null> {
    this.callbacks = callbacks;
    this.latestError = null;
    this.latestPayload = null;

    const hasPerms = await this.requestAndroidPermissions();
    if (!hasPerms) throw new Error('PERMISSION_DENIED: Required Bluetooth/Location permissions are missing.');

    const device = await this.scanForDevice();
    await this.connectToDevice(device);
    await this.requestSoilReading();

    return this.latestPayload;
  }

  /**
   * Cleans up all subscriptions and disconnects from device.
   */
  async disconnect(): Promise<void> {
    this.stopScan();
    this.clearResponseTimer();
    this.notifySubscription?.remove();
    this.notifySubscription = null;

    if (this.device) {
      try {
        if (await this.device.isConnected()) {
          await this.device.cancelConnection();
        }
      } catch { /* Ignore */ }
    }

    this.device = null;
    this.currentWriteCharacteristic = null;
    this.currentNotifyCharacteristic = null;
    this.latestPayload = null;
    this.setStatus('idle');
  }

  /**
   * Full cleanup for component unmounting.
   */
  destroy(): void {
    this.bluetoothSubscription?.remove();
    this.appStateSubscription?.remove();
    void this.disconnect();
    this.manager.destroy();
  }
}

export const bleService = new BLEService();


