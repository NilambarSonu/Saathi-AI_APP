# CLAUDE CODE FIX PROMPT — Agni BLE Data Transfer Bugs

## DIAGNOSIS FROM SESSION LOG

The device connects perfectly. The BLE protocol is running. But 4 specific bugs 
are preventing JSON files from appearing in the UI. Here is the exact root cause of each:

---

### BUG 1 — CRITICAL: BLE MTU Packet Splitting (Root cause of everything)

**Evidence from session log:**
```
"Receiving file: farmland_"      ← filename is TRUNCATED, missing "_1.json"
"Transfer complete for: farmland_1."  ← FILE_END also partially split  
"Error decoding farmland_1."     ← JSON buffer is corrupt
```

**Exact cause:**
BLE default MTU = 20 bytes per packet.
`"FILE_START:farmland_1.json"` = 26 bytes → sent as TWO separate BLE notifications:
- Packet 1: `"FILE_START:farmland_"` (20 bytes) → code detects FILE_START, filename = `"farmland_"` ❌
- Packet 2: `"1.json"` (6 bytes) → code does NOT detect as control message → appends to binary data buffer ❌

Result: `"1.json"` goes into the JSON data buffer, corrupting every single file.
When `FILE_END` arrives and the buffer is decoded → `JSON.parse("1.json{...actual json...}")` → FAILS.

**Fix:** Two-part solution:
1. Request MTU 512 immediately after `device.connect()` and BEFORE subscribing to notifications
2. Add a control message reassembly buffer as fallback for devices that don't negotiate MTU

---

### BUG 2 — Control Message Reassembly Missing

The `handleNotification` function processes each BLE packet independently.
It has no mechanism to detect that a control message was split across packets.

**Fix:** Add a `pendingControlBuffer` string that accumulates text until a complete 
control message is detected (one that ends with the closing token of FILE_START/FILE_END/TRANSFER_COMPLETE).

---

### BUG 3 — "Transfer error: Operation was cancelled"

**Exact cause:** 
`react-native-ble-plx` cancels the notification subscription when the device 
sends `TRANSFER_COMPLETE` and the firmware immediately closes the BLE connection.
The subscription callback fires one final time with an error `"Operation was cancelled"`.

This is NOT a real error — it is the normal disconnect sequence. 
The current code treats it as a fatal error, which resets state incorrectly.

**Fix:** In the notification error handler, check if transfer is already complete:
```typescript
if (error) {
  if (
    error.message?.includes('Operation was cancelled') ||
    error.message?.includes('Peripheral is disconnected') ||
    error.errorCode === BleErrorCode.OperationCancelled
  ) {
    // This is expected — device closed connection after TRANSFER_COMPLETE
    // Do NOT reset state, DO NOT show error
    log('INFO', 'Device closed connection normally after transfer');
    return;
  }
  // Only show error for unexpected disconnections
  log('ERROR', `Transfer error: ${error.message}`);
}
```

---

### BUG 4 — addFile() Not Updating UI

**Evidence:** Session log shows "Transfer complete for farmland_1" but Soil Data tab 
shows "Waiting for soil data from sensor..."

**Exact cause:** `addFile()` is called from inside the BLE notification callback, which 
runs on a background thread in react-native-ble-plx. React state updates from background 
threads do not trigger re-renders reliably without being wrapped in the UI thread.

**Fix:** Wrap all state updates inside the notification handler with `runOnJS` or 
use React Native's `InteractionManager`, or simply wrap with:
```typescript
import { runOnJS } from 'react-native-reanimated'; // if using reanimated
// OR use the simpler approach:
setTimeout(() => {
  addFile({ filename: fileName, content: fileContent });
}, 0);
// setTimeout with 0ms forces execution on the JS thread, not native thread
```

Better fix — use a ref to hold the callback and call it via a queued update:
```typescript
const addFileRef = useRef(addFile);
useEffect(() => { addFileRef.current = addFile; }, [addFile]);
// In notification handler:
setTimeout(() => addFileRef.current({ filename, content }), 0);
```

---

## THE FIXES TO IMPLEMENT — EXACT CODE CHANGES

### FIX 1: Request MTU 512 After Connection

In `AgniBluetoothManager.ts`, in the `scanAndConnect()` method, after `device.connect()` 
and BEFORE `device.discoverAllServicesAndCharacteristics()`:

```typescript
// After: this.connectedDevice = await device.connect();
// Add this BEFORE discoverAllServicesAndCharacteristics:

try {
  onStatusUpdate('Negotiating connection parameters...');
  await this.connectedDevice.requestMTU(512);
  console.log('[BLE] MTU negotiated to 512 bytes');
} catch (mtuError) {
  // MTU negotiation failing is non-fatal — continue with default MTU
  // but enable control message reassembly as fallback
  console.warn('[BLE] MTU negotiation failed, using default MTU with reassembly buffer:', mtuError);
}

// Then: await this.connectedDevice.discoverAllServicesAndCharacteristics();
```

---

### FIX 2: Add Control Message Reassembly Buffer

In `ConnectScreen.tsx` (or wherever `handleNotification` lives), add a new ref:

```typescript
// ADD this new ref alongside currentFileDataRef:
const controlMessageBufferRef = useRef<string>('');
const currentFilenameRef = useRef<string>('');
```

Replace the entire `handleNotification` function with this corrected version:

```typescript
const handleNotification = (bytes: Uint8Array) => {
  try {
    const textData = new TextDecoder('utf-8').decode(bytes);

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
        
        log('INFO', `Transfer complete for: ${fileName}`);
        setScanStatus(`Transfer complete for: ${fileName}`);

        if (currentFileDataRef.current.length === 0) {
          log('ERROR', `No data received for ${fileName}`);
          setScanStatus(`No data received for ${fileName}`);
          currentFilenameRef.current = '';
          return;
        }

        try {
          const fileContent = new TextDecoder('utf-8').decode(currentFileDataRef.current);
          
          // Validate it's real JSON before adding
          JSON.parse(fileContent); // will throw if invalid
          
          const fileToAdd = { filename: fileName, content: fileContent };
          // Use setTimeout to ensure state update runs on JS thread
          setTimeout(() => {
            addFile(fileToAdd);
          }, 0);

          log('INFO', `File ${fileName} received successfully (${currentFileDataRef.current.length} bytes)`);
          setScanStatus(`File ${fileName} received successfully`);
        } catch (decodeError: any) {
          log('ERROR', `Error decoding ${fileName}: ${decodeError.message}`);
          setScanStatus(`Error decoding file ${fileName}`);
          
          // DEBUG: Log what we actually received
          const rawContent = new TextDecoder('utf-8').decode(currentFileDataRef.current);
          console.error('[BLE] Raw buffer content (first 200 chars):', rawContent.slice(0, 200));
        }

        // Always reset buffer after FILE_END regardless of success/failure
        currentFileDataRef.current = new Uint8Array();
        currentFilenameRef.current = '';
        return;
      }
      // If .json not yet received, keep accumulating in control buffer
      return;
    }

    // ── TRANSFER_COMPLETE ────────────────────────────────────────────────────
    if (accumulated.includes('TRANSFER_COMPLETE')) {
      controlMessageBufferRef.current = ''; // reset
      log('INFO', 'All files received from device!');
      setScanStatus('All files received from device!');
      setTimeout(() => setIsScanning(false), 0);
      agniBluetoothManager.disconnect();
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
        currentFileDataRef.current = new Uint8Array(); // reset data buffer for new file
        
        log('INFO', `Receiving file: ${fileName}`);
        setScanStatus(`Receiving file: ${fileName}`);
        return;
      }
      // If .json not yet received, keep accumulating in control buffer
      return;
    }

    // ── RAW DATA ─────────────────────────────────────────────────────────────
    // Only treat as binary data if we are inside an active file transfer
    // (i.e., we received FILE_START already)
    if (currentFilenameRef.current) {
      // Reset control message buffer — this is confirmed binary data
      controlMessageBufferRef.current = '';
      
      const newBuffer = new Uint8Array(currentFileDataRef.current.length + bytes.length);
      newBuffer.set(currentFileDataRef.current);
      newBuffer.set(bytes, currentFileDataRef.current.length);
      currentFileDataRef.current = newBuffer;

      log('INFO', `Received ${bytes.length} bytes (total: ${currentFileDataRef.current.length})`);
      setScanStatus(`Received ${currentFileDataRef.current.length} bytes of file data...`);
    } else {
      // We received data but no FILE_START yet — could be a split control message
      // Keep it in the control buffer
      log('INFO', `Pre-transfer data (${bytes.length} bytes): ${textData.slice(0, 50)}`);
    }

  } catch (error: any) {
    log('ERROR', `Error processing notification: ${error.message}`);
    console.error('[BLE] Notification processing error:', error);
  }
};
```

---

### FIX 3: Handle "Operation was cancelled" Gracefully

In `AgniBluetoothManager.ts`, in `subscribeToFileTransfer()`, update the error handler:

```typescript
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
        // These are EXPECTED errors when device closes connection after transfer
        const isExpectedDisconnect = 
          error.message?.includes('Operation was cancelled') ||
          error.message?.includes('Peripheral is disconnected') ||
          error.message?.includes('disconnected') ||
          error.errorCode === 201 || // BleErrorCode.DeviceDisconnected
          error.errorCode === 205;   // BleErrorCode.OperationCancelled

        if (isExpectedDisconnect) {
          console.log('[BLE] Device closed connection normally:', error.message);
          // Do NOT call onError — this is expected behavior
          return;
        }

        // Unexpected error — report it
        onError(new Error(error.message));
        return;
      }

      if (!characteristic?.value) return;

      try {
        // Decode base64 → Uint8Array
        const bytes = new Uint8Array(Buffer.from(characteristic.value, 'base64'));
        onNotification(bytes);
      } catch (decodeErr: any) {
        console.error('[BLE] Failed to decode characteristic value:', decodeErr);
        onError(new Error(`Decode failed: ${decodeErr.message}`));
      }
    }
  );
}
```

---

### FIX 4: Ensure Buffer Polyfill is Set Up

At the very top of `AgniBluetoothManager.ts` (before any imports):

```typescript
// Buffer polyfill — MUST be first line of file
import 'react-native-get-random-values';
global.Buffer = global.Buffer || require('buffer').Buffer;
```

And install if not already installed:
```bash
npx expo install react-native-get-random-values buffer
```

Also add to your `index.js` or `App.tsx` entry point at the very top:
```typescript
import 'react-native-get-random-values';
global.Buffer = require('buffer').Buffer;
```

---

### FIX 5: Add Reset of Control Buffer on New Scan

In `handleScan()`, when starting a new scan, reset ALL buffers:

```typescript
const handleScan = async () => {
  // Reset ALL buffers at start of new scan
  currentFileDataRef.current = new Uint8Array();
  controlMessageBufferRef.current = '';  // ← ADD THIS
  currentFilenameRef.current = '';       // ← ADD THIS
  clearFiles();
  // ... rest of handleScan
};
```

---

## VERIFICATION CHECKLIST

After applying all fixes, the session log should show:

```
INFO  Bluetooth is powered on
INFO  Starting scan for Agni device...
INFO  Found device: AGNI-SOIL-SENSOR
INFO  Connecting...
INFO  Negotiating connection parameters...   ← NEW: MTU request
INFO  Discovering services...
INFO  Successfully connected to Agni device
INFO  Receiving file: farmland_1.json        ← FIXED: full filename with number
INFO  Received 847 bytes (total: 847)        ← data accumulating correctly
INFO  Transfer complete for: farmland_1.json ← FIXED: full filename
INFO  Receiving file: farmland_2.json        ← next file starts
...
INFO  All files received from device!
INFO  Device closed connection normally      ← FIXED: no "Operation was cancelled" error
```

And in the UI:
- Soil Data tab shows `farmland_1.json`, `farmland_2.json` etc. with View + Analyze buttons ✅
- No red ERROR lines in session log ✅
- Analyze button navigates to AI Chat with parsed soil data ✅

---

## DEBUG LOGGING TO ADD (Temporary — remove after fix confirmed)

Add this to `handleNotification` temporarily to see exactly what bytes arrive:

```typescript
// At the very start of handleNotification, before any processing:
console.log('[BLE RAW] Packet received:', {
  byteLength: bytes.length,
  asText: new TextDecoder().decode(bytes),
  asHex: Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ')
});
```

This will show you in Metro logs exactly what each BLE packet contains 
and whether packets are being split as diagnosed.
