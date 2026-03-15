# SAATHI AI APP — HOME SCREEN ENHANCEMENT (v2)
### Extracted from live saathiai.org screenshots · March 2026
**File:** `app/(app)/dashboard.tsx`  
**Updated:** Full visual spec extracted from 9 real website screenshots

---

## DESIGN TOKENS — EXTRACTED FROM ACTUAL WEBSITE

These are real values pulled from the live saathiai.org screenshots. Use these exactly.

```typescript
// constants/Colors.ts — update with these confirmed values
export const Colors = {

  // ── BACKGROUNDS ──
  // Website hero bg is a very pale mint — extract from screenshot 1
  appBackground:     '#F0FBF4',   // ultra-pale mint (matches web hero bg)
  surface:           '#FFFFFF',

  // ── PRIMARY GREENS (extracted from web buttons & header) ──
  primary:           '#1A5C35',   // dark green — "Connect Your Device" button color
  primaryMid:        '#1A7B3C',   // mid green — used in most text highlights
  primaryDeep:       '#0D3B1D',   // deepest — header gradient start
  primaryLight:      '#4CAF6E',   // lighter for glow effects

  // ── SURFACE TINTS (from web feature cards) ──
  mintSurface:       '#E8F5EE',   // Instant Analysis card bg (screenshot 4)
  blueSurface:       '#E8F0FB',   // Local Language card bg (screenshot 4)
  amberSurface:      '#FDF8E7',   // Sustainable Farming card bg (screenshot 4)
  purpleSurface:     '#F5F0FD',   // Field Mapping card bg (screenshot 4)

  // ── ICON TINTS (from web feature cards) ──
  iconGreen:         '#2E7D32',   // trend arrow icon
  iconBlue:          '#1565C0',   // brain/globe icon
  iconAmber:         '#E65100',   // microscope icon
  iconPurple:        '#6A1B9A',   // location pin icon

  // ── CTA DARK SECTION (screenshot 9 — "Grow More. Waste Nothing.") ──
  darkCTA:           '#1B4D2E',   // dark green bg of bottom CTA

  // ── COMPARISON CARD TINTS (screenshots 2–3) ──
  badRed:            '#FFF5F5',   // Traditional Testing card bg
  goodGreen:         '#F0FBF4',   // The Saathi Way card bg

  // ── TEXT ──
  textPrimary:       '#1A2E1E',
  textSecondary:     '#6B8A72',
  textOnDark:        '#FFFFFF',
  textGreenBold:     '#1A5C35',   // stats numbers on web

  // ── BORDERS ──
  border:            '#C8E6D0',
  borderLight:       '#E8F5EE',

  // ── SEMANTIC ──
  amber:             '#F4A02D',
  error:             '#C62828',
  warning:           '#E65100',
};
```

---

## EXACT CONTENT — EXTRACTED FROM SCREENSHOTS

### Awards Ticker (screenshot 2 — exact order, exact text)
```typescript
const AWARDS = [
  '🏆 Disruptive Innovation Award',
  '🌱 Best Farmer-Tech Solution',
  '🚀 Govt. Incubated Startup',
  '💰 ₹5,00,000 Govt Seed Grant',
  '🏅 FM University Innovation',
  '⚡ < 60s Soil Testing',
  '🥇 State Level Winner 2026',
];
// Loop it: duplicate the array so ticker never shows a gap
const AWARDS_LOOPED = [...AWARDS, ...AWARDS];
```

### Feature Grid (screenshot 4 — exact titles, subtitles, icon styles)
```typescript
const QUICK_ACTIONS = [
  {
    id: 'analysis',
    emoji: '📈',         // web uses green trend-up arrow icon
    title: 'Instant Analysis',
    subtitle: 'Soil health data in seconds',
    tileBg: '#E8F5EE',   // mint green (matches web card)
    iconBg: '#C8E8D4',
    route: '/(app)/history',
  },
  {
    id: 'language',
    emoji: '🧠',         // web uses blue brain icon
    title: 'Local Language',
    subtitle: 'Odia, Hindi, English + 7 more',
    tileBg: '#E8F0FB',   // soft blue (matches web card)
    iconBg: '#C5D8F5',
    route: '/(app)/chat',
  },
  {
    id: 'farming',
    emoji: '🔬',         // web uses amber microscope icon
    title: 'Sustainable Farming',
    subtitle: 'AI fertilizer recommendations',
    tileBg: '#FDF8E7',   // warm amber (matches web card)
    iconBg: '#F5E8B4',
    route: '/(app)/chat',
    params: { prompt: 'Give me organic fertilizer recommendations for my soil' },
  },
  {
    id: 'map',
    emoji: '📍',         // web uses purple location pin icon
    title: 'Field Mapping',
    subtitle: 'GPS-tagged test locations',
    tileBg: '#F5F0FD',   // soft purple (matches web card)
    iconBg: '#DDD0F5',
    route: '/(app)/history',
    params: { tab: 'map' },
  },
];
```

### "How It Works" Steps (screenshot 8 — exact content)
```typescript
const HOW_IT_WORKS = [
  {
    step: 1,
    stepColor: '#4CAF50',    // green circle from web
    title: 'Scan Soil with Agni',
    body: 'Use the portable device to instantly analyze soil composition.',
    icon: '🔬',
  },
  {
    step: 2,
    stepColor: '#90CAF9',    // blue circle from web
    title: 'Connect to Saathi',
    body: 'Transfer data to our AI platform via Bluetooth.',
    icon: '📡',
  },
  {
    step: 3,
    stepColor: '#FDD835',    // yellow circle from web
    title: 'Get AI Recommendations',
    body: 'Receive personalized fertilizer advice in your language.',
    icon: '🤖',
  },
];
```

### Comparison Data (screenshots 2–3 — exact figures)
```typescript
// Used in the mini "Saathi vs Lab" card on home screen
const COMPARISON = {
  traditional: {
    waitTime: '14 Days',
    costPerTest: '₹800+',
    chemicals: 'Toxic chemicals',
    reports: 'Complex lab reports',
  },
  saathi: {
    speed: '< 60s',
    costPerTest: '~₹250',
    chemicals: 'Zero chemicals',
    languages: '3 Lang Voice Advisory',
    efficiency: '336× faster',
    costSaving: '69% cost down',
  },
};
```

### Stats (screenshot 1 — real live numbers as fallback)
```typescript
// These are the LIVE numbers from saathiai.org
// Use as fallback/placeholder while API loads
// Never hardcode — always fetch from API first
const STATS_FALLBACK = {
  farmsAnalyzed: 1401,
  soilTests: 78,
  aiRecommendations: 74,
};
```

---

## THE NEW HOME SCREEN — 7 SECTIONS

```
1. GRADIENT HEADER        ← Green gradient, greeting, glass stat pills
2. AGNI CONNECT CARD      ← Dark green, primary CTA (overlaps header)
3. SOIL HEALTH CARD       ← Latest test data with score ring
4. SAATHI VS LAB CARD     ← Mini comparison (inspired by web section 2-3)
5. QUICK ACTIONS GRID     ← 4 colored tiles matching web feature cards
6. HOW IT WORKS           ← Compact 3-step horizontal (from web section 8)
7. AWARDS TICKER          ← Auto-scroll, exact web content, at bottom
```

Then: Recent Tests row below grid (if data exists)

---

## SECTION 1 — GRADIENT HEADER

Inspired by: Screenshot 1 hero section color + screenshot 9 dark green CTA

```typescript
// Gradient matches web hero exactly:
// Start: #0D3B1D (deep forest, screenshot 9 bg top)
// End: #1A5C35 (rich green, screenshot 1 "Connect Your Device" button)
<LinearGradient
  colors={['#0D3B1D', '#1A5C35']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.header}
>
  {/* Subtle radial glow — top right, rgba green */}
  <View style={styles.headerGlow} />

  {/* TOP ROW */}
  <View style={styles.headerTop}>
    <View>
      <Text style={styles.greetingSmall}>{getGreeting()}</Text>
      <Text style={styles.greetingName}>{getFirstName(user)}</Text>
    </View>
    <View style={styles.headerRight}>
      {/* Bell with notification dot */}
      <TouchableOpacity style={styles.bellBtn}>
        <Text style={{ fontSize: 20 }}>🔔</Text>
        {hasUnread && <View style={styles.notifDot} />}
      </TouchableOpacity>
      {/* INITIALS AVATAR — never a photo */}
      <TouchableOpacity
        style={styles.avatar}
        onPress={() => router.push('/(app)/profile')}
      >
        <Text style={styles.avatarText}>
          {getInitials(user?.username || user?.email || 'FA')}
        </Text>
      </TouchableOpacity>
    </View>
  </View>

  {/* STATS ROW — 3 glass pills */}
  {/* Numbers from API: farms analyzed, soil tests, AI recommendations */}
  <View style={styles.statsRow}>
    {[
      { value: stats.farmsAnalyzed, label: 'Farms' },
      { value: stats.soilTests, label: 'Tests' },
      { value: stats.aiRecommendations, label: 'AI Tips' },
    ].map((stat, i) => (
      <View key={i} style={styles.statPill}>
        <Text style={styles.statValue}>
          {stat.value.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.statLabel}>{stat.label}</Text>
      </View>
    ))}
  </View>
</LinearGradient>
```

**Avatar initials logic:**
```typescript
const getInitials = (str: string): string => {
  if (!str) return 'FA';
  const parts = str.trim().split(/[\s_@.]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return str.slice(0, 2).toUpperCase();
};

const getFirstName = (user: User | null): string => {
  if (!user) return 'Farmer';
  const raw = user.username || user.email.split('@')[0];
  const name = raw.split(/[\s_]+/)[0];
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning 🌾';
  if (h < 17) return 'Good afternoon ☀️';
  return 'Good evening 🌙';
};
```

---

## SECTION 2 — AGNI CONNECT CARD

Inspired by: Screenshot 1 "Connect Your Device" button style + screenshot 9 dark section

This card overlaps the header by 48px using `marginTop: -48`.

```typescript
// STATES:
// A = not connected (default)
// B = connected this session

// STATE A:
<LinearGradient
  colors={['#1B4D2E', '#1A5C35']}   // matches web dark CTA bg
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={styles.agniCard}
>
  {/* Left: Bluetooth animation box */}
  <View style={styles.agniIconBox}>
    <Text style={{ fontSize: 26 }}>📡</Text>
  </View>

  {/* Center: text */}
  <View style={{ flex: 1 }}>
    <Text style={styles.agniTitle}>Connect Agni</Text>
    <Text style={styles.agniSub}>
      Pair via Bluetooth for live soil data
    </Text>
  </View>

  {/* Right: white pill button */}
  <TouchableOpacity
    style={styles.agniBtn}
    onPress={() => router.push('/(app)/connect')}
  >
    <Text style={styles.agniBtnText}>Connect →</Text>
  </TouchableOpacity>
</LinearGradient>

// STATE B (connected):
// Replace icon with ✅
// Replace title with "Agni Connected"
// Replace sub with "Synced [X] mins ago"
// Replace button with "View Data →" navigating to history
```

---

## SECTION 3 — SOIL HEALTH CARD

If no data: show clean empty state with CTA to Connect tab.
If data exists: show circular score + parameter chips.

```typescript
// ── EMPTY STATE ──
<View style={[styles.card, styles.emptyCard]}>
  <Text style={{ fontSize: 36, textAlign: 'center' }}>🌱</Text>
  <Text style={styles.emptyTitle}>No Soil Data Yet</Text>
  <Text style={styles.emptyBody}>
    Connect your Agni device to run your first soil test and see your soil health score.
  </Text>
  <TouchableOpacity
    style={styles.emptyBtn}
    onPress={() => router.push('/(app)/connect')}
  >
    <Text style={styles.emptyBtnText}>Connect Agni →</Text>
  </TouchableOpacity>
</View>

// ── POPULATED STATE ──
<View style={styles.card}>
  <View style={styles.cardHeader}>
    <Text style={styles.cardTitle}>Soil Health</Text>
    <TouchableOpacity onPress={() => router.push('/(app)/history')}>
      <Text style={styles.seeAll}>Full Report →</Text>
    </TouchableOpacity>
  </View>

  <View style={styles.soilRow}>
    {/* Circular ring — score 0-100 */}
    <SoilScoreRing score={healthScore} size={80} />

    <View style={{ flex: 1, marginLeft: 16 }}>
      {/* Label + emoji */}
      <Text style={styles.soilLabel}>
        {getHealthLabel(healthScore)}  {getHealthEmoji(healthScore)}
      </Text>
      {/* One-line insight */}
      <Text style={styles.soilInsight}>
        {getCropSuggestion(latestTest)}
      </Text>
      {/* Param chips */}
      <View style={styles.paramRow}>
        {[
          { label: `pH ${latestTest.ph.toFixed(1)}`, good: isPHGood(latestTest.ph) },
          { label: `N: ${getNLevel(latestTest.nitrogen)}`, good: latestTest.nitrogen >= 100 },
          { label: `K: ${getKLevel(latestTest.potassium)}`, good: latestTest.potassium >= 100 },
        ].map((chip, i) => (
          <View key={i} style={[styles.paramChip, chip.good ? styles.paramGood : styles.paramWarn]}>
            <Text style={[styles.paramText, chip.good ? styles.paramTextGood : styles.paramTextWarn]}>
              {chip.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  </View>
</View>

// Helper functions:
const getHealthLabel = (score: number) =>
  score >= 75 ? 'Good Soil Health' : score >= 50 ? 'Moderate' : 'Needs Attention';
const getHealthEmoji = (score: number) =>
  score >= 75 ? '🌱' : score >= 50 ? '⚠️' : '🔴';
const isPHGood = (ph: number) => ph >= 6.0 && ph <= 7.5;
const getNLevel = (n: number) => n >= 140 ? 'OK' : n >= 100 ? 'Low' : '↓';
const getKLevel = (k: number) => k >= 100 ? '↑' : '↓';
const getCropSuggestion = (test: SoilTest) => {
  if (test.ph >= 6.0 && test.ph <= 7.0 && test.moisture >= 40)
    return 'Perfect conditions for Rice planting';
  if (test.ph < 6.0) return 'Soil is acidic — consider lime treatment';
  return 'Good general conditions for farming';
};
```

---

## SECTION 4 — SAATHI VS LAB MINI CARD (NEW)

Inspired by: Screenshots 2 & 3 — the comparison section on web. Bring it to app as a compact single horizontal card.

This is NEW — doesn't exist in current app. It's a credibility card that reinforces Saathi's value proposition in one glance.

```typescript
<View style={styles.card}>
  <View style={styles.vsRow}>

    {/* LEFT — Traditional (red tint) */}
    <View style={styles.vsLeft}>
      <View style={styles.vsIcon}>
        <Text style={{ fontSize: 14 }}>❌</Text>
      </View>
      <Text style={styles.vsTitle}>Lab Testing</Text>
      <Text style={styles.vsBad}>14 days wait</Text>
      <Text style={styles.vsBad}>₹800+ per test</Text>
    </View>

    {/* DIVIDER */}
    <View style={styles.vsDivider}>
      <View style={styles.vsVsBadge}>
        <Text style={styles.vsVsText}>VS</Text>
      </View>
    </View>

    {/* RIGHT — Saathi (green tint) */}
    <View style={styles.vsRight}>
      <View style={[styles.vsIcon, { backgroundColor: '#E8F5EE' }]}>
        <Text style={{ fontSize: 14 }}>⚡</Text>
      </View>
      <Text style={[styles.vsTitle, { color: '#1A5C35' }]}>Saathi AI</Text>
      <Text style={styles.vsGood}>{'< 60 seconds'}</Text>
      <Text style={styles.vsGood}>{'~₹250 per test'}</Text>
    </View>
  </View>

  {/* Bottom: efficiency bar — matches web "336× FASTER" bar */}
  <View style={styles.efficiencyRow}>
    <Text style={styles.efficiencyLabel}>Efficiency vs Lab</Text>
    <Text style={styles.efficiencyBadge}>336× FASTER</Text>
  </View>
  <View style={styles.efficiencyBar}>
    <View style={styles.efficiencyFill} />
  </View>
</View>

// Styles:
vsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
vsLeft: { flex: 1, backgroundColor: '#FFF5F5', borderRadius: 12, padding: 12, alignItems: 'center' },
vsRight: { flex: 1, backgroundColor: '#F0FBF4', borderRadius: 12, padding: 12, alignItems: 'center' },
vsIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFE8E8', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
vsTitle: { fontFamily: 'Sora_700Bold', fontSize: 13, color: '#1A2E1E', marginBottom: 4 },
vsBad: { fontFamily: 'Sora_400Regular', fontSize: 11, color: '#C62828', marginTop: 2 },
vsGood: { fontFamily: 'Sora_400Regular', fontSize: 11, color: '#1A5C35', marginTop: 2 },
vsDivider: { width: 24, alignItems: 'center', justifyContent: 'center', paddingTop: 16 },
vsVsBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center' },
vsVsText: { fontFamily: 'Sora_800ExtraBold', fontSize: 8, color: '#1A5C35' },
efficiencyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
efficiencyLabel: { fontFamily: 'Sora_400Regular', fontSize: 11, color: '#6B8A72' },
efficiencyBadge: { fontFamily: 'Sora_700Bold', fontSize: 11, color: '#1A5C35' },
efficiencyBar: { height: 6, backgroundColor: '#E8F5EE', borderRadius: 3, marginTop: 6 },
efficiencyFill: { width: '95%', height: '100%', backgroundColor: '#1A5C35', borderRadius: 3 },
```

---

## SECTION 5 — QUICK ACTIONS GRID

Four tiles matching the exact web feature card colors from screenshot 4.

```typescript
// 2×2 grid using flexWrap
<View style={styles.sectionHeader}>
  <Text style={styles.sectionTitle}>Quick Actions</Text>
</View>

<View style={styles.gridWrap}>
  {QUICK_ACTIONS.map(action => (
    <TouchableOpacity
      key={action.id}
      style={[styles.tile, { backgroundColor: Colors.surface }]}
      onPress={() => router.push({ pathname: action.route, params: action.params })}
      activeOpacity={0.85}
    >
      {/* Icon box — colored bg from Colors matching web card */}
      <View style={[styles.tileIconBox, { backgroundColor: action.tileBg }]}>
        <Text style={styles.tileEmoji}>{action.emoji}</Text>
      </View>
      <Text style={styles.tileTitle}>{action.title}</Text>
      <Text style={styles.tileSub}>{action.subtitle}</Text>
    </TouchableOpacity>
  ))}
</View>
```

The 4 tiles and their exact color mappings from screenshots:

| Tile | Web Card Color | `tileBg` | Icon |
|---|---|---|---|
| Instant Analysis | Mint green | `#E8F5EE` | 📈 |
| Local Language | Soft blue | `#E8F0FB` | 🧠 |
| Sustainable Farming | Warm amber | `#FDF8E7` | 🔬 |
| Field Mapping | Soft purple | `#F5F0FD` | 📍 |

---

## SECTION 6 — HOW IT WORKS (Horizontal compact)

Inspired by: Screenshot 8 — 3-step cards on web. Converted to horizontal scroll on app.

```typescript
<View style={styles.sectionHeader}>
  <Text style={styles.sectionTitle}>How It Works</Text>
</View>

<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}
>
  {HOW_IT_WORKS.map((step) => (
    <View key={step.step} style={styles.stepCard}>
      {/* Step number badge — colored circles from web */}
      <View style={[styles.stepBadge, { backgroundColor: step.stepColor + '33' }]}>
        <Text style={[styles.stepNum, { color: step.stepColor === '#FDD835' ? '#997700' : step.stepColor }]}>
          {step.step}
        </Text>
      </View>
      <Text style={{ fontSize: 32, marginVertical: 10 }}>{step.icon}</Text>
      <Text style={styles.stepTitle}>{step.title}</Text>
      <Text style={styles.stepBody}>{step.body}</Text>
    </View>
  ))}
</ScrollView>

// Step card styles:
stepCard: {
  width: 160,
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 16,
  alignItems: 'center',
  shadowColor: '#1A5C35',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.07,
  shadowRadius: 10,
  elevation: 3,
},
stepBadge: {
  width: 32, height: 32,
  borderRadius: 16,
  alignItems: 'center', justifyContent: 'center',
  alignSelf: 'flex-start',
},
stepNum: { fontFamily: 'Sora_800ExtraBold', fontSize: 14 },
stepTitle: { fontFamily: 'Sora_700Bold', fontSize: 13, color: '#1A2E1E', textAlign: 'center', marginBottom: 4 },
stepBody: { fontFamily: 'Sora_400Regular', fontSize: 11, color: '#6B8A72', textAlign: 'center', lineHeight: 16 },
```

---

## SECTION 7 — AWARDS TICKER (Bottom)

Exact content from screenshot 2 awards row. Auto-scrolling loop.

```typescript
// Animated scroll — loops indefinitely
const scrollX = useRef(new Animated.Value(0)).current;

useEffect(() => {
  const totalWidth = AWARDS.length * 160; // approximate
  Animated.loop(
    Animated.timing(scrollX, {
      toValue: -totalWidth,
      duration: totalWidth * 40,   // ms per pixel — adjust for speed
      easing: Easing.linear,
      useNativeDriver: true,
    })
  ).start();
}, []);

// Render:
<View style={styles.tickerContainer}>
  <Animated.View
    style={[styles.tickerTrack, { transform: [{ translateX: scrollX }] }]}
  >
    {AWARDS_LOOPED.map((award, i) => (
      <View key={i} style={styles.tickerPill}>
        <Text style={styles.tickerText}>{award}</Text>
      </View>
    ))}
  </Animated.View>
</View>

// Styles:
tickerContainer: {
  overflow: 'hidden',
  marginHorizontal: -16,
  marginTop: 8,
  marginBottom: 24,
},
tickerTrack: {
  flexDirection: 'row',
  paddingVertical: 6,
  paddingLeft: 16,
},
tickerPill: {
  backgroundColor: '#E8F5EE',
  borderWidth: 1,
  borderColor: '#C8E6D0',
  borderRadius: 20,
  paddingHorizontal: 14,
  paddingVertical: 7,
  marginRight: 8,
},
tickerText: {
  fontFamily: 'Sora_600SemiBold',
  fontSize: 11,
  color: '#1A5C35',
  whiteSpace: 'nowrap',
},
```

---

## BOTTOM NAVIGATION — 5 TABS (UPDATED)

From current 4 → 5 tabs. Profile is added as a proper tab.

```typescript
// Tab bar extracted design from web nav:
// Active: #1A5C35 (same as web "Dashboard" underline green)
// Inactive: #6B8A72
// Background: white with very slight blur

const TABS = [
  { name: 'Home',     icon: '🏠', route: '/(app)/dashboard'  },
  { name: 'Connect',  icon: '📡', route: '/(app)/connect'    },
  { name: 'AI Chat',  icon: '🤖', route: '/(app)/chat'       },
  { name: 'History',  icon: '📈', route: '/(app)/history'    },
  { name: 'Profile',  icon: '👤', route: '/(app)/profile'    },
];

// Styles:
tabBar: {
  flexDirection: 'row',
  backgroundColor: 'rgba(255,255,255,0.97)',
  borderTopWidth: 1,
  borderTopColor: '#C8E6D0',
  paddingTop: 8,
  paddingBottom: 24,   // accounts for iPhone home indicator
},
tabItem: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 3,
},
tabIcon: { fontSize: 22 },
tabLabel: {
  fontFamily: 'Sora_600SemiBold',
  fontSize: 10,
},
// Active tab:
tabLabelActive: { color: '#1A5C35' },
tabLabelInactive: { color: '#6B8A72' },
// Active indicator dot under label:
tabDot: {
  width: 4, height: 4,
  borderRadius: 2,
  backgroundColor: '#1A5C35',
  marginTop: 2,
},
```

---

## COMPLETE STYLESHEET

```typescript
const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: '#F0FBF4' },

  // ── HEADER ──
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 72,
  },
  headerGlow: {
    position: 'absolute',
    top: -40, right: -40,
    width: 200, height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(76,175,110,0.15)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greetingSmall: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.70)',
  },
  greetingName: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 26,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#E53935',
    borderWidth: 1.5, borderColor: '#1A5C35',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 15, color: '#fff', letterSpacing: 0.5,
  },
  statsRow: { flexDirection: 'row', gap: 10 },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
    borderRadius: 16, paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 20, color: '#FFFFFF',
  },
  statLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: 10, color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },

  // ── SCROLLABLE BODY ──
  body: { flex: 1, marginTop: -48, paddingHorizontal: 16 },

  // ── AGNI CARD ──
  agniCard: {
    borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 14,
    shadowColor: '#0D3B1D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30, shadowRadius: 20, elevation: 8,
    overflow: 'hidden',
  },
  agniIconBox: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  agniTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 16, color: '#fff' },
  agniSub: { fontFamily: 'Sora_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  agniBtn: {
    height: 38, paddingHorizontal: 16,
    backgroundColor: '#fff', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  agniBtnText: { fontFamily: 'Sora_700Bold', fontSize: 13, color: '#1A5C35' },

  // ── CARDS (shared) ──
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    padding: 18, marginBottom: 14,
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  cardTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#1A2E1E' },
  seeAll: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: '#1A5C35' },

  // ── EMPTY STATE ──
  emptyCard: { alignItems: 'center', paddingVertical: 28 },
  emptyTitle: { fontFamily: 'Sora_700Bold', fontSize: 16, color: '#1A2E1E', marginTop: 10 },
  emptyBody: { fontFamily: 'Sora_400Regular', fontSize: 13, color: '#6B8A72', textAlign: 'center', marginTop: 6, lineHeight: 20, paddingHorizontal: 10 },
  emptyBtn: { marginTop: 16, height: 44, paddingHorizontal: 24, backgroundColor: '#1A5C35', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { fontFamily: 'Sora_700Bold', fontSize: 14, color: '#fff' },

  // ── SOIL HEALTH ──
  soilRow: { flexDirection: 'row', alignItems: 'center' },
  soilLabel: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#1A2E1E' },
  soilInsight: { fontFamily: 'Sora_400Regular', fontSize: 12, color: '#6B8A72', marginTop: 3, marginBottom: 10 },
  paramRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  paramChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  paramGood: { backgroundColor: '#E8F5EE' },
  paramWarn: { backgroundColor: '#FFF3E0' },
  paramText: { fontFamily: 'Sora_600SemiBold', fontSize: 11 },
  paramTextGood: { color: '#1A5C35' },
  paramTextWarn: { color: '#E65100' },

  // ── SECTION HEADERS ──
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10, marginTop: 2,
  },
  sectionTitle: { fontFamily: 'Sora_700Bold', fontSize: 16, color: '#1A2E1E' },

  // ── FEATURE GRID ──
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  tile: {
    width: '47.5%', borderRadius: 18, padding: 16,
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  tileIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  tileEmoji: { fontSize: 22 },
  tileTitle: { fontFamily: 'Sora_700Bold', fontSize: 13, color: '#1A2E1E' },
  tileSub: { fontFamily: 'Sora_400Regular', fontSize: 11, color: '#6B8A72', marginTop: 2, lineHeight: 15 },

  // ── AWARDS TICKER ──
  tickerContainer: { overflow: 'hidden', marginHorizontal: -16, marginBottom: 28 },
  tickerTrack: { flexDirection: 'row', paddingVertical: 6, paddingLeft: 16 },
  tickerPill: {
    backgroundColor: '#E8F5EE', borderWidth: 1, borderColor: '#C8E6D0',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8,
  },
  tickerText: { fontFamily: 'Sora_600SemiBold', fontSize: 11, color: '#1A5C35' },
});
```

---

## VERIFICATION — SCREENSHOT BY SCREENSHOT

| Web Screenshot | What it inspired in App |
|---|---|
| 1 — Hero + 3D Agni | Header gradient, stat pills, Agni card style |
| 2 — Awards ticker | Exact 7 badge texts, exact order, bottom placement |
| 2–3 — Comparison | Mini Saathi vs Lab card (Section 4) |
| 4 — Feature cards | Quick Actions 4 tiles with exact colors |
| 5 — Hardware spotlight | Agni Connect card content/spec chips |
| 6–7 — Software spotlight | AI Chat quick actions prompt text |
| 8 — How It Works | 3-step horizontal scroll with colored badges |
| 9 — Dark CTA | Agni Connect card gradient (`#1B4D2E → #1A5C35`) |

---

## DO NOT INCLUDE ON HOME SCREEN

These web sections stay on their respective app screens:

| Web section | App equivalent |
|---|---|
| Full comparison cards | Just the mini VS card above |
| Hardware spotlight full | Buy Agni screen |
| "Grow More. Waste Nothing." CTA | Subscribe / Buy Agni screen |
| Software feature cards | AI Chat screen |
| Footer with language list | About / Profile screen |

---

*Home Screen Enhancement v2 · Real data from saathiai.org screenshots*  
*Mitti-AI Innovations · `app/(app)/dashboard.tsx`*
