# SAATHI AI NATIVE APP — BUG FIX & UI POLISH PROMPT
### For Antigravity IDE · Mitti-AI Innovations
**Task type:** Targeted bug fixes + UI corrections — do NOT refactor or rewrite working screens  
**Priority order:** Fix in the exact sequence listed — BLE crash first, then UI issues

---

## CRITICAL RULE BEFORE STARTING

**Read the full prompt before touching any file.** Each fix is isolated. Do not touch files that are not mentioned in that specific fix. The AI Chat tab, History tab, and Settings toggles are working correctly — do not modify them.

---

## FIX 1 — CRITICAL: BLE CRASH (App crashes at scan)

**Severity:** P0 — app crashes on scan, blocks core functionality  
**Error:** `Uncaught Error: Cannot read property 'createClient' of null`  
**Location:** `hooks/useBLE.ts` → `constructor` → `getManager`  
**Root cause:** `react-native-ble-plx` native module is null because the app is running in standard Expo Go, which does not bundle custom native modules. BLE requires a custom dev client build.

### Fix 1A — Replace the BLE library with expo-compatible one

`react-native-ble-plx` requires bare workflow or custom dev client. Since the project uses Expo managed workflow, replace it with `react-native-ble-manager` which has better Expo compatibility, OR add a null-safety guard so the app does not crash when the native module is unavailable.

**Step 1: Install the correct package**
```bash
npx expo install react-native-ble-manager
```

**Step 2: Update `hooks/useBLE.ts` — add null guard at the top**

Open `hooks/useBLE.ts`. Find the class constructor or the `getManager()` / `createClient()` call. Wrap it with a null check:

```typescript
// At the very top of useBLE.ts, add this guard
import { Platform } from 'react-native';

// Replace whatever is currently used for BLE manager initialization with this pattern:
let bleManager: any = null;

try {
  // Only attempt to load BLE if native module is available
  const BleManager = require('react-native-ble-manager');
  bleManager = BleManager;
} catch (err) {
  console.warn('[BLE] Native module not available in this environment:', err);
}

export function isBLEAvailable(): boolean {
  return bleManager !== null;
}
```

**Step 3: Update the scan function in `hooks/useBLE.ts`**

Find the function that starts scanning (likely called `startScan`, `scanForDevices`, or similar). Wrap the entire body with the null check:

```typescript
async function startScan() {
  if (!isBLEAvailable()) {
    // Show user-friendly error instead of crashing
    setBLEState('error');
    setBLEError('Bluetooth is not available in this build. Please use the production app build to connect your Agni device.');
    return;
  }
  
  // ... rest of existing scan code unchanged
}
```

**Step 4: Update `app/(app)/live-connect.tsx` — show proper error state**

In the Live Connect screen, add handling for the BLE unavailable state. When `isBLEAvailable()` returns false, show this UI instead of crashing:

```typescript
import { isBLEAvailable } from '../../hooks/useBLE';

// Inside the component, before the scan button renders:
if (!isBLEAvailable()) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>📡</Text>
      <Text style={styles.errorTitle}>Bluetooth Not Available</Text>
      <Text style={styles.errorBody}>
        BLE device pairing requires a production build of the app. 
        This feature is not available in Expo Go.{'\n\n'}
        Please install the Saathi AI app from the Play Store / App Store to connect your Agni device.
      </Text>
      <TouchableOpacity 
        style={styles.errorBtn}
        onPress={() => Linking.openURL('https://saathiai.org')}
      >
        <Text style={styles.errorBtnText}>Learn More →</Text>
      </TouchableOpacity>
    </View>
  );
}
```

Add these styles to `live-connect.tsx` StyleSheet:
```typescript
errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
errorIcon: { fontSize: 56, marginBottom: 16 },
errorTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 20, color: '#1A2E1E', textAlign: 'center', marginBottom: 10 },
errorBody: { fontFamily: 'Sora_400Regular', fontSize: 14, color: '#6B8A72', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
errorBtn: { height: 48, paddingHorizontal: 28, backgroundColor: '#1A7B3C', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
errorBtnText: { fontFamily: 'Sora_700Bold', fontSize: 14, color: '#fff' },
```

**Step 5: Update `app.json` to add BLE permissions correctly**

Open `app.json`. In the `android.permissions` array, ensure these are present:
```json
"BLUETOOTH",
"BLUETOOTH_ADMIN", 
"BLUETOOTH_SCAN",
"BLUETOOTH_CONNECT",
"BLUETOOTH_ADVERTISE",
"ACCESS_FINE_LOCATION",
"ACCESS_COARSE_LOCATION"
```

In the `ios.infoPlist`, ensure these are present:
```json
"NSBluetoothAlwaysUsageDescription": "Saathi AI needs Bluetooth to connect to your Agni soil sensor device.",
"NSBluetoothPeripheralUsageDescription": "Saathi AI uses Bluetooth to receive soil data from Agni."
```

**Step 6: Add `eas.json` if not present (required for production BLE build)**

Create `eas.json` in project root if it does not exist:
```json
{
  "cli": { "version": ">= 5.9.1" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "ios": {}
    }
  }
}
```

**NOTE for developer (Nilambar):** After these code changes, BLE will work properly only in:
- A preview or production EAS build (`eas build --platform android --profile preview`)
- A custom dev client build (`npx expo run:android`)

It will show the friendly error message in Expo Go — this is correct behaviour, not a bug.

---

## FIX 2 — PROFILE TAB: Floating "Order Now" icon overflow bug

**Severity:** P1 — visual bug, component overflows container  
**Location:** The "Saathi AI Pro" banner card in the Profile/Account tab  
**Problem:** An "Order Now" graphic/icon is positioned absolutely and bleeds outside the card container

**Find the Pro banner card component.** It is likely in one of:
- `app/(app)/profile.tsx`
- `components/dashboard/ProBannerCard.tsx`
- Inside the account/profile screen

**Find the card that contains "Saathi AI Pro" text.** Look for a `position: 'absolute'` style on the icon/image inside it. Fix it:

```typescript
// WRONG — causes overflow:
// iconContainer: { position: 'absolute', right: -20, top: -10, ... }

// CORRECT — constrain inside card:
proBannerCard: {
  backgroundColor: '#1A7B3C',
  borderRadius: 20,
  padding: 20,
  flexDirection: 'row',
  alignItems: 'center',
  overflow: 'hidden',        // ADD THIS — clips any absolute children to card bounds
  marginBottom: 16,
},

proBannerIconWrap: {
  position: 'absolute',
  right: -8,                 // slight bleed is OK since overflow:hidden clips it
  top: -8,
  opacity: 0.15,             // make it a subtle watermark, not a floating element
},
```

**Also fix the icon itself** — replace the raw icon/image with a properly sized version:
```typescript
// Replace whatever icon is there with:
<View style={styles.proBannerIconWrap}>
  <Text style={{ fontSize: 80, lineHeight: 80 }}>👑</Text>
</View>
```

The full corrected Pro banner card structure should look like:
```typescript
<View style={styles.proBannerCard}>
  {/* Subtle background watermark */}
  <View style={styles.proBannerIconWrap}>
    <Text style={{ fontSize: 80 }}>👑</Text>
  </View>
  
  {/* Left content */}
  <View style={{ flex: 1, zIndex: 2 }}>
    <Text style={styles.proBannerLabel}>UPGRADE TO</Text>
    <Text style={styles.proBannerTitle}>Saathi AI Pro</Text>
    <Text style={styles.proBannerSub}>Unlimited tests · All languages · PDF export</Text>
  </View>

  {/* CTA button */}
  <TouchableOpacity 
    style={styles.proBannerBtn}
    onPress={() => router.push('/subscribe')}
  >
    <Text style={styles.proBannerBtnText}>Upgrade</Text>
  </TouchableOpacity>
</View>
```

Add/update these styles:
```typescript
proBannerCard: { backgroundColor: '#1A7B3C', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', marginBottom: 16, gap: 12 },
proBannerIconWrap: { position: 'absolute', right: -12, top: -12, opacity: 0.12 },
proBannerLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
proBannerTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 18, color: '#fff' },
proBannerSub: { fontFamily: 'Sora_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
proBannerBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
proBannerBtnText: { fontFamily: 'Sora_700Bold', fontSize: 12, color: '#fff' },
```

---

## FIX 3 — BUY AGNI TAB: Three corrections

**Severity:** P1 — wrong pricing loses sales, wrong button colour reduces conversion

### Fix 3A — Pricing: Change ₹8,999 → ₹4,699

**Find the Buy Agni screen.** It is likely at `app/buy-agni.tsx` or `app/(app)/buy-agni.tsx`.

Search the file for `8999` or `8,999` or `₹8`. Replace ALL occurrences:

```
₹8,999  →  ₹4,699        (current price)
            ₹5,999        (original price, shown with strikethrough)
            22% OFF       (discount badge)
```

The pricing block should render as:
```typescript
<View style={styles.priceBlock}>
  {/* Limited time badge */}
  <View style={styles.limitedBadge}>
    <Text style={styles.limitedBadgeText}>⚡ Limited Time Offer!</Text>
  </View>

  <View style={styles.priceRow}>
    {/* Current price */}
    <Text style={styles.currentPrice}>₹4,699</Text>
    {/* Original price with strikethrough */}
    <Text style={styles.originalPrice}>₹5,999</Text>
    {/* Discount badge */}
    <View style={styles.discountBadge}>
      <Text style={styles.discountText}>22% off</Text>
    </View>
  </View>
</View>
```

Add styles:
```typescript
priceBlock: { backgroundColor: '#F0FBF4', borderWidth: 1.5, borderColor: '#C8E6D0', borderRadius: 16, padding: 16, marginVertical: 16 },
limitedBadge: { marginBottom: 8 },
limitedBadgeText: { fontFamily: 'Sora_600SemiBold', fontSize: 11, color: '#1A7B3C' },
priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
currentPrice: { fontFamily: 'Sora_800ExtraBold', fontSize: 32, color: '#1A7B3C' },
originalPrice: { fontFamily: 'Sora_500Medium', fontSize: 16, color: '#6B8A72', textDecorationLine: 'line-through' },
discountBadge: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
discountText: { fontFamily: 'Sora_700Bold', fontSize: 11, color: '#1A7B3C' },
```

### Fix 3B — Buy Now button: Change colour from green → orange

Find the "Buy Now" button in the Buy Agni screen. Change its background color:

```typescript
// BEFORE:
buyNowBtn: { backgroundColor: '#1A7B3C', ... }

// AFTER — orange for high conversion visibility, matching web app:
buyNowBtn: { 
  backgroundColor: '#E65100',   // deep orange
  height: 56, 
  borderRadius: 18, 
  alignItems: 'center', 
  justifyContent: 'center',
  shadowColor: '#E65100',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
},
buyNowBtnText: { fontFamily: 'Sora_800ExtraBold', fontSize: 16, color: '#fff' },
```

The button text should be: `🛒 Buy Now — ₹4,699`

### Fix 3C — Device image: Replace chip icon with proper product representation

The massive green "AGNI V1.0" chip icon must be replaced. Since we do not have the 3D render asset in the app bundle yet, use this approach:

**Option A (if you can add an image asset):** Add the Agni device image from the web app. Copy the device image file into `assets/images/agni-device.png`. Then:
```typescript
import { Image } from 'expo-image';

<Image 
  source={require('../../assets/images/agni-device.png')}
  style={styles.deviceImage}
  contentFit="contain"
/>

// style:
deviceImage: { width: 220, height: 220, alignSelf: 'center' },
```

**Option B (if no image asset available):** Replace the chip icon with a proper styled product card:
```typescript
<View style={styles.deviceCard}>
  {/* Top: product label */}
  <View style={styles.deviceBadgeRow}>
    <View style={styles.deviceBadge}>
      <Text style={styles.deviceBadgeText}>AGNI SOIL SENSOR</Text>
    </View>
    <View style={[styles.deviceBadge, { backgroundColor: '#E8F5E9' }]}>
      <Text style={[styles.deviceBadgeText, { color: '#1A7B3C' }]}>V2.0</Text>
    </View>
  </View>
  
  {/* Center: device illustration using text/emoji composition */}
  <View style={styles.deviceIllustration}>
    <Text style={{ fontSize: 72, textAlign: 'center' }}>🌱</Text>
    <Text style={styles.deviceIllustrationSub}>Agni Smart Soil Sensor</Text>
    <Text style={styles.deviceIllustrationSpec}>14 Parameters · Bluetooth 5.0 · Offline-First</Text>
  </View>

  {/* Bottom: key specs chips */}
  <View style={styles.specsRow}>
    <View style={styles.specChip}><Text style={styles.specChipText}>⚡ &lt; 60 seconds</Text></View>
    <View style={styles.specChip}><Text style={styles.specChipText}>📡 BT 5.0</Text></View>
    <View style={styles.specChip}><Text style={styles.specChipText}>🔋 30 days</Text></View>
  </View>
</View>
```

Add styles:
```typescript
deviceCard: { backgroundColor: '#F4FBF6', borderRadius: 20, padding: 20, margin: 16, marginBottom: 0 },
deviceBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
deviceBadge: { backgroundColor: '#1A7B3C', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
deviceBadgeText: { fontFamily: 'Sora_700Bold', fontSize: 10, color: '#fff', letterSpacing: 0.5 },
deviceIllustration: { alignItems: 'center', paddingVertical: 12 },
deviceIllustrationSub: { fontFamily: 'Sora_700Bold', fontSize: 16, color: '#1A2E1E', marginTop: 8 },
deviceIllustrationSpec: { fontFamily: 'Sora_400Regular', fontSize: 12, color: '#6B8A72', marginTop: 4, textAlign: 'center' },
specsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12 },
specChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#C8E6D0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
specChipText: { fontFamily: 'Sora_600SemiBold', fontSize: 11, color: '#1A7B3C' },
```

---

## FIX 4 — HOME SCREEN: Visual polish (clutter + flatness)

**Severity:** P2 — visual quality, not a crash  
**Location:** `app/(app)/dashboard.tsx` (or `home.tsx`)

### Fix 4A — Awards ticker: Move below the fold

The horizontal scrolling tags ("State Level Winner", "< 60s Testing") are currently placed between the connect button and the content cards, making the area feel cluttered. Move the ticker to BELOW the first content card (after the Agni connect card), not above it.

Find the awards ticker component and move it one position down in the JSX render order:

```typescript
// BEFORE ordering in JSX:
<AgniConnectCard />
<AwardsTicker />           ← cluttered here
<SoilHealthCard />

// AFTER ordering in JSX:
<AgniConnectCard />
<SoilHealthCard />
<AwardsTicker />           ← less intrusive here, feels like a credibility footer
```

### Fix 4B — Add depth with card shadows (glassmorphism approximation)

React Native cannot do true CSS glassmorphism. Use elevated shadows to add the depth that's currently missing. Find every `StyleSheet` in `dashboard.tsx` that defines a card and update/add the shadow properties:

```typescript
// Apply this shadow pattern to ALL card components on the dashboard:
card: {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 20,
  marginBottom: 16,
  // iOS shadows:
  shadowColor: '#1A7B3C',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  // Android shadow:
  elevation: 4,
},
```

For the Agni Connect card (green gradient card), add a stronger coloured shadow:
```typescript
agniCard: {
  // ... existing gradient styles ...
  shadowColor: '#1A7B3C',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.28,
  shadowRadius: 20,
  elevation: 8,
},
```

### Fix 4C — Header glassmorphism stat pills

The three stats (Farms Analyzed, Soil Tests, AI Recommendations) currently sit on the gradient header. Add a glass effect to their container:

```typescript
// Find the stat pill/card components in the header and update:
statPill: {
  backgroundColor: 'rgba(255, 255, 255, 0.14)',   // was probably a solid colour
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.22)',
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  flex: 1,
  alignItems: 'center',
  // Note: React Native does not support backdropFilter/blur natively
  // rgba transparency gives the "glass" feel without blur
},
statValue: {
  fontFamily: 'Sora_800ExtraBold',
  fontSize: 20,
  color: '#FFFFFF',
},
statLabel: {
  fontFamily: 'Sora_400Regular',
  fontSize: 10,
  color: 'rgba(255, 255, 255, 0.65)',
  marginTop: 2,
},
```

---

## VERIFICATION AFTER ALL FIXES

Run through this checklist after completing all fixes above:

```
BLE Fix:
  [ ] App does NOT crash when tapping "Scan for Devices" in Expo Go
  [ ] Shows friendly "BLE not available in this build" message instead
  [ ] No red screen error at any point during Live Connect flow

Profile Tab:
  [ ] Pro banner card renders completely within its container
  [ ] No element overflows or bleeds outside card boundaries
  [ ] "Upgrade" button visible and tappable

Buy Agni Tab:
  [ ] Price shows ₹4,699 (not ₹8,999)
  [ ] Original price ₹5,999 shown with strikethrough
  [ ] Buy Now button is orange (#E65100), not green
  [ ] Device section shows product card or image (not raw chip icon)

Dashboard:
  [ ] Awards ticker appears below Soil Health card (not above it)
  [ ] All cards have visible shadow/depth (not completely flat)
  [ ] Stat pills in header have glass-style transparency
```

---

## DO NOT TOUCH (working correctly — leave as is)

- `app/(app)/ai-chat.tsx` — AI Chat screen is correct, do not modify
- `app/(app)/history.tsx` — Test Logs list is correct, do not modify
- `components/` related to chat or history
- `services/auth.ts` and `services/api.ts` — auth integration already done
- `store/authStore.ts` — do not modify
- All database-related files
- Settings toggles (Clear Cache, Sign Out work correctly)
- PDF export functionality (works correctly)

---

*Bug Fix Prompt — Mitti-AI Innovations · March 2026*  
*saathiai.org · github.com/NilambarSonu/saathi-native*
