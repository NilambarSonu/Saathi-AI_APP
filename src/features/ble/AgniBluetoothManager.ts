// Buffer polyfill — MUST be first line of file
import 'react-native-get-random-values';
global.Buffer = global.Buffer || require('buffer').Buffer;

import { BleManager, Device, Subscription, State } from 'react-native-ble-plx';
import { BluetoothSoilData } from './types';
import { Platform, PermissionsAndroid, AppState, Linking, AppStateStatus } from 'react-native';
import { requestMultiple, checkMultiple, PERMISSIONS, RESULTS } from 'react-native-permissions';

const AGNI_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const AGNI_CHARACTERISTIC_UUID = '6d68efe5-04b6-4a85-abc4-c2670b7bf7fd';
const FILE_SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const FILE_CHAR_UUID = 'abcdef12-3456-7890-1234-567890abcdef';
const COMMAND_SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const COMMAND_CHARACTERISTIC_UUID = 'abcdef13-3456-7890-1234-567890abcdef';

const CONNECTION_TIMEOUT = 10000;
const READ_TIMEOUT = 5000;

class AgniBluetoothManager {
  public manager: BleManager;
  private connectedDevice: Device | null = null;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts = 3;
  private readingHistory: BluetoothSoilData[] = [];
  private readonly maxHistorySize = 100;
  private cachedReading: { data: BluetoothSoilData; timestamp: number } | null = null;
  private readonly cacheValidityMs = 30000;
  private readCount: number = 0;
  private errorCount: number = 0;
  private lastError: Error | null = null;
  private notificationSubscription: Subscription | null = null;
  private isActivating = false;

  constructor() {
    this.manager = new BleManager();
  }

  async checkBluetoothState(): Promise<State> {
    return await this.manager.state();
  }

  private waitForUserAction(): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        appSub.remove();
        clearTimeout(safety);
        resolve();
      };

      const appSub = AppState.addEventListener('change', (state) => {
        if (state === 'active') finish();
      });

      // Safety net — never leave the button stuck on 'Activating Bluetooth'.
      const safety = setTimeout(finish, 25_000);
    });
  }

  async requestAndroidPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    const sdkVersion = Number(Platform.Version);
    const permissions =
      sdkVersion >= 31
        ? [
            PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
            PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
            PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
          ]
        : [PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION];

    // Fast-path: skip the request prompt if already granted.
    const current = await checkMultiple(permissions);
    const alreadyGranted = permissions.every(
      (p) => current[p] === RESULTS.GRANTED || current[p] === RESULTS.LIMITED
    );
    if (alreadyGranted) return true;

    const results = await requestMultiple(permissions);
    const allGranted = permissions.every(
      (p) => results[p] === RESULTS.GRANTED || results[p] === RESULTS.LIMITED
    );

    return allGranted;
  }

  async requestEnableBluetooth(onStatusChange?: (status: any) => void): Promise<boolean> {
    if (Platform.OS !== 'android') return (await this.checkBluetoothState()) === State.PoweredOn;
    if (this.isActivating) return false;

    this.isActivating = true;

    try {
      const userActionPromise = this.waitForUserAction();
      if (onStatusChange) onStatusChange('activating_bluetooth');

      Linking.sendIntent('android.bluetooth.adapter.action.REQUEST_ENABLE').catch(() => {
        const mgr = this.manager as any;
        if (typeof mgr.enable === 'function') mgr.enable().catch(() => {});
      });

      const hasPermissions = await this.requestAndroidPermissions();
      if (!hasPermissions) {
        if (onStatusChange) onStatusChange('permission_denied');
        return false;
      }

      await userActionPromise;

      const finalState = await this.checkBluetoothState();
      const enabled = finalState === State.PoweredOn;
      if (onStatusChange) onStatusChange(enabled ? 'idle' : 'bluetooth_off');
      return enabled;

    } catch {
      if (onStatusChange) onStatusChange('bluetooth_off');
      return false;
    } finally {
      this.isActivating = false;
    }
  }

  async scanAndConnect(
    onDeviceFound: (deviceName: string) => void,
    onStatusUpdate: (msg: string) => void
  ): Promise<Device> {
    return new Promise((resolve, reject) => {
      onStatusUpdate('Scanning...');
      
      let found = false;
      const timeout = setTimeout(() => {
        if (!found) {
          this.manager.stopDeviceScan();
          reject(new Error('Scanning timed out. AGNI-SOIL-SENSOR not found.'));
        }
      }, CONNECTION_TIMEOUT);

      this.manager.startDeviceScan(null, { allowDuplicates: false }, async (error, device) => {
        if (error) {
          clearTimeout(timeout);
          this.manager.stopDeviceScan();
          reject(error);
          return;
        }

        if (device && (device.name === 'AGNI-SOIL-SENSOR' || device.name?.startsWith('Agni-'))) {
          found = true;
          this.manager.stopDeviceScan();
          clearTimeout(timeout);
          onDeviceFound(device.name || device.id);

          try {
            onStatusUpdate('Connecting...');
            const connectedDevice = await device.connect();
            
            try {
              onStatusUpdate('Negotiating connection parameters...');
              await connectedDevice.requestMTU(512);
              console.log('[BLE] MTU negotiated to 512 bytes');
            } catch (mtuError) {
              console.warn('[BLE] MTU negotiation failed, using default MTU with reassembly buffer:', mtuError);
            }

            onStatusUpdate('Discovering services...');
            await connectedDevice.discoverAllServicesAndCharacteristics();
            this.connectedDevice = connectedDevice;
            this.reconnectAttempts = 0;
            resolve(connectedDevice);
          } catch (e: any) {
            this.errorCount++;
            this.lastError = e;
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnectAttempts++;
              onStatusUpdate(`Connection failed. Retrying (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
              setTimeout(() => {
                this.scanAndConnect(onDeviceFound, onStatusUpdate).then(resolve).catch(reject);
              }, 1000);
            } else {
              reject(e);
            }
          }
        }
      });
    });
  }

  async subscribeToFileTransfer(
    onNotification: (data: Uint8Array) => void,
    onError: (err: Error) => void
  ): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }

    this.notificationSubscription = this.connectedDevice.monitorCharacteristicForService(
      FILE_SERVICE_UUID,
      FILE_CHAR_UUID,
      (error, characteristic) => {
        if (error) {
          const isExpectedDisconnect = 
            error.message?.includes('Operation was cancelled') ||
            error.message?.includes('Peripheral is disconnected') ||
            error.message?.includes('disconnected') ||
            error.errorCode === 201 || // BleErrorCode.DeviceDisconnected
            error.errorCode === 205;   // BleErrorCode.OperationCancelled

          if (isExpectedDisconnect) {
            console.log('[BLE] Device closed connection normally:', error.message);
            return;
          }

          onError(new Error(error.message));
          return;
        }

        if (characteristic?.value) {
          const bytes = Buffer.from(characteristic.value, 'base64');
          onNotification(new Uint8Array(bytes));
        }
      }
    );
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }

    const base64Value = Buffer.from(command, 'utf-8').toString('base64');
    await this.connectedDevice.writeCharacteristicWithResponseForService(
      COMMAND_SERVICE_UUID,
      COMMAND_CHARACTERISTIC_UUID,
      base64Value
    );
  }

  async readSoilDataDirect(): Promise<BluetoothSoilData> {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Read timed out')), READ_TIMEOUT);
    });

    const readPromise = async () => {
      const characteristic = await this.connectedDevice!.readCharacteristicForService(
        AGNI_SERVICE_UUID,
        AGNI_CHARACTERISTIC_UUID
      );

      if (!characteristic.value) {
        throw new Error('No data received from characteristic');
      }

      const jsonString = Buffer.from(characteristic.value, 'base64').toString('utf-8');
      const parsed = JSON.parse(jsonString);

      const data: BluetoothSoilData = {
        ph: this.parseNumericValue(parsed.pH || parsed.ph),
        nitrogen: this.parseNumericValue(parsed.N || parsed.nitrogen),
        phosphorus: this.parseNumericValue(parsed.P || parsed.phosphorus),
        potassium: this.parseNumericValue(parsed.K || parsed.potassium),
        moisture: this.parseNumericValue(parsed.moisture),
        temperature: this.parseNumericValue(parsed.temperature || parsed.temp),
        ec: this.parseNumericValue(parsed.EC || parsed.ec),
        location: parsed.location ? {
          latitude: this.parseNumericValue(parsed.location.lat || parsed.location.latitude),
          longitude: this.parseNumericValue(parsed.location.lng || parsed.location.longitude),
        } : undefined,
        deviceId: parsed.deviceId || this.connectedDevice?.name || 'Agni-Unknown',
        timestamp: parsed.timestamp || new Date().toISOString(),
      };

      this.readCount++;
      this.updateCache(data);
      this.addToHistory(data);
      return data;
    };

    return Promise.race([readPromise(), timeout]);
  }

  async disconnect(): Promise<void> {
    if (this.notificationSubscription) {
      this.notificationSubscription.remove();
      this.notificationSubscription = null;
    }

    if (this.connectedDevice) {
      await this.connectedDevice.cancelConnection();
      this.connectedDevice = null;
    }
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  getDeviceName(): string {
    return this.connectedDevice?.name || 'Not Connected';
  }

  getCachedReading(): BluetoothSoilData | null {
    if (!this.cachedReading) return null;
    if (Date.now() - this.cachedReading.timestamp > this.cacheValidityMs) {
      this.cachedReading = null;
      return null;
    }
    return this.cachedReading.data;
  }

  getReadingHistory(): BluetoothSoilData[] {
    return this.readingHistory;
  }

  clearHistory(): void {
    this.readingHistory = [];
  }

  getConnectionMetrics() {
    return {
      readCount: this.readCount,
      errorCount: this.errorCount,
      successRate: this.readCount + this.errorCount === 0 ? 0 : (this.readCount / (this.readCount + this.errorCount)) * 100,
      lastError: this.lastError,
      isConnected: this.isConnected(),
      deviceName: this.getDeviceName(),
    };
  }

  private parseNumericValue(value: any, fallback = 0): number {
    const val = parseFloat(value);
    return isNaN(val) ? fallback : val;
  }

  private updateCache(data: BluetoothSoilData): void {
    this.cachedReading = { data, timestamp: Date.now() };
  }

  private addToHistory(data: BluetoothSoilData): void {
    this.readingHistory.unshift(data);
    if (this.readingHistory.length > this.maxHistorySize) {
      this.readingHistory.pop();
    }
  }

  async simulateTransfer(onNotification: (data: Uint8Array) => void): Promise<void> {
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    
    const simulatedJSON = JSON.stringify({
      pH: "5.2", N: "25.3", P: "15.1", K: "35.8",
      moisture: "18.4", temperature: "24.1", EC: "2.8",
      location: { lat: "20.2961", lng: "85.8245" },
      deviceId: "Agni-01-SIM",
      timestamp: new Date().toISOString()
    });

    await delay(500);
    // Simulate split FILE_START
    onNotification(new Uint8Array(Buffer.from("FILE_START:farmland_", "utf-8")));
    await delay(100);
    onNotification(new Uint8Array(Buffer.from("001.json", "utf-8")));
    
    await delay(300);
    // Send data in chunks (simulate BLE MTU limits)
    const chunkSize = 20;
    for (let i = 0; i < simulatedJSON.length; i += chunkSize) {
      onNotification(new Uint8Array(Buffer.from(simulatedJSON.slice(i, i + chunkSize), "utf-8")));
      await delay(100);
    }
    
    await delay(300);
    // Simulate split FILE_END
    onNotification(new Uint8Array(Buffer.from("FILE_END:farmland_0", "utf-8")));
    await delay(100);
    onNotification(new Uint8Array(Buffer.from("01.json", "utf-8")));
    
    await delay(500);
    onNotification(new Uint8Array(Buffer.from("TRANSFER_COMPLETE", "utf-8")));
  }

  destroy(): void {
    this.disconnect();
    this.manager.destroy();
  }
}

export const agniBluetoothManager = new AgniBluetoothManager();
