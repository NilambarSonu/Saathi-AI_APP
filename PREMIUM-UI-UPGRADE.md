# SAATHI AI — APPLE-TIER PREMIUM UI UPGRADE
### For Antigravity IDE · Full Visual Overhaul
**Priority 1:** Liquid Glass Tab Bar (Apple iOS 26 style)  
**Priority 2:** Premium card & typography system  
**Priority 3:** Micro-animations and depth throughout  
**Do not break:** Any existing functionality, navigation routes, data fetching

---

## CONTEXT — WHAT EXISTS, WHAT CHANGES

From screenshots, the current app has:
- 5-tab bottom nav with icon-only (no labels) — needs full liquid glass rebuild
- Light mint gradient header — needs premium depth
- Cards are flat white — need layered elevation system
- Typography is inconsistent scale — needs tightened hierarchy
- "Saathi Features" list items look plain — need premium row design
- "Testing Speed" card is good structure — needs visual refinement

**Core principle:** Apple premium = restraint + depth + motion. Every change must feel intentional. Nothing should feel "added on."

---

## STEP 0 — INSTALL REQUIRED PACKAGES

```bash
# Blur effect (critical for liquid glass)
npx expo install expo-blur

# Spring animations (critical for tab switching feel)
npx expo install react-native-reanimated

# Haptic feedback (Apple-feel on tab press)
npx expo install expo-haptics

# Linear gradients (already likely installed)
npx expo install expo-linear-gradient
```

Ensure `react-native-reanimated` plugin is in `babel.config.js`:
```javascript
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: ['react-native-reanimated/plugin'],  // ← must be last
};
```

---

## PRIORITY 1 — LIQUID GLASS TAB BAR

This is the single most impactful change. Replace the current bottom navigation entirely.

### What "Liquid Glass" means (Apple iOS 26 design language)

- **Floating pill** — the tab bar is NOT full-width. It floats above content as a rounded pill
- **Frosted glass** — BlurView with `intensity={80}`, `tint="light"`, ultra-thin material
- **Specular highlight** — 1px top border of `rgba(255,255,255,0.6)` simulates glass edge
- **Active indicator** — a green "liquid" capsule slides under the active icon with spring physics
- **No labels** — icons only (already matches current design — keep this)
- **Elevated** — strong shadow so it floats above the page content
- **Haptic** — `Haptics.impactAsync(ImpactFeedbackStyle.Light)` on every tap

### Create new file: `components/navigation/LiquidGlassTabBar.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  Platform, Dimensions, Text,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, interpolateColor, withTiming,
  useAnimatedProps,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── TAB CONFIGURATION ──
// Icons: use SVG or emoji — keep consistent with existing app icons
const TABS = [
  { key: 'dashboard',  icon: '⌂',  label: 'Home'     },
  { key: 'connect',    icon: '◎',  label: 'Connect'  },
  { key: 'chat',       icon: '◯',  label: 'AI Chat'  },
  { key: 'history',    icon: '⌁',  label: 'History'  },
  { key: 'profile',    icon: '⊙',  label: 'Profile'  },
];

// Tab bar pill dimensions
const TAB_BAR_WIDTH = SCREEN_WIDTH - 40;   // 20px margin each side
const TAB_BAR_HEIGHT = 64;
const TAB_INDICATOR_WIDTH = TAB_BAR_WIDTH / TABS.length - 8;

interface LiquidGlassTabBarProps {
  activeTab: string;
  onTabPress: (tabKey: string) => void;
}

export default function LiquidGlassTabBar({
  activeTab,
  onTabPress,
}: LiquidGlassTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = TABS.findIndex(t => t.key === activeTab);

  // Animated X position of the sliding indicator
  const indicatorX = useSharedValue(activeIndex * (TAB_BAR_WIDTH / TABS.length));

  useEffect(() => {
    indicatorX.value = withSpring(
      activeIndex * (TAB_BAR_WIDTH / TABS.length) + 4,
      {
        damping: 20,        // Controls bounce — lower = more bounce
        stiffness: 180,     // Controls speed
        mass: 0.8,
        overshootClamping: false,
      }
    );
  }, [activeIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const handleTabPress = (tabKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabPress(tabKey);
  };

  return (
    <View style={[styles.outerWrap, { marginBottom: Math.max(insets.bottom, 12) }]}>
      {/* ── GLASS PILL CONTAINER ── */}
      <BlurView
        intensity={85}
        tint="light"
        style={styles.blurContainer}
      >
        {/* Specular highlight — top edge of glass */}
        <View style={styles.specularHighlight} />

        {/* Sliding green indicator */}
        <Animated.View style={[styles.indicator, indicatorStyle]} />

        {/* Tab items */}
        <View style={styles.tabsRow}>
          {TABS.map((tab, index) => {
            const isActive = tab.key === activeTab;
            return (
              <TabItem
                key={tab.key}
                tab={tab}
                isActive={isActive}
                onPress={() => handleTabPress(tab.key)}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

// ── TAB ITEM ──
function TabItem({
  tab,
  isActive,
  onPress,
}: {
  tab: typeof TABS[0];
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isActive ? 1 : 0.45);

  useEffect(() => {
    opacity.value = withTiming(isActive ? 1 : 0.45, { duration: 200 });
  }, [isActive]);

  const handlePress = () => {
    // Bounce animation on press
    scale.value = withSpring(0.85, { damping: 10, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    });
    onPress();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={handlePress}
      activeOpacity={1}  // We handle opacity via animation
    >
      <Animated.View style={[styles.tabInner, animStyle]}>
        <TabIcon tabKey={tab.key} isActive={isActive} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── SVG-STYLE TAB ICONS ──
// Using clean geometric representations matching Apple SF Symbols style
function TabIcon({ tabKey, isActive }: { tabKey: string; isActive: boolean }) {
  const color = isActive ? '#1A5C35' : '#8A9E8E';
  const size = 24;

  const icons: Record<string, React.ReactNode> = {
    dashboard: (
      // House icon
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        {/* Roof */}
        <View style={{
          width: 0, height: 0,
          borderLeftWidth: 11, borderRightWidth: 11, borderBottomWidth: 9,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderBottomColor: color,
          marginBottom: -2,
        }} />
        {/* Body */}
        <View style={{
          width: 16, height: 10,
          backgroundColor: color,
          borderTopLeftRadius: 1, borderTopRightRadius: 1,
        }}>
          {/* Door */}
          <View style={{
            position: 'absolute', bottom: 0, left: 5,
            width: 6, height: 7,
            backgroundColor: isActive ? '#E8F5EE' : '#F0F4F0',
            borderTopLeftRadius: 3, borderTopRightRadius: 3,
          }} />
        </View>
      </View>
    ),
    connect: (
      // Bluetooth/signal waves icon
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        {[10, 16, 22].map((w, i) => (
          <View key={i} style={{
            position: 'absolute',
            width: w, height: w,
            borderRadius: w / 2,
            borderWidth: 1.5,
            borderColor: color,
            opacity: 1 - i * 0.25,
          }} />
        ))}
        <View style={{
          width: 5, height: 5, borderRadius: 2.5,
          backgroundColor: color,
        }} />
      </View>
    ),
    chat: (
      // Chat bubble icon
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 20, height: 16,
          backgroundColor: color,
          borderRadius: 10,
          position: 'relative',
        }}>
          {/* Chat tail */}
          <View style={{
            position: 'absolute', bottom: -5, left: 5,
            width: 0, height: 0,
            borderTopWidth: 6, borderRightWidth: 5,
            borderTopColor: color, borderRightColor: 'transparent',
          }} />
          {/* Message lines */}
          {[0, 1].map(i => (
            <View key={i} style={{
              position: 'absolute',
              left: 5, top: 5 + i * 4,
              width: 10 - i * 2, height: 1.5,
              backgroundColor: isActive ? '#E8F5EE' : '#F0F4F0',
              borderRadius: 1,
            }} />
          ))}
        </View>
      </View>
    ),
    history: (
      // Bar chart icon
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', width: size, height: size, justifyContent: 'center', gap: 3 }}>
        {[10, 16, 12, 20].map((h, i) => (
          <View key={i} style={{
            width: 4, height: h,
            backgroundColor: color,
            borderRadius: 2,
          }} />
        ))}
      </View>
    ),
    profile: (
      // Person icon
      <View style={{ alignItems: 'center', width: size, height: size, justifyContent: 'center' }}>
        <View style={{
          width: 10, height: 10, borderRadius: 5,
          backgroundColor: color,
          marginBottom: 2,
        }} />
        <View style={{
          width: 18, height: 10,
          borderTopLeftRadius: 9, borderTopRightRadius: 9,
          backgroundColor: color,
        }} />
      </View>
    ),
  };

  return <>{icons[tabKey] || <View />}</>;
}

const styles = StyleSheet.create({
  outerWrap: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    alignItems: 'center',
    // Shadow for floating effect
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  blurContainer: {
    width: TAB_BAR_WIDTH,
    height: TAB_BAR_HEIGHT,
    borderRadius: 32,          // Full pill shape
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',   // glass edge
    backgroundColor: Platform.OS === 'android'
      ? 'rgba(245,250,246,0.94)'             // Android fallback (no blur)
      : 'transparent',
  },
  specularHighlight: {
    position: 'absolute',
    top: 0, left: 16, right: 16,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.70)',   // top glass edge shimmer
    borderRadius: 1,
  },
  indicator: {
    position: 'absolute',
    top: 8,
    width: TAB_INDICATOR_WIDTH,
    height: TAB_BAR_HEIGHT - 16,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 92, 53, 0.10)',   // very subtle green fill
    borderWidth: 1,
    borderColor: 'rgba(26, 92, 53, 0.18)',        // green glass border
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44, height: 44,
    borderRadius: 22,
  },
});
```

### Integrate into the app layout

**File:** `app/(app)/_layout.tsx`

Replace the existing Tabs navigator with a custom tab bar implementation:

```typescript
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import LiquidGlassTabBar from '../../components/navigation/LiquidGlassTabBar';

// Map pathname to tab key
const getActiveTab = (pathname: string): string => {
  if (pathname.includes('dashboard')) return 'dashboard';
  if (pathname.includes('connect')) return 'connect';
  if (pathname.includes('chat')) return 'chat';
  if (pathname.includes('history')) return 'history';
  if (pathname.includes('profile')) return 'profile';
  return 'dashboard';
};

// In your layout component:
const pathname = usePathname();
const activeTab = getActiveTab(pathname);

const handleTabPress = (tabKey: string) => {
  const routes: Record<string, string> = {
    dashboard: '/(app)/dashboard',
    connect:   '/(app)/connect',
    chat:      '/(app)/chat',
    history:   '/(app)/history',
    profile:   '/(app)/profile',
  };
  router.push(routes[tabKey]);
};

// Render — wrap screen content with floating tab bar:
return (
  <View style={{ flex: 1 }}>
    <Slot />   {/* or your existing screen content */}
    <LiquidGlassTabBar
      activeTab={activeTab}
      onTabPress={handleTabPress}
    />
  </View>
);
```

**IMPORTANT:** All screens must have `paddingBottom: 88` in their content to avoid the floating tab bar overlapping content at the bottom.

---

## PRIORITY 2 — PREMIUM DESIGN SYSTEM

### 2.1 — Color system refinement

```typescript
// constants/Colors.ts — premium palette
export const Colors = {
  // Primary greens (unchanged — brand colors)
  primary:       '#1A5C35',
  primaryMid:    '#1A7B3C',
  primaryDeep:   '#0D3B1D',
  primaryLight:  '#4CAF6E',

  // Backgrounds — layered depth system
  bg0:   '#EDF7F0',   // deepest bg — body behind everything
  bg1:   '#F4FBF6',   // app screen background
  bg2:   '#FAFFFE',   // elevated surface (cards)
  bg3:   '#FFFFFF',   // top surface (modals, input fields)

  // Text hierarchy — Apple-style
  label1:    '#0D1F12',   // primary — heaviest
  label2:    '#3D5244',   // secondary
  label3:    '#6B8A72',   // tertiary
  label4:    '#A8BFB0',   // quaternary / placeholders

  // Separators
  sep1:      'rgba(26, 92, 53, 0.12)',    // strong separator
  sep2:      'rgba(26, 92, 53, 0.06)',    // subtle separator

  // Fills (for icon backgrounds, tinted surfaces)
  fillGreen:  'rgba(26, 92, 53, 0.08)',
  fillAmber:  'rgba(230, 81, 0, 0.08)',
  fillBlue:   'rgba(21, 101, 192, 0.08)',
  fillPurple: 'rgba(106, 27, 154, 0.08)',

  // Semantic
  success:    '#1A5C35',
  warning:    '#E65100',
  error:      '#C62828',
  info:       '#1565C0',
};
```

### 2.2 — Typography scale (tighten existing)

```typescript
// constants/Typography.ts
export const Type = {
  // Display
  largeTitle:  { fontFamily: 'Sora_800ExtraBold', fontSize: 34, letterSpacing: -0.8, lineHeight: 41 },
  title1:      { fontFamily: 'Sora_700Bold',      fontSize: 28, letterSpacing: -0.6, lineHeight: 34 },
  title2:      { fontFamily: 'Sora_700Bold',      fontSize: 22, letterSpacing: -0.4, lineHeight: 28 },
  title3:      { fontFamily: 'Sora_600SemiBold',  fontSize: 20, letterSpacing: -0.3, lineHeight: 25 },

  // Body
  headline:    { fontFamily: 'Sora_600SemiBold',  fontSize: 17, letterSpacing: -0.2, lineHeight: 22 },
  body:        { fontFamily: 'Sora_400Regular',   fontSize: 17, letterSpacing: -0.2, lineHeight: 22 },
  callout:     { fontFamily: 'Sora_400Regular',   fontSize: 16, letterSpacing: -0.1, lineHeight: 21 },
  subheadline: { fontFamily: 'Sora_500Medium',    fontSize: 15, letterSpacing: -0.1, lineHeight: 20 },

  // Small
  footnote:    { fontFamily: 'Sora_400Regular',   fontSize: 13, letterSpacing: 0,    lineHeight: 18 },
  caption1:    { fontFamily: 'Sora_400Regular',   fontSize: 12, letterSpacing: 0,    lineHeight: 16 },
  caption2:    { fontFamily: 'Sora_600SemiBold',  fontSize: 11, letterSpacing: 0.05, lineHeight: 13 },
};
```

### 2.3 — Shadow system (Apple-style layered depth)

```typescript
// constants/Shadows.ts
export const Shadows = {
  // Level 0 — no shadow (flat, on card surface)
  none: {},

  // Level 1 — subtle lift (stat pills, small chips)
  sm: {
    shadowColor: '#0D3B1D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  // Level 2 — card shadow (standard cards)
  md: {
    shadowColor: '#0D3B1D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 5,
  },

  // Level 3 — floating elements (Agni card, connect card)
  lg: {
    shadowColor: '#0D3B1D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },

  // Level 4 — modals, tab bar
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 20,
  },
};
```

---

## PRIORITY 3 — SCREEN-BY-SCREEN PREMIUM UPGRADES

### 3.1 — Home Screen header upgrade

The current header is a flat mint gradient. Upgrade to a more premium version:

```typescript
// Replace existing header LinearGradient with:
<LinearGradient
  colors={['#0A2E18', '#0F4024', '#1A5C35']}   // deeper, richer gradient
  start={{ x: 0.1, y: 0 }}
  end={{ x: 0.9, y: 1 }}
  style={styles.header}
>
  {/* Subtle mesh overlay — adds premium texture */}
  <View style={styles.headerMesh} />

  {/* Glowing orb — top right ambient light */}
  <View style={styles.headerOrb} />

  {/* ... greeting, avatar, stats ... */}
</LinearGradient>

// Add these styles:
headerMesh: {
  position: 'absolute', inset: 0,
  // Subtle radial gradient simulation using opacity layers
  backgroundImage: 'none',  // native doesn't support but set the intent
  opacity: 0.4,
},
headerOrb: {
  position: 'absolute',
  top: -60, right: -40,
  width: 180, height: 180,
  borderRadius: 90,
  backgroundColor: 'rgba(76, 175, 110, 0.20)',   // green ambient glow
},
```

### 3.2 — Stat pills — premium glass style

```typescript
// Replace current stat pills with glass material:
statPill: {
  flex: 1,
  backgroundColor: 'rgba(255,255,255,0.10)',
  borderRadius: 18,
  paddingVertical: 16,
  paddingHorizontal: 10,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.18)',
  // Top specular highlight
  // (achieved by using a View absolutely positioned at top)
},

// Add top highlight inside each pill:
<View style={{
  position: 'absolute', top: 0, left: 12, right: 12, height: 1,
  backgroundColor: 'rgba(255,255,255,0.50)',
  borderRadius: 1,
}} />

// Label style — uppercase tracked, like Apple Health:
statLabel: {
  fontFamily: 'Sora_600SemiBold',
  fontSize: 10,
  color: 'rgba(255,255,255,0.60)',
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  marginTop: 3,
},
```

### 3.3 — Agni Connect Card — premium redesign

Looking at screenshot 2, the Agni card has a BLE radar icon on the right. Make this card feel premium:

```typescript
// The card currently shows: icon | text | "Connect →" button | BLE radar on right
// New version — inspired by Apple's widget style:

<View style={agniCardStyles.card}>
  {/* Background gradient */}
  <LinearGradient
    colors={['#132B1C', '#1A4228', '#1E5232']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={StyleSheet.absoluteFill}
  />

  {/* Grain texture overlay (premium feel) */}
  <View style={{
    ...StyleSheet.absoluteFillObject,
    opacity: 0.03,
    backgroundColor: '#fff',
  }} />

  {/* Left content */}
  <View style={{ flex: 1 }}>
    {/* Small label */}
    <Text style={agniCardStyles.eyebrow}>AGNI DEVICE</Text>
    <Text style={agniCardStyles.title}>Connect Agni</Text>
    <Text style={agniCardStyles.subtitle}>
      Pair via Bluetooth for real-time insights
    </Text>

    <TouchableOpacity style={agniCardStyles.btn} onPress={handleConnect}>
      <Text style={agniCardStyles.btnText}>Connect →</Text>
    </TouchableOpacity>
  </View>

  {/* Right: animated BLE pulse visualization */}
  <View style={agniCardStyles.bleViz}>
    <AgniPulseAnimation />
  </View>
</View>

// Styles:
const agniCardStyles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
    ...Shadows.lg,
  },
  eyebrow: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: 'rgba(168,240,192,0.70)',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 18,
    marginBottom: 16,
  },
  btn: {
    alignSelf: 'flex-start',
    height: 36,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  bleViz: {
    width: 80, height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

### 3.4 — AgniPulseAnimation component

```typescript
// Create: components/AgniPulseAnimation.tsx
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withDelay,
  Easing,
} from 'react-native-reanimated';

export function AgniPulseAnimation() {
  const rings = [0, 1, 2].map(() => ({
    scale: useSharedValue(0.4),
    opacity: useSharedValue(0.8),
  }));

  useEffect(() => {
    rings.forEach((ring, i) => {
      ring.scale.value = withDelay(
        i * 500,
        withRepeat(
          withTiming(1.8, { duration: 1800, easing: Easing.out(Easing.ease) }),
          -1, false
        )
      );
      ring.opacity.value = withDelay(
        i * 500,
        withRepeat(
          withTiming(0, { duration: 1800, easing: Easing.out(Easing.ease) }),
          -1, false
        )
      );
    });
  }, []);

  return (
    <View style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center' }}>
      {rings.map((ring, i) => {
        const style = useAnimatedStyle(() => ({
          position: 'absolute',
          width: 60, height: 60,
          borderRadius: 30,
          borderWidth: 1.5,
          borderColor: `rgba(168, 240, 192, ${ring.opacity.value * 0.6})`,
          transform: [{ scale: ring.scale.value }],
        }));
        return <Animated.View key={i} style={style} />;
      })}
      {/* Center bluetooth icon */}
      <View style={{
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(168,240,192,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(168,240,192,0.30)',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 10,
      }}>
        <Text style={{ fontSize: 16 }}>⚡</Text>
      </View>
    </View>
  );
}
```

### 3.5 — Premium Card base style

Apply this to EVERY card across the app (replace all flat white cards):

```typescript
// Base card — use this everywhere:
card: {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 20,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: 'rgba(26, 92, 53, 0.06)',   // ultra-subtle green border
  ...Shadows.md,                             // from Shadows constants
},

// Card with tinted surface (for comparison card, feature list):
cardTinted: {
  backgroundColor: '#FAFFFE',
  // same border + shadow
},
```

### 3.6 — "Saathi Features" list redesign

Currently: plain rows with icon, text, chevron. Upgrade to premium row style:

```typescript
// For each feature row (Smart Fertilizer, Voice Advisory, Agri LLM, Crop Planning):
<TouchableOpacity style={featureStyles.row} activeOpacity={0.7}>
  {/* Icon with colored fill */}
  <View style={[featureStyles.iconBox, { backgroundColor: item.fillColor }]}>
    <Text style={{ fontSize: 20 }}>{item.icon}</Text>
  </View>

  {/* Text content */}
  <View style={{ flex: 1, marginLeft: 14 }}>
    <Text style={featureStyles.title}>{item.title}</Text>
    <Text style={featureStyles.subtitle}>{item.subtitle}</Text>
  </View>

  {/* Premium chevron */}
  <View style={featureStyles.chevronBox}>
    <Text style={featureStyles.chevron}>›</Text>
  </View>
</TouchableOpacity>

// Between rows: hair-line separator (not full width):
<View style={{
  height: StyleSheet.hairlineWidth,
  backgroundColor: 'rgba(26, 92, 53, 0.08)',
  marginLeft: 70,   // aligns with text, not icon
}} />

const featureStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  iconBox: {
    width: 44, height: 44,
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 15,
    color: '#0D1F12',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    color: '#6B8A72',
    marginTop: 2,
  },
  chevronBox: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(26, 92, 53, 0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  chevron: {
    fontSize: 18,
    color: '#6B8A72',
    lineHeight: 20,
  },
});
```

Feature data with icon fill colors:
```typescript
const FEATURES = [
  {
    icon: '⚡',
    fillColor: 'rgba(26, 92, 53, 0.08)',
    title: 'Smart Fertilizer Calculation',
    subtitle: 'AI saves up to 30% on inputs',
    route: '/(app)/chat',
    prompt: 'Calculate optimal fertilizer for my soil',
  },
  {
    icon: '🎤',
    fillColor: 'rgba(21, 101, 192, 0.08)',
    title: 'Voice Advisory',
    subtitle: 'Speak in Odia, Hindi, or English',
    route: '/(app)/chat',
  },
  {
    icon: '🌿',
    fillColor: 'rgba(230, 81, 0, 0.08)',
    title: 'Agri-Science LLM',
    subtitle: 'Custom AI trained on crop research',
    route: '/(app)/chat',
  },
  {
    icon: '📍',
    fillColor: 'rgba(106, 27, 154, 0.08)',
    title: 'Crop Planning',
    subtitle: 'Market-driven advisory for max ROI',
    route: '/(app)/chat',
  },
];
```

### 3.7 — Section header consistency

Replace all section title Text elements with a consistent premium style:

```typescript
// Use this exact component for every section header:
function SectionHeader({ title, action, onAction }: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      marginTop: 8,
      paddingHorizontal: 0,  // cards handle their own padding
    }}>
      <Text style={{
        fontFamily: 'Sora_700Bold',
        fontSize: 22,                  // bigger than current
        color: '#0D1F12',
        letterSpacing: -0.5,
      }}>
        {title}
      </Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={{
            fontFamily: 'Sora_600SemiBold',
            fontSize: 15,
            color: '#1A5C35',
            letterSpacing: -0.2,
          }}>
            {action}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Usage:
<SectionHeader title="Saathi Features" />
<SectionHeader title="How It Works" />
<SectionHeader title="Quick Actions" />
<SectionHeader title="Recent Tests" action="View All" onAction={() => router.push('/history')} />
```

---

## PRIORITY 4 — MICRO-INTERACTIONS

### 4.1 — Card press feedback

All tappable cards must have this press animation:

```typescript
// Wrap any tappable card with this:
import { Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

function PressableCard({ children, onPress, style }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={onPress}
    >
      <Animated.View style={[style, animStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
```

### 4.2 — Staggered entrance animations on home screen

```typescript
// Animate each section fading up when home screen mounts:
import { useEffect } from 'react';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withDelay, withSpring, withTiming,
} from 'react-native-reanimated';

// In HomeScreen component:
const sections = [0, 1, 2, 3, 4, 5].map((_, i) => ({
  opacity: useSharedValue(0),
  translateY: useSharedValue(20),
}));

useEffect(() => {
  sections.forEach((section, i) => {
    section.opacity.value = withDelay(100 + i * 80, withTiming(1, { duration: 400 }));
    section.translateY.value = withDelay(100 + i * 80, withSpring(0, { damping: 20 }));
  });
}, []);

// Wrap each section in:
<Animated.View style={useAnimatedStyle(() => ({
  opacity: sections[i].opacity.value,
  transform: [{ translateY: sections[i].translateY.value }],
}))}>
  {/* section content */}
</Animated.View>
```

---

## PADDING FIX — ALL SCREENS

Since the tab bar now floats, ALL scrollable screens need extra bottom padding:

```typescript
// Add to every ScrollView contentContainerStyle:
contentContainerStyle={{
  paddingBottom: 96,   // 64 (tab bar height) + 32 (breathing room)
  paddingHorizontal: 16,
}}

// Or add as a constant:
export const TAB_BAR_BOTTOM_PADDING = 96;
```

---

## ANDROID NOTE

BlurView (`expo-blur`) on Android does not support native blur below API 31. On Android the glass effect falls back to a semi-transparent background. This is acceptable — add a comment in the code:

```typescript
// Android <API31: blur unavailable, falls back to:
// backgroundColor: 'rgba(242, 250, 244, 0.95)'
// This gives a clean frosted look without native blur
```

---

## VERIFICATION CHECKLIST

```
Liquid Glass Tab Bar:
  [ ] Tab bar renders as a floating pill, NOT full-width bar
  [ ] Tab bar hovers above content with visible shadow
  [ ] Active tab indicator slides smoothly with spring animation
  [ ] Active icon is #1A5C35 (green), inactive is #8A9E8E (muted)
  [ ] Tapping a tab triggers light haptic feedback
  [ ] Content scrolls BEHIND the tab bar (not cut off)
  [ ] BlurView renders frosted glass on iOS
  [ ] Android shows clean semi-transparent fallback

Premium Cards:
  [ ] All cards have subtle green-tinted shadows (not pure black)
  [ ] All cards have 1px rgba green border
  [ ] Agni card has animated pulse rings
  [ ] Feature list rows have colored icon boxes
  [ ] Chevrons have circular pill backgrounds
  [ ] Pressing any card shows spring scale animation

Typography:
  [ ] Section headers are 22sp bold with -0.5 letter spacing
  [ ] Body text is 15-17sp
  [ ] All caps labels are tracked (letterSpacing 0.8+)

Performance:
  [ ] Tab switching feels instant (< 16ms)
  [ ] Scroll is smooth (no jank)
  [ ] Animations use useNativeDriver where possible
```

---

## DO NOT TOUCH

- Auth screens (login, register, OTP) — working correctly
- AI Chat screen logic — only the input bar was broken (fixed in prev prompt)
- BLE connection logic — only the UI shell changes
- All API calls and data fetching
- The existing color brand values (green stays green)

---

*Premium UI Upgrade · Mitti-AI Innovations · March 2026*  
*Apple Liquid Glass Tab Bar + Elevation System + Micro-interactions*
