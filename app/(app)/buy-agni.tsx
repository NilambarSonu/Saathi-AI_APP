import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions,
  FlatList, Alert, ActivityIndicator, Platform, StatusBar,
  Animated, Easing, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { useDarkModeTheme } from '@/context/ThemeContext';

const { width: W } = Dimensions.get('window');
const PRICE = 4699;
const MRP   = 5999;
const OFF   = Math.round((1 - PRICE / MRP) * 100);

const FEATURES = [
  { icon:'flask-outline',            title:'6-in-1 Analysis',   desc:'NPK · pH · Moisture · EC · Temp',  grad:['#1A7A40','#4ade80'] as const },
  { icon:'wifi-outline',             title:'Works Offline',     desc:'Bluetooth 5.0, no SIM needed',     grad:['#0369a1','#38bdf8'] as const },
  { icon:'battery-full-outline',     title:'30-Day Battery',    desc:'Full season on one charge',        grad:['#0D5C2E','#22A05A'] as const },
  { icon:'sparkles-outline',         title:'AI Crop Advice',    desc:'Gemini-powered recommendations',   grad:['#b45309','#fbbf24'] as const },
  { icon:'shield-checkmark-outline', title:'1-Year Warranty',   desc:'Full manufacturer support',        grad:['#9333ea','#c084fc'] as const },
  { icon:'car-outline',              title:'Free Delivery',     desc:'Doorstep across Odisha',           grad:['#0f766e','#2dd4bf'] as const },
];

const SPECS = [
  ['Connectivity',  'Bluetooth 5.0'],
  ['Charging',      'USB Type-C'],
  ['Battery Life',  '30 days'],
  ['Resistance',    'IP54 Waterproof'],
  ['App Platforms', 'Android & iOS'],
  ['Parameters',    'NPK, pH, EC, Temp'],
  ['Warranty',      '1 Year Full'],
  ['In Box',        'Device + Cable + Manual'],
];

const REVIEWS = [
  { name:'Ramesh K.',  loc:'Bhubaneswar', text:'Yield improved 30% in my first season!', stars:5 },
  { name:'Priya D.',   loc:'Pune',        text:'Accurate results without any internet.',  stars:5 },
  { name:'Suresh M.',  loc:'Vizag',       text:'Battery lasts the full growing season.',  stars:4 },
];

// ─── Product slides ──────────────────────────────────────────────────────────
type SlideData = { type: 'video' | 'image'; source: any; label: string; sub: string };

const SLIDES: SlideData[] = [
  {
    type:   'image',
    source: require('../../assets/images/Agni_Device.png'),
    label:  'Agni Device',
    sub:    'Rugged, compact design for any farm',
  },
  {
    type:   'image',
    source: require('../../assets/images/agni_detail_1.png'),
    label:  'High Precision',
    sub:    'Laboratory-grade sensors, field-tested',
  },
  {
    type:   'image',
    source: require('../../assets/images/agni_detail_2.png'),
    label:  'Easy Interface',
    sub:    'Clear insights, simplified dashboard',
  },
  {
    type:   'video',
    source: require('../../assets/video/demo_calibration.mp4'),
    label:  'Sensor Calibration',
    sub:    'Automatic precision calibration in seconds',
  },
  {
    type:   'video',
    source: require('../../assets/video/demo_field.mp4'),
    label:  'Field Testing',
    sub:    'Real-time readings from your farm soil',
  },
  {
    type:   'video',
    source: require('../../assets/video/demo_night.mp4'),
    label:  'Night Mode Demo',
    sub:    'Works in any light condition, 24 × 7',
  },
  {
    type:   'video',
    source: require('../../assets/video/demo_tech.mp4'),
    label:  'AI in Action',
    sub:    'Powered by Google Gemini AI',
  },
];

function Stars({ n }: { n: number }) {
  return (
    <View style={{ flexDirection:'row', gap:2 }}>
      {[0,1,2,3,4].map(i => (
        <Ionicons key={i} name={i < n ? 'star' : 'star-outline'} size={13} color={i < n ? '#f59e0b' : '#d1fae5'} />
      ))}
    </View>
  );
}

function PulsingBadge({ text }: { text: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue:1.07, duration:900, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
      Animated.timing(scale, { toValue:1,    duration:900, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={{ transform:[{ scale }] }}>
      <LinearGradient colors={['#f97316','#dc2626']} start={{x:0,y:0}} end={{x:1,y:0}}
        style={{ paddingHorizontal:14, paddingVertical:6, borderRadius:20 }}>
        <Text style={{ fontFamily:'Sora_700Bold', fontSize:11, color:'#fff', letterSpacing:0.5 }}>{text}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Individual slide (image or video) ───────────────────────────────────────
function SlideItem({ item, theme }: { item: SlideData; theme: any }) {
  if (item.type === 'image') {
    return (
      <View style={[s.slide, { width: W, backgroundColor: theme.primaryDark }]}>
        <Image
          source={item.source}
          style={{ width: W, height: 270 }}
          resizeMode="cover"
        />
        <LinearGradient colors={['transparent', 'rgba(13,92,46,0.82)']} style={s.slideOverlay}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Ionicons name="camera-outline" size={16} color="#fff" />
            <Text style={s.slideLabel}>{item.label}</Text>
          </View>
          <View style={s.slideSubPill}>
            <Text style={s.slideSubTxt}>{item.sub}</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[s.slide, { width: W, backgroundColor: '#000' }]}>
      <Video
        source={item.source}
        style={{ width: W, height: 270 }}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.70)']} style={s.slideOverlay}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Ionicons name="play-circle-outline" size={16} color="#fff" />
          <Text style={s.slideLabel}>{item.label}</Text>
        </View>
        <View style={s.slideSubPill}>
          <Text style={s.slideSubTxt}>{item.sub}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}


export default function BuyAgniScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { theme, isDark } = useDarkModeTheme();
  const [slide, setSlide] = useState(0);
  const [qty,   setQty]   = useState(1);
  const [busy,  setBusy]  = useState(0);
  const flatRef = useRef<FlatList>(null);
  const total = PRICE * qty;

  const buy = (mode: 1|2) => {
    setBusy(mode);
    setTimeout(() => {
      setBusy(0);
      const id = Math.random().toString(36).substr(2,8).toUpperCase();
      Alert.alert(
        mode === 2 ? '✅ Order Placed!' : '🛒 Added to Cart',
        `Order #${id} received!\n\nOur team will call within 24 hrs to confirm delivery.\n💳 COD available.`,
        [{ text:'Got it!' }]
      );
    }, 1600);
  };

  return (
    <View style={{ flex:1, backgroundColor: theme.background }}>
      <StatusBar barStyle="light-content" />

      {/* ── Top bar ── */}
      <LinearGradient colors={[theme.primaryDark, theme.primary]}
        style={[s.topBar, { paddingTop: insets.top || (Platform.OS==='android' ? (StatusBar.currentHeight ?? 20) : 0) + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.backCircle} hitSlop={12}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </Pressable>
        <Text style={s.topTitle}>Agni Soil Sensor</Text>
        <View style={s.backCircle}>
          <Ionicons name="share-outline" size={18} color="#fff" />
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:120 }}>

        {/* ── Image / Video carousel ── */}
        <FlatList
          ref={flatRef}
          data={SLIDES}
          horizontal pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => setSlide(Math.round(e.nativeEvent.contentOffset.x / W))}
          keyExtractor={(_,i)=>String(i)}
          renderItem={({ item }) => <SlideItem item={item} theme={theme} />}
        />

        {/* Slide dots */}
        <View style={[s.slideDots, { backgroundColor: theme.background }]}>
          {SLIDES.map((_,i) => (
            <Pressable key={i} onPress={() => { flatRef.current?.scrollToIndex({index:i,animated:true}); setSlide(i); }}>
              <View style={[s.dot, slide===i ? [s.dotA, { backgroundColor: theme.secondary }] : { backgroundColor: isDark ? theme.sep1 : '#c5dbc8' }]} />
            </Pressable>
          ))}
        </View>

        <View style={s.body}>

          {/* ── Title row ── */}
          <View style={s.titleRow}>
            <View style={{ flex:1 }}>
              <Text style={[s.productName, { color: theme.textPrimary }]}>Saathi Agni{'\n'}Smart Soil Sensor</Text>
              <View style={s.ratingRow}>
                <Stars n={5} />
                <Text style={[s.ratingTxt, { color: theme.textMuted }]}> 4.8  ·  250 ratings</Text>
              </View>
            </View>
            <PulsingBadge text={`${OFF}% OFF`} />
          </View>

          {/* ── Price card ── */}
          <View style={[s.priceCard, { shadowColor: theme.primary }]}>
            <LinearGradient colors={isDark ? [theme.surface, theme.background] : ['#E8F8EE', '#fff']} style={[s.priceCardInner, { borderColor: theme.sep1 }]}>
              <View style={s.priceTopRow}>
                <View>
                  <Text style={[s.priceMain, { color: theme.primary }]}>₹{PRICE.toLocaleString('en-IN')}</Text>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginTop:3 }}>
                    <Text style={[s.priceMrp, { color: theme.textMuted }]}>₹{MRP.toLocaleString('en-IN')}</Text>
                    <View style={[s.savePill, { backgroundColor: theme.fillGreen }]}>
                      <Text style={[s.saveTxt, { color: theme.primary }]}>Save ₹{(MRP-PRICE).toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                </View>
                <View style={s.trustStack}>
                  {['Free Ship','1-Yr Warranty','COD OK'].map(t => (
                    <View key={t} style={[s.trustChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <Ionicons name="checkmark-circle" size={12} color={theme.secondary} />
                      <Text style={[s.trustChipTxt, { color: theme.textSecondary }]}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Text style={[s.taxNote, { color: theme.textMuted }]}>Inclusive of GST · Free delivery in Odisha</Text>

              {/* Qty control */}
              <View style={[s.qtyRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[s.qtyLabel, { color: theme.textSecondary }]}>Quantity</Text>
                <View style={[s.qtyControl, { borderColor: theme.sep1 }]}>
                  <Pressable onPress={() => setQty(q => Math.max(1,q-1))} style={[s.qtyBtn, { backgroundColor: theme.surfaceAlt }]}>
                    <Ionicons name="remove" size={18} color={qty<=1 ? theme.textMuted : theme.primaryDark} />
                  </Pressable>
                  <Text style={[s.qtyVal, { color: theme.textPrimary }]}>{qty}</Text>
                  <Pressable onPress={() => setQty(q => q+1)} style={[s.qtyBtn, { backgroundColor: theme.surfaceAlt }]}>
                    <Ionicons name="add" size={18} color={theme.primaryDark} />
                  </Pressable>
                </View>
                <Text style={[s.qtyTotal, { color: theme.primary }]}>₹{total.toLocaleString('en-IN')}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* ── Features grid ── */}
          <Text style={[s.secLabel, { color: theme.textMuted }]}>KEY FEATURES</Text>
          <View style={s.featGrid}>
            {FEATURES.map((f,i) => (
              <View key={i} style={[s.featCard, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.primary }]}>
                <LinearGradient colors={f.grad} style={s.featIcon}>
                  <Ionicons name={f.icon as any} size={20} color="#fff" />
                </LinearGradient>
                <Text style={[s.featTitle, { color: theme.textPrimary }]}>{f.title}</Text>
                <Text style={[s.featDesc, { color: theme.textMuted }]}>{f.desc}</Text>
              </View>
            ))}
          </View>

          {/* ── Specs table ── */}
          <Text style={[s.secLabel, { color: theme.textMuted }]}>SPECIFICATIONS</Text>
          <View style={[s.specsCard, { borderColor: theme.border, shadowColor: theme.primary }]}>
            {SPECS.map(([k,v],i) => (
              <View key={k} style={[s.specRow, { backgroundColor: theme.surface }, i%2===0 && { backgroundColor: theme.surfaceAlt },
                i===0 && { borderTopLeftRadius:16, borderTopRightRadius:16 },
                i===SPECS.length-1 && { borderBottomLeftRadius:16, borderBottomRightRadius:16 }]}>
                <Text style={[s.specKey, { color: theme.textMuted }]}>{k}</Text>
                <Text style={[s.specVal, { color: theme.textPrimary }]}>{v}</Text>
              </View>
            ))}
          </View>

          {/* ── Reviews ── */}
          <Text style={[s.secLabel, { color: theme.textMuted }]}>CUSTOMER REVIEWS</Text>
          {REVIEWS.map((r,i) => (
            <View key={i} style={[s.reviewCard, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.primary }]}>
              <View style={s.reviewTop}>
                <LinearGradient colors={[theme.primaryDark, theme.secondary]} style={s.revAvatar}>
                  <Text style={s.revAvatarTxt}>{r.name[0]}</Text>
                </LinearGradient>
                <View style={{ flex:1 }}>
                  <Text style={[s.revName, { color: theme.textPrimary }]}>{r.name}</Text>
                  <Text style={[s.revLoc, { color: theme.textMuted }]}>{r.loc}</Text>
                </View>
                <Stars n={r.stars} />
              </View>
              <Text style={[s.revText, { color: theme.textSecondary }]}>"{r.text}"</Text>
              <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginTop:8 }}>
                <Ionicons name="checkmark-circle" size={12} color={theme.secondary} />
                <Text style={[s.revVerified, { color: theme.secondary }]}>Verified Purchase</Text>
              </View>
            </View>
          ))}

          {/* ── Security strip ── */}
          <View style={[s.secStrip, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.primary }]}>
            {[
              { icon:'lock-closed-outline',    t:'Secure Checkout' },
              { icon:'cash-outline',           t:'COD Available' },
              { icon:'return-up-back-outline', t:'30-Day Returns' },
            ].map(b => (
              <View key={b.t} style={s.secStripItem}>
                <View style={[s.secStripIcon, { backgroundColor: theme.fillGreen }]}>
                  <Ionicons name={b.icon as any} size={18} color={theme.primary} />
                </View>
                <Text style={[s.secStripTxt, { color: theme.textSecondary }]}>{b.t}</Text>
              </View>
            ))}
          </View>

        </View>
      </ScrollView>

      {/* ── Sticky CTA bar ── */}
      <View style={[s.cta, { backgroundColor: theme.surface, borderTopColor: theme.sep1, paddingBottom: insets.bottom || 16, shadowColor: theme.primary }]}>
        <View>
          <Text style={[s.ctaPrice, { color: theme.primaryDark }]}>₹{total.toLocaleString('en-IN')}</Text>
          <Text style={[s.ctaQty, { color: theme.textMuted }]}>{qty} unit{qty>1?'s':''} · Free delivery</Text>
        </View>
        <View style={{ flexDirection:'row', gap:10 }}>
          <Pressable onPress={() => buy(1)} style={[s.cartBtn, { backgroundColor: theme.fillGreen, borderColor: theme.secondary }]} disabled={!!busy}>
            {busy===1 ? <ActivityIndicator size="small" color={theme.primaryDark} />
              : <Ionicons name="cart-outline" size={22} color={theme.primaryDark} />}
          </Pressable>
          <Pressable onPress={() => buy(2)} disabled={!!busy}
            style={[s.buyBtn, !!busy && { opacity:0.7 }]}>
            <LinearGradient colors={[theme.primaryDark, theme.secondary]} start={{x:0,y:0}} end={{x:1,y:0}} style={s.buyBtnGrad}>
              {busy===2 ? <ActivityIndicator size="small" color="#fff" />
                : <><Ionicons name="flash" size={18} color="#fff" />
                    <Text style={s.buyBtnTxt}>Buy Now</Text></>}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Header
  topBar: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingBottom:12 },
  topTitle: { fontFamily:'Sora_700Bold', fontSize:17, color:'#fff' },
  backCircle: { width:40, height:40, borderRadius:20, backgroundColor:'rgba(255,255,255,0.18)', alignItems:'center', justifyContent:'center' },

  // Slides
  slide: { height:270, overflow:'hidden', position:'relative' },
  slideOverlay: { position:'absolute', bottom:0, left:0, right:0, paddingBottom:18, paddingTop:80, paddingHorizontal:18 },
  slideLabel: { fontFamily:'Sora_700Bold', fontSize:17, color:'#fff', textShadowColor:'rgba(0,0,0,0.4)', textShadowOffset:{width:0,height:1}, textShadowRadius:4 },
  slideSubPill: { alignSelf:'flex-start', backgroundColor:'rgba(255,255,255,0.2)', paddingHorizontal:12, paddingVertical:4, borderRadius:16, borderWidth:1, borderColor:'rgba(255,255,255,0.3)' },
  slideSubTxt: { fontFamily:'Sora_400Regular', fontSize:11, color:'#fff' },

  // Dots
  slideDots: { flexDirection:'row', justifyContent:'center', gap:7, marginVertical:14 },
  dot: { width:7, height:7, borderRadius:4 },
  dotA: { width:22 },

  body: { paddingHorizontal:18 },

  // Title
  titleRow: { flexDirection:'row', alignItems:'flex-start', gap:12, marginBottom:18 },
  productName: { fontFamily:'Sora_800ExtraBold', fontSize:23, lineHeight:32, marginBottom:8 },
  ratingRow: { flexDirection:'row', alignItems:'center' },
  ratingTxt: { fontFamily:'Sora_400Regular', fontSize:12 },

  // Price card
  priceCard: { borderRadius:20, overflow:'hidden', marginBottom:22,
    shadowOffset:{width:0,height:4}, shadowOpacity:1, shadowRadius:12, elevation:5 },
  priceCardInner: { borderRadius:20, padding:18, borderWidth:1.5 },
  priceTopRow: { flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 },
  priceMain: { fontFamily:'Sora_800ExtraBold', fontSize:34 },
  priceMrp: { fontFamily:'Sora_400Regular', fontSize:14, textDecorationLine:'line-through' },
  savePill: { paddingHorizontal:10, paddingVertical:3, borderRadius:10 },
  saveTxt: { fontFamily:'Sora_700Bold', fontSize:12 },
  trustStack: { gap:6, alignItems:'flex-end' },
  trustChip: { flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:10, paddingVertical:4, borderRadius:10, borderWidth:1 },
  trustChipTxt: { fontFamily:'Sora_600SemiBold', fontSize:10 },
  taxNote: { fontFamily:'Sora_400Regular', fontSize:11, marginBottom:14 },
  qtyRow: { flexDirection:'row', alignItems:'center', gap:12, borderRadius:14, padding:12, borderWidth:1 },
  qtyLabel: { fontFamily:'Sora_600SemiBold', fontSize:12, flex:1 },
  qtyControl: { flexDirection:'row', alignItems:'center', borderWidth:1.5, borderRadius:12, overflow:'hidden' },
  qtyBtn: { width:34, height:34, alignItems:'center', justifyContent:'center' },
  qtyVal: { width:36, textAlign:'center', fontFamily:'Sora_700Bold', fontSize:16 },
  qtyTotal: { fontFamily:'Sora_800ExtraBold', fontSize:18 },

  // Features
  secLabel: { fontFamily:'Sora_700Bold', fontSize:11, letterSpacing:2, marginBottom:13, marginTop:4 },
  featGrid: { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:22 },
  featCard: { width:(W-46)/2, borderRadius:18, padding:14,
    borderWidth:1,
    shadowOffset:{width:0,height:3}, shadowOpacity:1, shadowRadius:8, elevation:3 },
  featIcon: { width:44, height:44, borderRadius:13, alignItems:'center', justifyContent:'center', marginBottom:10 },
  featTitle: { fontFamily:'Sora_700Bold', fontSize:13, marginBottom:4 },
  featDesc: { fontFamily:'Sora_400Regular', fontSize:11, lineHeight:16 },

  // Specs
  specsCard: { borderRadius:16, overflow:'hidden', marginBottom:22, borderWidth:1,
    shadowOffset:{width:0,height:2}, shadowOpacity:1, shadowRadius:8, elevation:2 },
  specRow: { flexDirection:'row', paddingVertical:13, paddingHorizontal:16 },
  specKey: { flex:1, fontFamily:'Sora_400Regular', fontSize:13 },
  specVal: { fontFamily:'Sora_700Bold', fontSize:13, textAlign:'right' },

  // Reviews
  reviewCard: { borderRadius:18, padding:16, marginBottom:10,
    borderWidth:1,
    shadowOffset:{width:0,height:2}, shadowOpacity:1, shadowRadius:8, elevation:2 },
  reviewTop: { flexDirection:'row', alignItems:'center', gap:10, marginBottom:10 },
  revAvatar: { width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center' },
  revAvatarTxt: { fontFamily:'Sora_700Bold', fontSize:17, color:'#fff' },
  revName: { fontFamily:'Sora_700Bold', fontSize:13 },
  revLoc: { fontFamily:'Sora_400Regular', fontSize:11 },
  revText: { fontFamily:'Sora_400Regular', fontSize:13, lineHeight:20, fontStyle:'italic' },
  revVerified: { fontFamily:'Sora_600SemiBold', fontSize:11 },

  // Security strip
  secStrip: { flexDirection:'row', borderRadius:16, padding:14, gap:4, marginBottom:20,
    borderWidth:1,
    shadowOffset:{width:0,height:2}, shadowOpacity:1, shadowRadius:8, elevation:2 },
  secStripItem: { flex:1, alignItems:'center', gap:8 },
  secStripIcon: { width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center' },
  secStripTxt: { fontFamily:'Sora_600SemiBold', fontSize:10, textAlign:'center' },

  // CTA
  cta: { position:'absolute', bottom:0, left:0, right:0,
    borderTopWidth:1.5, paddingTop:12, paddingHorizontal:18,
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    shadowOffset:{width:0,height:-4}, shadowOpacity:1, shadowRadius:12, elevation:10 },
  ctaPrice: { fontFamily:'Sora_800ExtraBold', fontSize:20 },
  ctaQty: { fontFamily:'Sora_400Regular', fontSize:11 },
  cartBtn: { width:50, height:50, borderRadius:14, alignItems:'center', justifyContent: 'center', borderWidth:1.5 },
  buyBtn: { borderRadius:14, overflow:'hidden' },
  buyBtnGrad: { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:24, paddingVertical:15 },
  buyBtnTxt: { fontFamily:'Sora_700Bold', fontSize:16, color:'#fff' },
});
