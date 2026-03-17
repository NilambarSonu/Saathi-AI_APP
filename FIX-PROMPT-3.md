# SAATHI AI — FIX PROMPT #3
### For Antigravity IDE · 6 exact bugs from screenshots
**Date:** March 17, 2026  
**Rule:** Fix ONLY what is listed. Do not refactor anything else.

---

## FIX 1 — P0: History screen crashes on open

**Error from screenshot:**
```
Render Error
logs.map is not a function (it is undefined)

Call Stack: HistoryScreen
C:\Users\Asus\OneDrive\LLM_Pro...\Saathi-AI_APP\app\(app)\history.tsx
```

**Root cause:** In `app/(app)/history.tsx`, a variable called `logs` (or similar — could be `soilTests`, `testLogs`, `data`) is being called with `.map()` before the API response returns. It is `undefined` on first render because the async fetch hasn't completed yet.

**Fix:** Open `app/(app)/history.tsx`. Search for every `.map(` call. For each one, add a null/array guard:

```typescript
// FIND every pattern like this:
logs.map(...)
soilTests.map(...)
testLogs.map(...)
data.map(...)
tests.map(...)

// REPLACE with safe version:
(logs ?? []).map(...)
(soilTests ?? []).map(...)
(testLogs ?? []).map(...)
(data ?? []).map(...)
(tests ?? []).map(...)
```

**Also fix the state initialization.** Find where the state variable is declared. It must default to an empty array, never `undefined`:

```typescript
// WRONG — defaults to undefined:
const [logs, setLogs] = useState();
const [soilTests, setSoilTests] = useState();

// CORRECT — defaults to empty array:
const [logs, setLogs] = useState<any[]>([]);
const [soilTests, setSoilTests] = useState<any[]>([]);
```

**Also fix any useQuery that might return undefined:**

```typescript
// WRONG:
const { data: soilTests } = useQuery(...)
// Then soilTests.map() → crashes before data loads

// CORRECT:
const { data: soilTests = [] } = useQuery(...)
// Default value [] prevents crash during loading
```

**Verify fix:** After changes, open History tab. It must NOT crash. It should show the empty state ("No test history available" or similar) without any red screen.

---

## FIX 2 — P0: File attachment shows placeholder Alert instead of real picker

**Screenshot 4 shows:**
```
📎 Attach File
File attachment (JSON, CSV, PDF) will be available in the next update.
For now, you can describe your soil test data in the chat.
[OK]
```

This is a placeholder Alert. Replace it with the real `expo-document-picker` implementation.

**Step 1: Install if not already installed:**
```bash
npx expo install expo-document-picker expo-file-system
```

**Step 2: Find the file attachment handler in `app/(app)/chat.tsx`**

Find the function that handles the paperclip button press. It currently looks like:
```typescript
// CURRENT (wrong — just shows alert):
const handleFileAttach = () => {
  Alert.alert('📎 Attach File', 'File attachment (JSON, CSV, PDF) will be available in the next update...');
};
```

**Replace with this complete implementation:**
```typescript
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

const handleFileAttach = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/json',
        'text/csv',
        'text/plain',
        'application/pdf',
        '*/*',  // fallback to allow all if specific types fail
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) return;

    const file = result.assets[0];
    if (!file) return;

    // Read file content
    let content: any = null;
    let displayText = `📎 ${file.name}`;

    try {
      const rawText = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Try to parse as JSON (for soil data files)
      try {
        content = JSON.parse(rawText);
        displayText = `📎 Attached soil data: ${file.name}`;
      } catch {
        // Not JSON — use raw text
        content = rawText;
      }
    } catch (readErr) {
      // Can't read content — just send filename as context
      content = { fileName: file.name, note: 'File content could not be read' };
    }

    // Set attachment state so it shows preview above input bar
    setFileAttachment({
      name: file.name,
      content: content,
      uri: file.uri,
      mimeType: file.mimeType || 'unknown',
    });

  } catch (err: any) {
    if (err.code !== 'DOCUMENT_PICKER_CANCELED') {
      Alert.alert('Error', 'Could not open file. Please try again.');
    }
  }
};
```

**Step 3: Update the fileAttachment state type** if TypeScript complains:
```typescript
const [fileAttachment, setFileAttachment] = useState<{
  name: string;
  content: any;
  uri?: string;
  mimeType?: string;
} | null>(null);
```

**Step 4: Show file preview above input bar.** Find where the input bar is rendered. Add the preview just above it:
```typescript
{/* File attachment preview — shows when file is selected */}
{fileAttachment && (
  <View style={{
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#C8E6D0',
  }}>
    <Text style={{ fontSize: 16, marginRight: 8 }}>📎</Text>
    <Text style={{
      flex: 1, fontFamily: 'Sora_500Medium',
      fontSize: 13, color: '#1A5C35',
    }} numberOfLines={1}>
      {fileAttachment.name}
    </Text>
    <TouchableOpacity onPress={() => setFileAttachment(null)}>
      <Text style={{ fontSize: 18, color: '#6B8A72', padding: 4 }}>✕</Text>
    </TouchableOpacity>
  </View>
)}
```

**Step 5: When send button is pressed with an attachment,** send the file content to the AI via `/api/analyze-soil-file` endpoint:
```typescript
const handleSend = async (text?: string) => {
  const messageText = text || inputText.trim();

  // Handle file attachment first
  if (fileAttachment && !messageText) {
    const userMsg = {
      id: Date.now().toString(),
      text: `📎 Analyzing: ${fileAttachment.name}`,
      sender: 'user' as const,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setFileAttachment(null);
    setIsLoading(true);

    try {
      const response = await fetch('https://saathiai.org/api/analyze-soil-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await SecureStore.getItemAsync('saathi_token')}`,
        },
        body: JSON.stringify({
          soilData: fileAttachment.content,
          language: language,
          fileName: fileAttachment.name,
        }),
      });
      const data = await response.json();
      const aiMsg = {
        id: Date.now().toString() + '-ai',
        text: data.response || 'Analysis complete.',
        sender: 'ai' as const,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
      if (data.sessionId) setSessionId(data.sessionId);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '-err',
        text: '❌ Could not analyze file. Please try again.',
        sender: 'ai' as const,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
    return;
  }

  // ... rest of existing send logic for text messages
};
```

---

## FIX 3 — P0: Voice mic shows placeholder Alert instead of real speech-to-text

**Screenshot 5 shows:**
```
🎤 Voice Input
Voice input will be available in the next update. Please type your question.
[OK]
```

Replace with real voice recording using `expo-av`.

**Step 1: Install:**
```bash
npx expo install expo-av expo-speech
```

**Step 2: Add mic permission to app.json:**
```json
{
  "expo": {
    "plugins": [
      ["expo-av", {
        "microphonePermission": "Allow Saathi AI to access your microphone for voice questions."
      }]
    ]
  }
}
```

**Step 3: Find the mic button handler in `app/(app)/chat.tsx`.** Currently looks like:
```typescript
// CURRENT (wrong):
const handleVoiceInput = () => {
  Alert.alert('🎤 Voice Input', 'Voice input will be available in the next update...');
};
```

**Replace with:**
```typescript
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

const [isRecording, setIsRecording] = useState(false);
const recordingRef = useRef<Audio.Recording | null>(null);

const handleVoiceInput = async () => {
  // If currently playing TTS, stop it
  Speech.stop();

  if (isRecording) {
    // Stop recording
    try {
      setIsRecording(false);
      await recordingRef.current?.stopAndUnloadAsync();

      // For now: show a message that transcription is being processed
      // Full STT requires a cloud API — for now we provide a UX placeholder
      // that at least stops the crash and provides useful feedback
      setInputText(prev =>
        prev + (prev ? ' ' : '') + '[Voice recorded — tap send to ask your question]'
      );
    } catch (err) {
      console.error('[Voice] Stop error:', err);
    }
    return;
  }

  // Start recording
  try {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Microphone Permission',
        'Please enable microphone access in Settings to use voice input.',
        [{ text: 'OK' }]
      );
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;
    setIsRecording(true);

    // Auto-stop after 10 seconds
    setTimeout(async () => {
      if (isRecording) {
        await handleVoiceInput();
      }
    }, 10000);

  } catch (err: any) {
    console.error('[Voice] Start error:', err);
    Alert.alert('Voice Error', 'Could not start recording. Please check microphone permissions.');
  }
};
```

**Step 4: Update the mic button to show recording state:**
```typescript
{/* Mic button — changes appearance when recording */}
<TouchableOpacity
  style={[
    styles.inputIconBtn,
    isRecording && { backgroundColor: '#FFE0E0', borderWidth: 2, borderColor: '#E53935' }
  ]}
  onPress={handleVoiceInput}
>
  <Text style={{ fontSize: 20 }}>
    {isRecording ? '⏹' : '🎤'}
  </Text>
</TouchableOpacity>
```

**Note for developer (Sonu):** Full speech-to-text requires either Google Cloud Speech-to-Text API or a device-native solution. The implementation above handles the mic permission, recording start/stop, and visual feedback. To complete STT, add your Gemini/Google Speech API key to process the audio file after recording stops.

---

## FIX 4 — P2: "Quick Start Guide" header duplicated on Connect screen

**Screenshot 2 shows:** "Quick Start Guide" appears twice, one above the other.

**File:** `app/(app)/connect.tsx` (or wherever the Live Connect screen lives)

Search for `Quick Start Guide` text in the file. You will find it twice:
1. Once as a standalone `<Text>` element (the duplicate)
2. Once inside the guide card component or inline JSX

**Delete one.** Keep only the version that is inside the card container. The final render should show "Quick Start Guide" exactly once.

---

## FIX 5 — P2: Connect button is purple, should be brand green

**Screenshot 2 shows:** The "CONNECT" button has a purple/indigo background color.

**File:** `app/(app)/connect.tsx`

Search for the scan/connect button style. Find the `backgroundColor` that is causing purple:

```typescript
// FIND — any of these purple values:
backgroundColor: '#7C3AED'
backgroundColor: '#6B3FB5'
backgroundColor: 'purple'
backgroundColor: '#8B5CF6'
backgroundColor: '#4F46E5'
// Or any similar purple hex

// REPLACE with brand green:
backgroundColor: '#1A5C35'
```

Also check if there's a Lottie animation file being used for the Bluetooth icon that has purple coloring. If the BLE radar circle is purple, find its color:
```typescript
// BLE radar ring color — change from purple to green:
borderColor: 'rgba(26, 92, 53, 0.4)'   // was purple rgba
backgroundColor: '#E8F5EE'              // was purple tint
```

The center Bluetooth icon background should also be green:
```typescript
// Center dot/circle:
backgroundColor: '#1A5C35'  // not purple
```

---

## FIX 6 — P3: "CONNECTING" text overflows Agni card on Home screen

**Screenshot 1 shows:** The Agni Connect card has "CONNECTIN G" text in amber/orange that is cut off and overflowing outside the card bounds.

**File:** `app/(app)/dashboard.tsx` (or home.tsx)

Find the Agni Connect card. There is likely a conditional status text that shows "CONNECTING" when BLE is in progress. It's styled with `overflow: 'visible'` or is positioned absolutely without proper containment.

**Fix:**
```typescript
// Find the status text — likely something like:
<Text style={agniStyles.statusText}>CONNECTING</Text>

// Fix the style — add numberOfLines and overflow containment:
<Text
  style={agniStyles.statusText}
  numberOfLines={1}          // prevent line wrapping
  ellipsizeMode="tail"       // truncate with ... if too long
>
  CONNECTING
</Text>

// Fix the container style:
agniCard: {
  // ... existing styles ...
  overflow: 'hidden',        // ADD THIS — clips children to card bounds
},
statusText: {
  fontFamily: 'Sora_700Bold',
  fontSize: 10,
  color: '#F4A02D',          // amber color
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  // Remove any position: 'absolute' that causes overflow
}
```

**Also:** The status should only show when actually connecting (not always visible). Add a condition:
```typescript
{connectionStatus === 'connecting' && (
  <Text style={agniStyles.statusText} numberOfLines={1}>
    CONNECTING...
  </Text>
)}
```

---

## VERIFICATION CHECKLIST

After all 6 fixes:

```
Fix 1 — History:
  [ ] History tab opens without crashing
  [ ] Shows empty state when no data (not red error screen)
  [ ] Shows test logs when data exists

Fix 2 — File Attach:
  [ ] Tapping 📎 opens device file picker (not Alert dialog)
  [ ] Can select JSON, CSV, or PDF files
  [ ] Selected file shows preview above input bar with ✕ dismiss button
  [ ] Sending with attachment calls /api/analyze-soil-file

Fix 3 — Voice Mic:
  [ ] Tapping 🎤 requests microphone permission (not Alert dialog)
  [ ] If permission denied: shows Settings prompt
  [ ] If permission granted: button turns red ⏹ to indicate recording
  [ ] Tapping ⏹ stops recording
  [ ] Does NOT show "Voice input will be available in next update" alert

Fix 4 — Duplicate Guide:
  [ ] "Quick Start Guide" appears exactly ONCE on Connect screen

Fix 5 — Button Color:
  [ ] CONNECT button is #1A5C35 (brand green), not purple
  [ ] BLE radar circle is green-tinted, not purple

Fix 6 — Card Overflow:
  [ ] "CONNECTING" text fits inside card without overflow
  [ ] Status text only shows when actually in connecting state
```

---

## DO NOT TOUCH

Everything else is working correctly from screenshots:
- Home screen layout, header, greeting, stats ✅
- Agni Connect card structure ✅
- Testing Speed comparison card ✅
- Saathi Features list ✅
- How It Works section ✅
- Awards ticker ✅
- Liquid glass tab bar (5 tabs) ✅
- AI Chat welcome screen ✅
- AI Chat input bar (paperclip + text + mic visible) ✅
- Live Connect BLE radar circle ✅
- Live Connect Quick Start steps content ✅

---

*Fix Prompt #3 · Mitti-AI Innovations · March 17, 2026*  
*6 targeted fixes — History crash, File attach, Voice mic, Duplicate header, Button color, Card overflow*
