# SAATHI AI — FOCUSED FIX PROMPT #2
### For Antigravity IDE · Stitch MCP Required for Map Fix
**Fixes:** 4 targeted issues — do not touch anything else

---

## CRITICAL RULE

**Read each fix completely before touching any file.**  
Do not refactor. Do not redesign. Fix only what is listed.  
The home screen, connect screen, and onboarding are working — do not modify them.

---

## FIX 1 — AI CHAT: Input bar completely missing

**Severity:** P0 — core feature broken, users cannot type anything  
**Screen:** AI Chat tab  
**Problem:** The chat input bar (text field + mic + send button + attachment) is missing entirely from the bottom of the screen. The welcome state shows correctly but there is nowhere to type.

### Root cause to investigate first

Open `app/(app)/chat.tsx` (or wherever the AI chat screen lives).  
Look for the input bar component. It is likely one of these problems:

**Cause A:** The `KeyboardAvoidingView` or `View` containing the input bar has `display: 'none'` or `height: 0` somewhere.

**Cause B:** The input bar is rendered but outside the visible scroll area — the parent container has `flex: 1` missing so the content takes full height and pushes the input off screen.

**Cause C:** The input bar is conditionally rendered only when `messages.length > 0` — so on the welcome/empty state it never shows.

**Fix for Cause C (most likely):** Find code like this:
```typescript
// WRONG — hides input on welcome screen:
{messages.length > 0 && (
  <ChatInputBar ... />
)}

// CORRECT — always show input bar:
<ChatInputBar ... />
```

**Fix for Cause B:** The screen layout must follow this exact structure:

```typescript
// CORRECT screen layout structure:
<SafeAreaView style={{ flex: 1, backgroundColor: '#F7F9F7' }}>
  
  {/* Fixed header */}
  <ChatHeader />

  {/* Scrollable messages area — MUST have flex: 1 */}
  <ScrollView
    style={{ flex: 1 }}               // ← this is critical
    contentContainerStyle={{ flexGrow: 1, padding: 16 }}
    ref={scrollRef}
    onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
  >
    {messages.length === 0 ? <WelcomeState /> : <MessageList />}
  </ScrollView>

  {/* Input bar — ALWAYS rendered, never conditional */}
  <ChatInputBar
    value={inputText}
    onChangeText={setInputText}
    onSend={handleSend}
    onMic={handleVoiceInput}
    onAttach={handleFileAttach}
    isLoading={isAITyping}
  />

</SafeAreaView>
```

### Build the ChatInputBar component (if missing or broken)

If the component doesn't exist at all, create it now inline in the chat screen:

```typescript
// ChatInputBar — add this as a component in the chat screen file

function ChatInputBar({
  value,
  onChangeText,
  onSend,
  onMic,
  onAttach,
  isLoading,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onMic: () => void;
  onAttach: () => void;
  isLoading: boolean;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={inputBarStyles.container}>
        {/* Attachment button */}
        <TouchableOpacity
          style={inputBarStyles.iconBtn}
          onPress={onAttach}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 20 }}>📎</Text>
        </TouchableOpacity>

        {/* Text input */}
        <TextInput
          style={inputBarStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="Type your farming question..."
          placeholderTextColor="#B0C4B8"
          multiline
          maxHeight={100}
          returnKeyType="send"
          onSubmitEditing={onSend}
          editable={!isLoading}
          fontFamily="Sora_400Regular"
          fontSize={13}
          color="#1A2E1E"
        />

        {/* Mic button */}
        <TouchableOpacity
          style={inputBarStyles.iconBtn}
          onPress={onMic}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 20 }}>🎤</Text>
        </TouchableOpacity>

        {/* Send button */}
        <TouchableOpacity
          style={[
            inputBarStyles.sendBtn,
            (!value.trim() || isLoading) && inputBarStyles.sendBtnDisabled,
          ]}
          onPress={onSend}
          disabled={!value.trim() || isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ fontSize: 18, color: '#fff' }}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const inputBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: 28,          // extra for Android nav bar
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#C8E6D0',
    gap: 8,
  },
  iconBtn: {
    width: 42, height: 42,
    backgroundColor: '#F0FBF4',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minHeight: 42,
    backgroundColor: '#F0FBF4',
    borderWidth: 1.5,
    borderColor: '#C8E6D0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1A2E1E',
    // font family set via style prop if expo-font loaded
  },
  sendBtn: {
    width: 42, height: 42,
    backgroundColor: '#1A5C35',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: {
    backgroundColor: '#C8E6D0',
  },
});
```

### File attachment handler

```typescript
import * as DocumentPicker from 'expo-document-picker';

const handleFileAttach = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/csv', 'application/pdf'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      const file = result.assets[0];
      // Add file as a message attachment
      const attachmentMessage = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: `[Attached file: ${file.name}]`,
        timestamp: new Date().toISOString(),
        attachment: {
          name: file.name,
          uri: file.uri,
          size: file.size,
          type: file.mimeType,
        },
      };
      setMessages(prev => [...prev, attachmentMessage]);
      // Then send to AI with file content
      await sendToAI(`I've attached a file: ${file.name}. Please analyze it.`);
    }
  } catch (err) {
    console.error('[File Attach]', err);
  }
};
```

### Voice input handler

```typescript
import * as Speech from 'expo-speech';
// For recording, use expo-av:
import { Audio } from 'expo-av';

// Simple approach — use device speech recognition via a WebView or
// just provide visual feedback that mic was tapped:
const handleVoiceInput = () => {
  // Show mic active state
  setIsMicActive(true);
  
  // For now: toggle a "speak your question" prompt
  // Full implementation requires expo-speech or react-native-voice
  Alert.alert(
    '🎤 Voice Input',
    'Voice input will be available in the next update. Please type your question.',
    [{ text: 'OK', onPress: () => setIsMicActive(false) }]
  );
};
```

### Package to install if not present
```bash
npx expo install expo-document-picker
```

---

## FIX 2 — HISTORY MAP: Completely blank (use Stitch MCP)

**Severity:** P1 — map shows grey box, no tiles loading  
**Screen:** History tab → Interactive Map tab  
**Problem:** The map container renders but Leaflet/MapView shows nothing

### Step 2A — Use Stitch MCP to inspect the web map implementation

```
Open Stitch MCP browser
Navigate to: https://saathiai.org/history (or the History page)
Open browser DevTools → Network tab
Look for requests to tile URLs like:
  - tile.openstreetmap.org
  - server.arcgisonline.com  
  - maps.googleapis.com
  - any *.png tile requests

Note: the exact tile URL being used on the web
Also check: is the map a Leaflet WebView? Or react-native-maps?
```

### Step 2B — Find the map implementation in the app

Search the codebase for:
```
MapView
WebView
Leaflet
react-native-maps
leaflet
MapContainer
TileLayer
```

**If it's a WebView rendering Leaflet HTML:**

The grey box is almost certainly because the WebView height is wrong or the Leaflet container has no height. Find the WebView and fix:

```typescript
// WRONG — WebView with no height:
<WebView source={{ html: leafletHTML }} />

// CORRECT — explicit height:
<WebView
  source={{ html: leafletHTML }}
  style={{ flex: 1, minHeight: 300 }}
  scrollEnabled={false}
  javaScriptEnabled={true}
  domStorageEnabled={true}
  onError={(e) => console.error('[Map WebView]', e.nativeEvent)}
/>
```

**If using react-native-maps:**

```bash
npx expo install react-native-maps
```

Then the map component needs explicit dimensions:
```typescript
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

<MapView
  style={{ width: '100%', height: 300 }}  // ← MUST have explicit height
  provider={PROVIDER_GOOGLE}              // or remove this line for Apple Maps on iOS
  initialRegion={{
    latitude: 20.9517,    // Odisha center
    longitude: 85.0985,
    latitudeDelta: 2.0,
    longitudeDelta: 2.0,
  }}
  showsUserLocation={true}
>
  {soilTests
    .filter(t => t.latitude && t.longitude)
    .map(test => (
      <Marker
        key={test.id}
        coordinate={{ latitude: test.latitude!, longitude: test.longitude! }}
        title={test.location || 'Soil Test'}
        description={`pH: ${test.ph} | ${new Date(test.test_date).toLocaleDateString()}`}
        pinColor={getPinColor(test.ph)}
      />
    ))
  }
</MapView>

// Pin color by pH range (matches web map color legend shown in screenshot):
const getPinColor = (ph: number): string => {
  if (ph < 4.5) return '#FF0000';      // dark red
  if (ph < 5.5) return '#FF4444';      // red
  if (ph < 6.5) return '#4CAF50';      // green ← optimal
  if (ph < 7.5) return '#2196F3';      // blue ← good
  if (ph < 8.5) return '#FF9800';      // amber
  return '#8B4513';                     // brown (>8.5)
};
```

**If the map is Leaflet inside a WebView (check for `.html` string or `leaflet` import):**

The Leaflet HTML string needs explicit height AND the tile URL must work on mobile. Replace the entire Leaflet HTML generator:

```typescript
const generateLeafletHTML = (tests: SoilTest[]): string => {
  const markers = tests
    .filter(t => t.latitude && t.longitude)
    .map(t => `
      L.circleMarker([${t.latitude}, ${t.longitude}], {
        radius: 10,
        fillColor: '${getPinColor(t.ph)}',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
      })
      .bindPopup('<b>pH: ${t.ph}</b><br>${t.location || 'Soil Test'}<br>${new Date(t.test_date || '').toLocaleDateString('en-IN')}')
      .addTo(map);
    `).join('\n');

  // Center on Odisha if no tests, or on first test
  const centerLat = tests[0]?.latitude ?? 20.9517;
  const centerLng = tests[0]?.longitude ?? 85.0985;
  const zoom = tests.length > 0 ? 12 : 7;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; }
        #map { width: 100%; height: 100vh; }   /* ← 100vh is critical */
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', {
          zoomControl: true,
          attributionControl: false
        }).setView([${centerLat}, ${centerLng}], ${zoom});

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          crossOrigin: true
        }).addTo(map);

        ${markers}

        // Fix grey tiles on mobile WebView — force resize after load
        setTimeout(function() { map.invalidateSize(); }, 300);
      </script>
    </body>
    </html>
  `;
};
```

**Critical WebView props for map to work:**
```typescript
<WebView
  source={{ html: generateLeafletHTML(soilTests) }}
  style={{ flex: 1, minHeight: 280, borderRadius: 12 }}
  javaScriptEnabled={true}
  domStorageEnabled={true}
  mixedContentMode="always"
  originWhitelist={['*']}
  allowFileAccess={true}
  scalesPageToFit={false}
  onError={(syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('[Map]', nativeEvent);
  }}
/>
```

### Step 2C — Add to app.json if not present

```json
// In expo.android:
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_GOOGLE_MAPS_KEY"
    }
  }
}
// Note: Only needed if using react-native-maps with PROVIDER_GOOGLE
// OpenStreetMap via Leaflet WebView requires NO API key
```

### Step 2D — Empty state when no GPS data

The current empty state shows a large grey box with tiny text. Replace with:

```typescript
// When no GPS-tagged tests exist:
<View style={styles.mapEmpty}>
  <Text style={{ fontSize: 40, marginBottom: 12 }}>🗺️</Text>
  <Text style={styles.mapEmptyTitle}>No GPS-Tagged Tests Yet</Text>
  <Text style={styles.mapEmptyBody}>
    Run your first soil test with location enabled to see your fields on the map.
  </Text>
  <TouchableOpacity
    style={styles.mapEmptyBtn}
    onPress={() => router.push('/(app)/connect')}
  >
    <Text style={styles.mapEmptyBtnText}>Connect Agni →</Text>
  </TouchableOpacity>
</View>

// Styles:
mapEmpty: {
  height: 240,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#F0FBF4',
  borderRadius: 16,
  padding: 24,
},
mapEmptyTitle: {
  fontFamily: 'Sora_700Bold',
  fontSize: 16, color: '#1A2E1E', textAlign: 'center',
},
mapEmptyBody: {
  fontFamily: 'Sora_400Regular',
  fontSize: 13, color: '#6B8A72',
  textAlign: 'center', lineHeight: 20,
  marginTop: 6, marginBottom: 16,
},
mapEmptyBtn: {
  height: 42, paddingHorizontal: 20,
  backgroundColor: '#1A5C35', borderRadius: 12,
  alignItems: 'center', justifyContent: 'center',
},
mapEmptyBtnText: {
  fontFamily: 'Sora_700Bold', fontSize: 13, color: '#fff',
},
```

---

## FIX 3 — DUPLICATE SECTION HEADERS

**Severity:** P2 — visual bug, same heading rendered twice  
**Screens:** Home screen ("How It Works" × 2) and Profile ("Account Actions" × 2)

### Fix 3A — Home screen "How It Works" duplicate

**File:** `app/(app)/dashboard.tsx`

Search for the text `How It Works` in the file. You will find it rendered twice in the JSX. This is almost certainly a copy-paste error where the section header JSX was left in and also the `<HowItWorksSection />` component renders its own header internally.

**Option 1:** Delete the duplicate Text element that shows "How It Works" inline.

**Option 2:** If a `HowItWorksSection` component is used, remove the header from inside it and keep only the outer one.

The final render should have **exactly one** Text element with "How It Works" visible.

### Fix 3B — Profile "Account Actions" duplicate

**File:** `app/(app)/profile.tsx` (or wherever the Profile/Account screen lives)

Search for `Account Actions` text in the file. Same issue — rendered twice.

Looking at the screenshot, the structure is:
```
Account Actions   ← first (probably a section label Text)
Account Actions   ← second (probably inside a card component that also has a title)
  Log Out →
```

Delete the outer duplicate. Keep only the one that is part of the danger-zone card.

The correct structure:
```typescript
// CORRECT — only one "Account Actions" label:
<View style={styles.dangerCard}>
  <View style={styles.dangerHeader}>
    <Text style={styles.dangerIcon}>⚠️</Text>
    <Text style={styles.dangerTitle}>Account Actions</Text>
  </View>
  <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
    <Text style={styles.logoutText}>🚪 Log Out</Text>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
</View>
```

---

## VERIFICATION CHECKLIST

Run through these after all 4 fixes:

```
AI Chat Input Bar:
  [ ] Text input field visible at bottom of screen in ALL states
  [ ] Visible on welcome screen (Namaste) — not just when messages exist
  [ ] 📎 attachment button opens file picker (JSON, CSV, PDF)
  [ ] 🎤 mic button gives feedback (alert or actual recording)
  [ ] ➤ send button is green (#1A5C35), disabled when input empty
  [ ] Input bar stays above keyboard when keyboard opens
  [ ] Typing and sending a message works end-to-end

Map:
  [ ] Map container renders with visible tile imagery (not grey)
  [ ] If no GPS data: shows clean empty state (not giant grey box)
  [ ] If GPS data exists: colored pins appear on map
  [ ] Map is scrollable/zoomable with touch gestures

Duplicate Headers:
  [ ] "How It Works" appears exactly ONCE on home screen
  [ ] "Account Actions" appears exactly ONCE on profile screen
```

---

## DO NOT TOUCH

- Home screen gradient header ✅
- Home screen stat pills ✅  
- Home screen VS card ✅
- Home screen Quick Actions grid ✅
- Home screen Awards ticker ✅
- Connect screen ✅
- AI Chat welcome illustration ✅
- AI Chat quick action cards ✅
- History Test Logs tab ✅
- Profile user info card (name, email, location) ✅
- Profile "Save Changes" button ✅
- 5-tab bottom navigation ✅
- All authentication flows ✅

---

*Fix Prompt #2 · Mitti-AI Innovations · March 2026*  
*Priority: AI Chat input (P0) → Map loading (P1) → Duplicate headers (P2)*
