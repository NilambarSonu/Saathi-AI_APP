import { Platform, NativeModules } from 'react-native';
import { BleManager, Device, State } from 'react-native-ble-plx';
import { request, requestMultiple, PERMISSIONS, RESULTS } from 'react-native-permissions';

class BLEService {
  manager: BleManager;
  
  constructor() {
    this.manager = new BleManager();
  }

  /**
   * Safe check for current Bluetooth state.
   */
  async getBluetoothState(): Promise<State> {
    return await this.manager.state();
  }

  /**
   * Request Android Permissions for BLE
   * Android 12+ requires SCAN and CONNECT
   * Android 11- requires FINE_LOCATION
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const apiLevel = parseInt(Platform.Version.toString(), 10);

      if (apiLevel >= 31) { // Android 12+
        const statuses = await requestMultiple([
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
          // Included for vendor specific implementations
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ]);
        
        return (
          statuses[PERMISSIONS.ANDROID.BLUETOOTH_SCAN] === RESULTS.GRANTED &&
          statuses[PERMISSIONS.ANDROID.BLUETOOTH_CONNECT] === RESULTS.GRANTED
        );
      } else {
        const locationStatus = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
        return locationStatus === RESULTS.GRANTED;
      }
    }
    return true; // iOS permissions are handled via app info.plist and OS popups automatically
  }

  /**
   * Enables bluetooth via Native module dialog without opening the settings app.
   */
  async enableBluetoothPopup(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const { BluetoothManager } = NativeModules;
      if (BluetoothManager && BluetoothManager.enableBluetooth) {
        // Option A: Use user-provided native module if it exists
        await BluetoothManager.enableBluetooth();
      } else {
        // Option B: react-native-ble-plx uses standard Intent ACTION_REQUEST_ENABLE natively
        await this.manager.enable();
      }

      // Wait a moment for hardware to spin up
      await new Promise(resolve => setTimeout(resolve, 800));

      let state = await this.manager.state();
      
      // Let's poll for up to 5s if user allowed the popup, to ensure state reflects PoweredOn
      let retries = 10;
      while (state !== State.PoweredOn && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
        state = await this.manager.state();
        retries--;
      }

      return state === State.PoweredOn;
    } catch (e) {
      console.log('Enable bluetooth failed or was rejected:', e);
      return false;
    }
  }

  /**
   * Scans for devices and avoids duplicates
   */
  startScan(
    onDeviceFound: (device: Device) => void,
    onError?: (error: any) => void
  ) {
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log('Scan error:', error);
        if (onError) onError(error);
        return;
      }

      // Only pass back devices with a name
      if (device && device.name) {
        onDeviceFound(device);
      }
    });
  }

  stopScan() {
    this.manager.stopDeviceScan();
  }
}

export const bleService = new BLEService();
