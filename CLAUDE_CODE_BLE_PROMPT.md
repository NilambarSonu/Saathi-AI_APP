# CLAUDE CODE PROMPT — Agni Soil Sensor BLE Implementation for React Native / Expo

## CONTEXT
I am migrating a fully working Web Bluetooth implementation from my website (saathiai.org) to a 
React Native / Expo mobile app. The web version works perfectly with zero errors. Your job is to 
port the EXACT same logic, protocol, and data flow to React Native using `react-native-ble-plx`.

Do NOT invent new logic. Do NOT change the BLE protocol. Port it faithfully.

---

## DEVICE SPECIFICATION (Agni Soil Sensor — Do Not Change These)

### Device Name
- Advertised name: `AGNI-SOIL-SENSOR`
- Also matches: prefix `Agni-` (e.g. `Agni-01`)

### UUIDs — EXACT, DO NOT CHANGE
```
AGNI_SERVICE_UUID         = '4fafc201-1fb5-459e-8fcc-c5c9c331914b'   // Direct single read
AGNI_CHARACTERISTIC_UUID  = '6d68efe5-04b6-4a85-abc4-c2670b7bf7fd'   // Direct single read

FILE_SERVICE_UUID         = '12345678-1234-1234-1234-123456789abc'    // File transfer service
FILE_CHAR_UUID            = 'abcdef12-3456-7890-1234-567890abcdef'    // Notification char (incoming data)

COMMAND_SERVICE_UUID      = '12345678-1234-1234-1234-123456789abc'    // Same as FILE_SERVICE_UUID
COMMAND_CHARACTERISTIC_UUID = 'abcdef13-3456-7890-1234-567890abcdef' // Write char (outgoing commands)
```

### BLE File Transfer Protocol (chunked notification protocol)
The device sends data as BLE notifications in multiple small packets. The protocol is:

1. First packet: `FILE_START:filename.json`  → begin buffering
2. Middle packets: raw binary bytes          → append each to Uint8Array buffer
3. Last packet: `FILE_END:filename.json`     → decode buffer to UTF-8 string, create file object
4. Final packet: `TRANSFER_COMPLETE`         → all files done, disconnect

### Command Protocol (SD card format)
Write string `CLEAR_FARMLAND_DATA` to COMMAND_CHARACTERISTIC_UUID to wipe device storage.

### Parsed JSON structure from device
Each received file decodes to JSON with this shape:
```json
{
  "pH": "5.2",
  "N": "25.3",
  "P": "15.1",
  "K": "35.8",
  "moisture": "18.4",
  "temperature": "24.1",
  "EC": "2.8",
  "location": { "lat": "20.2961", "lng": "85.8245" },
  "deviceId": "Agni-01",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## WHAT TO BUILD — 5 FILES

### FILE 1: `src/features/ble/AgniBluetoothManager.ts`

A singleton class that wraps `react-native-ble-plx`. This is the direct equivalent of the 
web `BluetoothManager` class. Must implement:

```typescript
class AgniBluetoothManager {
  // State
  private manager: BleManager              // react-native-ble-plx BleManager instance
  private connectedDevice: Device | null   // currently connected BLE device
  private reconnectAttempts: number        // current reconnect count
  private readonly maxReconnectAttempts = 3
  private readingHistory: BluetoothSoilData[]
  private readonly maxHistorySize = 100
  private cachedReading: { data: BluetoothSoilData; timestamp: number } | null
  private readonly cacheValidityMs = 30000
  private readCount: number
  private errorCount: number
  private lastError: Error | null
  private notificationSubscription: Subscription | null  // BLE notification subscription

  // Required methods (exact equivalents of web version):
  async checkBluetoothState(): Promise<boolean>
  // Checks if BLE is powered on. On Android checks permissions too.
  // Returns true if ready to use.

  async scanAndConnect(
    onDeviceFound: (deviceName: string) => void,
    onStatusUpdate: (msg: string) => void
  ): Promise<Device>
  // Scans for devices matching name 'AGNI-SOIL-SENSOR' or prefix 'Agni-'
  // Calls onDeviceFound when a matching device is discovered
  // Stops scan after first match, connects, discovers all services/characteristics
  // Calls onStatusUpdate at each phase ('Scanning...', 'Connecting...', 'Discovering services...')
  // Has CONNECTION_TIMEOUT of 10000ms
  // On failure: retries up to maxReconnectAttempts with 1s delay between attempts

  async subscribeToFileTransfer(
    onNotification: (data: Uint8Array) => void,
    onError: (err: Error) => void
  ): Promise<void>
  // Subscribes to BLE notifications on FILE_CHAR_UUID within FILE_SERVICE_UUID
  // Each notification: decode base64 → Uint8Array → call onNotification(bytes)
  // Stores subscription in this.notificationSubscription

  async sendCommand(command: string): Promise<void>
  // Encodes command string to base64
  // Writes to COMMAND_CHARACTERISTIC_UUID within COMMAND_SERVICE_UUID
  // Uses writeCharacteristicWithResponseForService

  async readSoilDataDirect(): Promise<BluetoothSoilData>
  // One-shot read from AGNI_CHARACTERISTIC_UUID within AGNI_SERVICE_UUID
  // Decode base64 value → UTF-8 string → JSON.parse
  // Map: pH→ph, N→nitrogen, P→phosphorus, K→potassium, moisture, temperature, EC→ec, location
  // All values via parseNumericValue() (handles null, undefined, NaN)
  // Has READ_TIMEOUT of 5000ms
  // Updates cache and history on success

  async disconnect(): Promise<void>
  // Stops notification subscription
  // Cancels device connection
  // Resets connectedDevice, reconnectAttempts

  isConnected(): boolean
  getDeviceName(): string
  getCachedReading(): BluetoothSoilData | null  // returns null if cache expired (>30s)
  getReadingHistory(): BluetoothSoilData[]
  clearHistory(): void
  getConnectionMetrics(): { readCount, errorCount, successRate, lastError, isConnected, deviceName }

  private parseNumericValue(value: any, fallback = 0): number
  private updateCache(data: BluetoothSoilData): void
  private addToHistory(data: BluetoothSoilData): void

  destroy(): void
  // Cancel scan, disconnect, clear all state, destroy BleManager
}

export const agniBluetoothManager = new AgniBluetoothManager();
```

**CRITICAL React Native BLE differences from Web API:**
- `react-native-ble-plx` uses base64 for all characteristic values — ALWAYS decode from base64
- Use `manager.startDeviceScan(null, { allowDuplicates: false }, callback)` for scanning
- Use `device.discoverAllServicesAndCharacteristics()` BEFORE accessing any service/char
- Use `device.monitorCharacteristicForService(serviceUUID, charUUID, (error, char) => {})` for notifications
- Use `device.writeCharacteristicWithResponseForService(serviceUUID, charUUID, base64Value)` for writes
- Use `device.readCharacteristicForService(serviceUUID, charUUID)` for one-shot reads
- Import `{ BleManager, Device, Subscription, State }` from `react-native-ble-plx`
- `manager.onStateChange((state) => {...}, true)` to monitor BLE state changes

---

### FILE 2: `src/features/ble/useBluetooth.ts`

React hook. Direct equivalent of the web `use-bluetooth.ts`. 
Uses `agniBluetoothManager` singleton.

```typescript
interface ConnectionStatus {
  status: 'idle' | 'scanning' | 'connecting' | 'connected' | 'transferring' | 'complete' | 'error';
  message: string;
  subMessage: string;
  progress?: number;
  deviceName?: string;
}

export function useBluetooth() {
  // State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'idle',
    message: 'Ready to Connect',
    subMessage: 'Tap below to scan for Agni device'
  });
  const [soilData, setSoilData] = useState<BluetoothSoilData | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  // Methods
  const checkPermissions: () => Promise<boolean>
  // Android: request BLUETOOTH_SCAN, BLUETOOTH_CONNECT, ACCESS_FINE_LOCATION
  // iOS: no explicit permission request needed (handled by Info.plist)
  // Uses react-native PermissionsAndroid API
  // Updates isSupported state
  
  const connect: () => Promise<Device>
  // 1. Calls checkPermissions()
  // 2. Sets status → 'scanning'
  // 3. Calls agniBluetoothManager.scanAndConnect(...)
  // 4. Updates status through scanning → connecting → connected phases
  // 5. On error: sets status → 'error' with error message

  const readData: () => Promise<BluetoothSoilData>
  // Calls agniBluetoothManager.readSoilDataDirect()
  // Sets status → 'transferring' with simulated progress (0→100% over ~2s)
  // Sets status → 'complete' with data
  // Calls setSoilData(data)

  const disconnect: () => Promise<void>
  // Calls agniBluetoothManager.disconnect()
  // Resets status to idle, clears soilData

  const reset: () => void
  // Resets status to idle, clears soilData

  // Cleanup on unmount
  useEffect(() => {
    return () => { agniBluetoothManager.disconnect(); }
  }, []);

  return {
    connectionStatus, soilData, isSupported,
    connect, readData, disconnect, reset,
    isConnected: agniBluetoothManager.isConnected()
  };
}
```

---

### FILE 3: `src/features/ble/LiveDataContext.tsx`

Global context. Port of `client/src/contexts/LiveDataContext.tsx`.
Stores files received from device during session so ConnectScreen and other screens share data.

```typescript
interface ReceivedFile {
  filename: string;
  content: string;     // decoded UTF-8 JSON string
}

interface LiveDataContextType {
  receivedFiles: ReceivedFile[];
  addFile: (file: ReceivedFile) => void;
  clearFiles: () => void;
}
```

Wrap the app with `<LiveDataProvider>` in the root layout.

---

### FILE 4: `src/features/ble/ConnectScreen.tsx`

Main screen. Direct equivalent of `client/src/pages/connect.tsx`.
This is the MOST IMPORTANT FILE — matches the exact protocol and UI states.

**State:**
```typescript
const [scanStatus, setScanStatus] = useState('Ready to Connect');
const [isScanning, setIsScanning] = useState(false);
const [isFormatting, setIsFormatting] = useState(false);
const currentFileDataRef = useRef<Uint8Array>(new Uint8Array()); // chunked data buffer
const { receivedFiles, addFile, clearFiles } = useLiveData();
```

**handleNotification(bytes: Uint8Array) — EXACT PROTOCOL PORT:**
```
Port handleNotification from connect.tsx EXACTLY:

const textData = decode bytes as UTF-8 string

if textData starts with "FILE_END:":
  fileName = textData.split(":")[1].trim()
  setScanStatus(`Transfer complete for: ${fileName}`)
  if currentFileDataRef.current.length === 0:
    setScanStatus(`No data received for ${fileName}`)
    return
  fileContent = decode currentFileDataRef.current as UTF-8 string
  addFile({ filename: fileName, content: fileContent })
  show Toast: "File Received! Successfully downloaded ${fileName}"
  setScanStatus(`File ${fileName} received successfully`)
  currentFileDataRef.current = new Uint8Array()   // reset buffer

else if textData starts with "TRANSFER_COMPLETE":
  setScanStatus("All files received from device!")
  setIsScanning(false)
  await agniBluetoothManager.disconnect()
  show Toast: "Transfer Complete - All files downloaded"

else if textData starts with "FILE_START:":
  setScanStatus(`Receiving file: ${textData.split(":")[1].trim()}`)
  // DO NOT add to buffer

else:
  // Raw binary data — append to buffer
  newBuffer = new Uint8Array(currentFileDataRef.current.length + bytes.length)
  newBuffer.set(currentFileDataRef.current)
  newBuffer.set(bytes, currentFileDataRef.current.length)
  currentFileDataRef.current = newBuffer
  setScanStatus(`Received ${bytes.length} bytes of file data...`)
```

**handleScan():**
```
1. checkPermissions() — Android BLE permissions
2. setIsScanning(true), clearFiles(), setScanStatus('Scanning for AGNI-SOIL-SENSOR...')
3. agniBluetoothManager.scanAndConnect(
     onDeviceFound: (name) => setScanStatus(`Device found: ${name}. Connecting...`),
     onStatusUpdate: (msg) => setScanStatus(msg)
   )
4. If device.name !== 'AGNI-SOIL-SENSOR':
     show Toast: "Wrong Device - Please select AGNI-SOIL-SENSOR"
     setIsScanning(false); disconnect(); return
5. setScanStatus('Connected! Discovering services...')
6. agniBluetoothManager.subscribeToFileTransfer(handleNotification, onError)
7. setScanStatus('Ready to receive files. Waiting for device...')
8. Set 30-second timeout: if still scanning → disconnect, setScanStatus('Timeout'), setIsScanning(false)
9. On any error: setScanStatus(error.message), setIsScanning(false), show Toast error
```

**handleAnalyze(file: ReceivedFile):**
```
const soilData = JSON.parse(file.content)
Navigate to the AI Chat/Analysis screen, passing soilData as navigation param
Use React Navigation: navigation.navigate('Chat', { soilDataToAnalyze: soilData, fileName: file.filename })
```

**handleFormat():**
```
1. checkPermissions()
2. setIsFormatting(true)
3. Scan and connect same as handleScan()
4. Verify device name === 'AGNI-SOIL-SENSOR'
5. agniBluetoothManager.sendCommand('CLEAR_FARMLAND_DATA')
6. Show Toast: "Format Complete - SD card farmland data cleared"
7. Disconnect
8. setIsFormatting(false)
```

**UI Structure (React Native equivalent of web UI):**
```
<ScrollView>
  <Text>Live Connect</Text>
  <Text>Connect to your Agni device and transfer soil data</Text>

  {/* Connection Panel */}
  <View>
    <Text>Device Connection</Text>
    <TouchableOpacity onPress={showDangerZone}>  {/* Info button */}
      <InfoIcon />
    </TouchableOpacity>

    {/* Bluetooth animation — use LottieView */}
    <LottieView source={require('../../assets/animations/Bluetooth.json')} autoPlay loop />

    <Text>{scanStatus}</Text>

    {/* Quick Start Guide — show only when not scanning */}
    {!isScanning && (
      <View>
        <Text>Quick Start Guide</Text>
        <Text>1. Tap "Scan for Agni Device"</Text>
        <Text>2. Select AGNI-SOIL-SENSOR from the list</Text>
        <Text>3. Wait — files transfer automatically!</Text>
      </View>
    )}

    <TouchableOpacity onPress={handleScan} disabled={isScanning}>
      {isScanning ? <ActivityIndicator /> : <BluetoothIcon />}
      <Text>{isScanning ? 'Scanning...' : 'Scan for Agni Device'}</Text>
    </TouchableOpacity>
  </View>

  {/* Soil Analysis Data Panel */}
  <View>
    <Text>Soil Analysis Data</Text>
    {receivedFiles.length > 0 ? (
      receivedFiles.map((file, index) => (
        <View key={index}>
          <FileJsonIcon />
          <Text>{file.filename}</Text>
          <TouchableOpacity onPress={() => showFileContent(file)}>
            <EyeIcon />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleAnalyze(file)}>
            <Text>Analyze</Text>
          </TouchableOpacity>
        </View>
      ))
    ) : (
      <View>
        <LottieView source={require('../../assets/animations/soil-analysis-data.json')} autoPlay loop />
        <Text>Waiting for Data...</Text>
        <Text>Connect to your Agni device to start transferring soil analysis reports.</Text>
      </View>
    )}
  </View>

  {/* Danger Zone Modal */}
  <Modal visible={showDangerModal}>
    <Text>⚠️ Danger Zone</Text>
    <Text>This permanently deletes all farmland data from the SD card. Cannot be undone!</Text>
    <TouchableOpacity onPress={handleFormat} disabled={isFormatting}>
      <TrashIcon />
      <Text>{isFormatting ? 'Formatting...' : 'Format SD Card'}</Text>
    </TouchableOpacity>
  </Modal>
</ScrollView>
```

---

### FILE 5: `src/features/ble/types.ts`

Port of `client/src/types/soil-data.ts`. Keep identical TypeScript interfaces:
- `BluetoothSoilData` (ph, nitrogen, phosphorus, potassium, moisture, temperature, ec, timestamp, rawBluetoothData?, location?)
- `ConnectionStatus` (status union, message, subMessage, progress?, deviceName?)
- `SoilData` (full DB model with pricing fields)

---

## INSTALLATION REQUIREMENTS

Add these to `package.json` and run install:
```json
"react-native-ble-plx": "^3.2.1",
"lottie-react-native": "^6.x"
```

For Expo bare workflow:
```bash
npx expo install react-native-ble-plx lottie-react-native
```

---

## PERMISSIONS — MUST ADD

### Android — `android/app/src/main/AndroidManifest.xml`
```xml
<!-- BLE permissions — REQUIRED or app crashes silently -->
<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-feature android:name="android.hardware.bluetooth_le" android:required="true" />
```

### iOS — `ios/[AppName]/Info.plist`
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Saathi AI needs Bluetooth to connect to your Agni soil sensor and transfer soil test data.</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Saathi AI needs Bluetooth to connect to your Agni soil sensor.</string>
```

### Runtime Permission Request (Android only — add to AgniBluetoothManager or useBluetooth)
```typescript
import { PermissionsAndroid, Platform } from 'react-native';

async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  
  const apiLevel = parseInt(Platform.Version as string, 10);
  
  if (apiLevel < 31) {
    // Android 11 and below
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  
  // Android 12+
  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ]);
  
  return (
    results['android.permission.BLUETOOTH_SCAN'] === 'granted' &&
    results['android.permission.BLUETOOTH_CONNECT'] === 'granted' &&
    results['android.permission.ACCESS_FINE_LOCATION'] === 'granted'
  );
}
```

---

## KEY DIFFERENCES: Web Bluetooth API → react-native-ble-plx

| Web API | react-native-ble-plx |
|---------|---------------------|
| `navigator.bluetooth.requestDevice()` | `manager.startDeviceScan(null, options, callback)` — manual scan loop |
| `device.gatt.connect()` | `device.connect()` then `device.discoverAllServicesAndCharacteristics()` |
| `service.getCharacteristic(uuid)` | Already available after discoverAllServicesAndCharacteristics |
| `characteristic.startNotifications()` + `addEventListener` | `device.monitorCharacteristicForService(svcUUID, charUUID, (err, char) => {})` |
| `characteristic.readValue()` → `DataView` | `device.readCharacteristicForService(svcUUID, charUUID)` → `char.value` (base64 string) |
| `characteristic.writeValue(ArrayBuffer)` | `device.writeCharacteristicWithResponseForService(svcUUID, charUUID, base64String)` |
| `new TextDecoder().decode(buffer)` | `Buffer.from(base64, 'base64').toString('utf-8')` OR `atob(base64)` |
| `new TextEncoder().encode(string)` → base64 | `Buffer.from(string, 'utf-8').toString('base64')` OR `btoa(string)` |
| `device.name` | `device.name` (same) |
| Auto device picker UI | Must build own device list UI |
| `gattserverdisconnected` event | `device.onDisconnected((error, device) => {})` |

---

## ERROR HANDLING REQUIREMENTS

Handle these specific errors gracefully with user-friendly messages:

| Error | User Message |
|-------|-------------|
| BLE not powered on | "Please turn on Bluetooth" |
| Permissions denied | "Bluetooth permission is required. Please enable in Settings" |
| No device found in scan timeout (15s) | "AGNI-SOIL-SENSOR not found nearby. Make sure device is powered on" |
| Wrong device selected | "Please select the AGNI-SOIL-SENSOR device" |
| Connection timeout (10s) | "Connection timed out. Please try again" |
| GATT service not found | "Device found but services not available. Ensure firmware is up to date" |
| Device disconnected mid-transfer | "Device disconnected during transfer. Please try again" |
| Empty data buffer on FILE_END | "No data received for this file" |
| JSON parse failure | "Received file is not valid JSON and cannot be analyzed" |

---

## SIMULATION MODE (for testing without physical device)

Add a `simulateTransfer()` method to AgniBluetoothManager:

```typescript
async simulateTransfer(onNotification: (data: Uint8Array) => void): Promise<void> {
  const encoder = new TextEncoder();
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
  
  const simulatedJSON = JSON.stringify({
    pH: "5.2", N: "25.3", P: "15.1", K: "35.8",
    moisture: "18.4", temperature: "24.1", EC: "2.8",
    location: { lat: "20.2961", lng: "85.8245" },
    deviceId: "Agni-01-SIM",
    timestamp: new Date().toISOString()
  });

  await delay(500);
  onNotification(encoder.encode("FILE_START:farmland_001.json"));
  
  await delay(300);
  // Send data in chunks (simulate BLE MTU limits)
  const chunkSize = 20;
  for (let i = 0; i < simulatedJSON.length; i += chunkSize) {
    onNotification(encoder.encode(simulatedJSON.slice(i, i + chunkSize)));
    await delay(100);
  }
  
  await delay(300);
  onNotification(encoder.encode("FILE_END:farmland_001.json"));
  
  await delay(500);
  onNotification(encoder.encode("TRANSFER_COMPLETE"));
}
```

In `ConnectScreen.tsx`, add a "Simulate" button visible only in `__DEV__` mode that calls this instead of real scan.

---

## FILE STRUCTURE TO CREATE

```
src/
  features/
    ble/
      AgniBluetoothManager.ts   ← Core BLE logic (singleton)
      useBluetooth.ts            ← React hook  
      ConnectScreen.tsx          ← UI screen
      LiveDataContext.tsx        ← Global state
      types.ts                   ← TypeScript interfaces
```

---

## CRITICAL RULES

1. **DO NOT change any UUID** — they must match the firmware exactly
2. **DO NOT change the protocol** — FILE_START/FILE_END/TRANSFER_COMPLETE logic must be byte-identical
3. **The byte buffer accumulation logic is CRITICAL** — each BLE notification is a chunk, they must be appended in order into `currentFileDataRef.current` (Uint8Array)
4. **Always decode base64 → bytes before processing** in react-native-ble-plx
5. **Always encode string → base64 before writing** to any characteristic
6. **Discover all services/characteristics BEFORE any read/write/monitor** call
7. **Handle the BLE manager lifecycle** — create once at app start, destroy on app close
8. **Add `Buffer` polyfill** if needed: `import 'react-native-get-random-values'` and `global.Buffer = require('buffer').Buffer`

---

## SUCCESS CRITERIA

The implementation is correct when:
- [ ] Android app requests BLE permissions on first launch
- [ ] Scan button discovers `AGNI-SOIL-SENSOR` device
- [ ] Wrong device shows error toast and resets
- [ ] After connection, device automatically starts sending files
- [ ] Each file appears in the list as it completes (not after all files)
- [ ] `FILE_START` → `raw bytes` → `FILE_END` protocol correctly assembles JSON
- [ ] `TRANSFER_COMPLETE` disconnects and shows success
- [ ] Received files show filename + View + Analyze buttons
- [ ] Analyze navigates to Chat screen with parsed soil data as navigation param
- [ ] Format SD card sends `CLEAR_FARMLAND_DATA` command and shows success
- [ ] Simulation mode works in `__DEV__` without physical device
- [ ] No memory leaks — subscriptions cleaned up on component unmount
