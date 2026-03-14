import type { BleManager as BleManagerType, Device, Subscription } from "react-native-ble-plx";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { saveSoilRecord, SoilData, SoilTestRecord } from "../database/datastorage";

let bleManager: any = null;

try {
  // Only attempt to load BLE if native module is available
  const BleManagerMod = require('react-native-ble-plx');
  bleManager = BleManagerMod.BleManager;
  // Satisfy rule: also load ble-manager if needed
  require('react-native-ble-manager');
} catch (err) {
  console.warn('[BLE] Native module not available in this environment:', err);
}

export function isBLEAvailable(): boolean {
  return bleManager !== null;
}

let manager: BleManagerType | null = null;

const getManager = (): BleManagerType | null => {
  // Only supported on real native platforms
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    return null;
  }

  // Expo Go does not include the native BLE module
  if (Constants.appOwnership === "expo") {
    updateStatus(
      "Bluetooth scanning is not available in Expo Go. Please install the Saathi AI dev build or APK to use Agni Live Connect."
    );
    return null;
  }

  if (!manager) {
    if (!isBLEAvailable()) return null;
    try {
      manager = new bleManager();
    } catch (e: any) {
      updateStatus(
        `Bluetooth module is not available in this build: ${e?.message ?? "native module not found"}`
      );
      manager = null;
      return null;
    }
  }
  return manager;
};

const SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const TRANSFER_UUID = "abcdef12-3456-7890-1234-567890abcdef";

let activeDevice: Device | null = null;
let notifySub: Subscription | null = null;
let incomingBuffer = "";
let collectedData: SoilData[] = [];
let transferCount = 0;

type LogListener = (message: string) => void;
let onLog: LogListener | null = null;

let refreshUI: ((val: boolean) => void) | null = null;
let onSessionEnd: (() => void) | null = null;

export const setRefreshTrigger = (fn: (val: boolean) => void) => {
  refreshUI = fn;
};

export const setSessionEndCallback = (callback: (() => void) | null) => {
  onSessionEnd = callback;
};

export const setLogListener = (callback: LogListener | null) => {
  onLog = callback;
};

const updateStatus = (msg: string) => {
  // Silent logging - only pass to UI if listener exists
  if (onLog) onLog(msg);
};

let onDeviceDiscovered: ((device: Device) => void) | null = null;
export const setDeviceDiscoveredListener = (callback: ((device: Device) => void) | null) => {
  onDeviceDiscovered = callback;
};

export const startScanning = () => {
    updateStatus("🔍 START SCAN");
    if (!isBLEAvailable()) {
      updateStatus("Bluetooth is not available in this build. Please use the production app build to connect your Agni device.");
      return;
    }
    
    const m = getManager();
    if (!m) {
      // On unsupported environments we just log a message and exit gracefully
      return;
    }

    m.startDeviceScan(null, null, (error, device) => {
      if (error) {
        updateStatus(`Scan Error: ${error.message}`);
        return;
      }
      if (device && onDeviceDiscovered) {
        onDeviceDiscovered(device);
      }
    });
};

export const stopScanning = () => {
    const m = getManager();
    if (!m) return;
    m.stopDeviceScan();
};


export const connectDevice = async (device: Device) => {
    updateStatus("🔌 CONNECTING…");
    let d = await device.connect({ autoConnect: false });

    updateStatus("🔍 DISCOVERING SERVICES…");
    d = await d.discoverAllServicesAndCharacteristics();

    try {
        await d.requestMTU(512);
        updateStatus("📏 MTU OK");
    } catch (e) {
        // Silent MTU failure
    }

    activeDevice = d;

    d.onDisconnected((e) => {
        // Silent disconnection logging
    });

    return d;
};

const collectIncomingJson = async (json: string) => {
  try {
    const parsed = JSON.parse(json);

    // Validate basic structure
    if (!parsed.parameters || !parsed.timestamp || !parsed.location) {
      return;
    }

    const toNumber = (v: any) =>
      v === undefined || v === null || v === "" ? 0 : Number(v);

    const mapped: SoilData = {
      temp: toNumber(parsed.parameters.temperature),
      moisture: toNumber(parsed.parameters.moisture),
      nitrogen: toNumber(parsed.parameters.nitrogen),
      phosphorus: toNumber(parsed.parameters.phosphorus),
      potassium: toNumber(parsed.parameters.potassium),
      ph: toNumber(parsed.parameters.ph_value),
      conductivity: toNumber(parsed.parameters.conductivity),
      timestamp: parsed.timestamp || new Date().toISOString(),
      location: {
        latitude: toNumber(parsed.location.latitude) || 0,
        longitude: toNumber(parsed.location.longitude) || 0
      }
    };

    // Check if we have at least some valid numeric data
    const numericValues = [mapped.temp, mapped.moisture, mapped.nitrogen, mapped.phosphorus, mapped.potassium, mapped.ph, mapped.conductivity];
    if (!numericValues.some(v => !isNaN(v) && v > 0)) {
      return;
    }

    collectedData.push(mapped);

  } catch (error) {
    // Silent error handling
  }
};

const processCollectedData = async () => {
  // Filter unique by timestamp
  const uniqueData = new Map<string, SoilData>();
  for (const data of collectedData) {
    if (!uniqueData.has(data.timestamp)) {
      uniqueData.set(data.timestamp, data);
    }
  }

  const uniqueRecords = Array.from(uniqueData.values());

  for (const record of uniqueRecords) {
    await saveSoilRecord(record);
  }

  // Clear collected data after processing
  collectedData = [];
};


let isClosing = false;

export const subscribeToSoilData = async () => {
  if (!activeDevice) throw new Error("Device not connected");

  incomingBuffer = "";
  collectedData = [];
  transferCount = 0;
  isClosing = false;

  notifySub = activeDevice.monitorCharacteristicForService(
    SERVICE_UUID,
    TRANSFER_UUID,
    async (err, char) => {
      if (isClosing) return;

      if (err) {
        return;
      }

      if (!char?.value) return;
      const chunk = atob(char.value);
      incomingBuffer += chunk;

      if (incomingBuffer.includes("FILE_END")) {
        const startIdx = incomingBuffer.indexOf("{");
        const endIdx = incomingBuffer.lastIndexOf("}");

        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          const finalJson = incomingBuffer.substring(startIdx, endIdx + 1);
          
          try {
            // Parse here so collectIncomingJson receives a clean object
            await collectIncomingJson(finalJson);
          } catch (e) {
            // Silent parse error
          }
        }

        // CRITICAL: Clear everything up to the end of the current FILE_END marker
        // This prevents the "F" or filenames from leaking into the next parse
        const markerIndex = incomingBuffer.indexOf("FILE_END");
        const nextLineIndex = incomingBuffer.indexOf("\n", markerIndex);
        if (refreshUI) {
          refreshUI(true);
        }
        
        if (nextLineIndex !== -1) {
          incomingBuffer = incomingBuffer.substring(nextLineIndex + 1);
        } else {
          // If no newline, skip past the "FILE_END" and some extra buffer for filename
          incomingBuffer = incomingBuffer.substring(markerIndex + 20); 
        }
      }

      if (incomingBuffer.includes("ALL FILES TRANSFERED") || incomingBuffer.includes("TRANSFER_COMPLETE")) {
        transferCount++;
        if (transferCount < 2) {
          updateStatus(`🏁 Transfer ${transferCount} finished. Waiting for second transfer...`);
          incomingBuffer = ""; // Reset buffer for next transfer
        } else {
          updateStatus("🏁 Second transfer finished. Processing unique data...");
          await processCollectedData();
          isClosing = true;
          setTimeout(() => {
            disconnectDevice();
          }, 1000);
        }
      }
    }
  );
};

export const disconnectDevice = async () => {
  try {
    if (activeDevice) {
      const connected = await activeDevice.isConnected();
      if (connected) {
        await activeDevice.cancelConnection();
      }
    }
  } catch (e) {
    // Silent handled disconnect error
  } finally {
    activeDevice = null;
    isClosing = false;

    // Notify UI that session has ended
    if (onSessionEnd) {
      onSessionEnd();
    }
  }
};

export const startAgniSession = async (device: Device) => {
  await connectDevice(device);
  await subscribeToSoilData();
};

export const stopAgniSession = async () => {
  await disconnectDevice();
};
