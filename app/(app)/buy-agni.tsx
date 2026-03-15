import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions,
  Image, FlatList, Alert, ActivityIndicator, Platform, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';

const { width: SCREEN_W } = Dimensions.get('window');
const GALLERY_W = SCREEN_W - Spacing.xl * 2;

const PRODUCT_PRICE = 4699;
const ORIGINAL_PRICE = 5999;
const DISCOUNT = Math.round((1 - PRODUCT_PRICE / ORIGINAL_PRICE) * 100);

// ─── Data ────────────────────────────────────────────────────
const FEATURES = [
  { icon: 'wifi-outline', text: 'Works without Internet' },
  { icon: 'battery-full-outline', text: '30-day battery life' },
  { icon: 'phone-portrait-outline', text: 'AI mobile app included' },
  { icon: 'shield-checkmark-outline', text: '1-Year Warranty' },
  { icon: 'car-outline', text: 'Free shipping in Odisha' },
  { icon: 'return-up-back-outline', text: '30-day returns' },
];

const TRUST_BADGES = [
  { icon: 'car-outline', label: 'Free Delivery', sub: 'In Odisha' },
  { icon: 'shield-checkmark-outline', label: '1-Year Warranty', sub: 'Manufacturer' },
  { icon: 'return-up-back-outline', label: '30-Day Returns', sub: 'Hassle-free' },
];

const SPECS = [
  ['Connectivity', 'Bluetooth 5.0'],
  ['Charging', 'USB Type-C'],
  ['Battery Life', 'Up to 30 days'],
  ['Water Resistance', 'IP54'],
  ['App Support', 'Android & iOS'],
  ['Parameters', 'NPK, pH, Moisture, EC, Temp'],
  ['Warranty', '1 Year Manufacturer'],
  ['In The Box', 'Device, Cable, Manual'],
];

const REVIEWS = [
  { name: 'Ramesh K.', loc: 'Bhubaneswar', text: 'Amazing device! My crop yield improved by 30%.', stars: 5 },
  { name: 'Priya D.', loc: 'Pune', text: 'Easy to use without internet. Accurate soil reports.', stars: 5 },
  { name: 'Suresh M.', loc: 'Vizag', text: 'Good value. Battery lasts the whole season.', stars: 4 },
];

const IMAGES = [
  { uri: 'https://saathiai.org/agni-device.png' },
  { uri: 'https://saathiai.org/agni-sensor.png' },
  { uri: 'https://saathiai.org/agni-app.png' },
];

// ─── Star Rating ─────────────────────────────────────────────
function Stars({ count, total = 5 }: { count: number; total?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: total }, (_, i) => (
        <Ionicons
          key={i}
          name={i < count ? 'star' : 'star-outline'}
          size={12}
          color={i < count ? '#FBBF24' : Colors.textMuted}
        />
      ))}
    </View>
  );
}

// ─── Gallery Component ───────────────────────────────────────
function ProductGallery() {
  const [active, setActive] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const goTo = (idx: number) => {
    setActive(idx);
    flatRef.current?.scrollToIndex({ index: idx, animated: true });
  };

  return (
    <View style={galleryStyles.container}>
      {/* Main Image */}
      <FlatList
        ref={flatRef}
        data={IMAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / GALLERY_W);
          setActive(idx);
        }}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[galleryStyles.imageContainer, { width: GALLERY_W }]}>
            <Image
              source={item}
              style={galleryStyles.mainImage}
              resizeMode="contain"
            />
          </View>
        )}
      />

      {/* Counter Badge */}
      <View style={galleryStyles.counter}>
        <Text style={galleryStyles.counterText}>{active + 1} / {IMAGES.length}</Text>
      </View>

      {/* Navigation Arrows */}
      {active > 0 && (
        <Pressable style={[galleryStyles.arrow, galleryStyles.arrowLeft]} onPress={() => goTo(active - 1)}>
          <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
        </Pressable>
      )}
      {active < IMAGES.length - 1 && (
        <Pressable style={[galleryStyles.arrow, galleryStyles.arrowRight]} onPress={() => goTo(active + 1)}>
          <Ionicons name="chevron-forward" size={20} color={Colors.textPrimary} />
        </Pressable>
      )}

      {/* Thumbnail Dots */}
      <View style={galleryStyles.dots}>
        {IMAGES.map((_, i) => (
          <Pressable key={i} onPress={() => goTo(i)}>
            <View style={[galleryStyles.dot, i === active && galleryStyles.dotActive]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const galleryStyles = StyleSheet.create({
  container: {
    aspectRatio: 1,
    width: GALLERY_W,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    position: 'relative',
    ...Spacing.shadows.md,
  },
  imageContainer: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: 20,
  },
  mainImage: { width: '100%', height: '100%' },
  counter: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: { fontFamily: 'Sora_400Regular', fontSize: 11, color: '#fff' },
  arrow: {
    position: 'absolute', top: '45%',
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
    ...Spacing.shadows.sm,
  },
  arrowLeft: { left: 8 },
  arrowRight: { right: 8 },
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: Colors.primary, width: 18 },
});

// ─── Main Component ──────────────────────────────────────────
export default function BuyAgniScreen() {
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const totalPrice = PRODUCT_PRICE * quantity;

  const handleBuyNow = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      Alert.alert(
        '✅ Order Received!',
        `Thank you! Your order for ${quantity} unit${quantity > 1 ? 's' : ''} has been received.\n\nOrder ID: #${Math.random().toString(36).substr(2, 8).toUpperCase()}\n\nOur team will contact you shortly to confirm.\n\n🚧 Full payment integration coming soon.`,
        [{ text: 'Great!', style: 'default' }]
      );
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <View style={styles.heroHeader}>
          <View style={styles.trustBadge}>
            <Text style={styles.trustBadgeText}>🌱 Trusted by 500+ Farmers</Text>
          </View>
          <Text style={styles.heroTitle}>Saathi Agni{'\n'}Smart Soil Sensor</Text>
          <Text style={styles.heroSub}>India's first AI-powered Bluetooth soil testing device</Text>
        </View>

        {/* Product Gallery */}
        <View style={styles.section}>
          <ProductGallery />
        </View>

        {/* Ratings */}
        <View style={styles.ratingRow}>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingScore}>4.8</Text>
            <Ionicons name="star" size={14} color="#fff" />
          </View>
          <Text style={styles.ratingCount}>250+ Ratings · 180+ Reviews</Text>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Verified</Text>
          </View>
        </View>

        {/* Price Block */}
        <View style={styles.priceCard}>
          <Text style={styles.offerLabel}>⚡ Limited Time Offer!</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{PRODUCT_PRICE.toLocaleString()}</Text>
            <Text style={styles.originalPrice}>₹{ORIGINAL_PRICE.toLocaleString()}</Text>
            <Text style={styles.discount}>{DISCOUNT}% off</Text>
          </View>
          <Text style={styles.taxNote}>Inclusive of all taxes</Text>
        </View>

        {/* Trust Badges */}
        <View style={styles.trustGrid}>
          {TRUST_BADGES.map((b, i) => (
            <View key={i} style={styles.trustBadgeCard}>
              <Ionicons name={b.icon as any} size={22} color={Colors.primary} />
              <Text style={styles.trustBadgeCardLabel}>{b.label}</Text>
              <Text style={styles.trustBadgeCardSub}>{b.sub}</Text>
            </View>
          ))}
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KEY FEATURES</Text>
          <View style={styles.featuresGrid}>
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureItem}>
                <View style={styles.featureIconBg}>
                  <Ionicons name={f.icon as any} size={18} color={Colors.primary} />
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              </View>
            ))}
          </View>
        </View>

        {/* Quantity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUANTITY</Text>
          <View style={styles.qtyRow}>
            <View style={styles.qtyControl}>
              <Pressable
                onPress={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                style={[styles.qtyBtn, quantity <= 1 && { opacity: 0.4 }]}
              >
                <Ionicons name="remove" size={20} color={Colors.textPrimary} />
              </Pressable>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <Pressable onPress={() => setQuantity(q => q + 1)} style={styles.qtyBtn}>
                <Ionicons name="add" size={20} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <Text style={styles.qtyTotal}>
              Total: <Text style={styles.qtyTotalBold}>₹{totalPrice.toLocaleString()}</Text>
            </Text>
          </View>
        </View>

        {/* Tech Specs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TECHNICAL SPECIFICATIONS</Text>
          <View style={styles.specsCard}>
            <View style={styles.specsHeader}>
              <Text style={styles.specsHeaderText}>Specifications</Text>
            </View>
            {SPECS.map(([k, v], i) => (
              <View key={k} style={[styles.specRow, i % 2 === 0 && styles.specRowAlt]}>
                <Text style={styles.specKey}>{k}</Text>
                <Text style={styles.specVal}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Customer Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CUSTOMER REVIEWS</Text>
          {REVIEWS.map((r, i) => (
            <View key={i} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewName}>{r.name}</Text>
                <Text style={styles.reviewLoc}>· {r.loc}</Text>
                <Stars count={r.stars} />
              </View>
              <Text style={styles.reviewText}>{r.text}</Text>
              <Text style={styles.reviewVerified}>✓ Verified Purchase</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Sticky Buy Button */}
      <View style={styles.stickyBar}>
        <View style={styles.stickyPrice}>
          <Text style={styles.stickyPriceText}>₹{totalPrice.toLocaleString()}</Text>
          <Text style={styles.stickyQty}>{quantity} unit{quantity > 1 ? 's' : ''}</Text>
        </View>
        <Pressable
          style={[styles.buyBtn, isProcessing && { opacity: 0.8 }]}
          onPress={handleBuyNow}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="cart-outline" size={20} color="#fff" />
          )}
          <Text style={styles.buyBtnText}>
            {isProcessing ? 'Processing…' : `Buy Now · ₹${totalPrice.toLocaleString()}`}
          </Text>
        </Pressable>
        <Text style={styles.secureNote}>🔒 Secure checkout · COD available</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontFamily: 'Sora_700Bold', fontSize: 11, color: Colors.textSecondary,
    letterSpacing: 1.5, marginBottom: Spacing.md,
  },

  heroHeader: { marginBottom: Spacing.xl },
  trustBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, marginBottom: 12,
  },
  trustBadgeText: { fontFamily: 'Sora_600SemiBold', fontSize: 12, color: Colors.primary },
  heroTitle: {
    fontFamily: 'Sora_800ExtraBold', fontSize: 28, color: Colors.textPrimary,
    lineHeight: 36, marginBottom: 8,
  },
  heroSub: { fontFamily: 'Sora_400Regular', fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.md },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  ratingScore: { fontFamily: 'Sora_700Bold', fontSize: 14, color: '#fff' },
  ratingCount: { fontFamily: 'Sora_400Regular', fontSize: 12, color: Colors.textSecondary, flex: 1 },
  verifiedBadge: {
    backgroundColor: Colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  verifiedText: { fontFamily: 'Sora_600SemiBold', fontSize: 11, color: Colors.primary },

  priceCard: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Spacing.radius.xl,
    padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  offerLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 12, color: Colors.amber, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 4 },
  price: { fontFamily: 'Sora_800ExtraBold', fontSize: 30, color: Colors.textPrimary },
  originalPrice: { fontFamily: 'Sora_400Regular', fontSize: 16, color: Colors.textMuted, textDecorationLine: 'line-through' },
  discount: { fontFamily: 'Sora_700Bold', fontSize: 16, color: Colors.primary },
  taxNote: { fontFamily: 'Sora_400Regular', fontSize: 11, color: Colors.textSecondary },

  trustGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  trustBadgeCard: {
    flex: 1, alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.lg, padding: 12,
    borderWidth: 1, borderColor: Colors.borderLight,
    ...Spacing.shadows.sm,
  },
  trustBadgeCardLabel: { fontFamily: 'Sora_700Bold', fontSize: 10, color: Colors.textPrimary, marginTop: 6, textAlign: 'center' },
  trustBadgeCardSub: { fontFamily: 'Sora_400Regular', fontSize: 9, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },

  featuresGrid: { gap: 8 },
  featureItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.borderLight,
    ...Spacing.shadows.sm,
  },
  featureIconBg: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  featureText: { flex: 1, fontFamily: 'Sora_600SemiBold', fontSize: 13, color: Colors.textPrimary },

  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyControl: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.border,
    borderRadius: Spacing.radius.md, overflow: 'hidden',
  },
  qtyBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  qtyValue: { width: 44, textAlign: 'center', fontFamily: 'Sora_700Bold', fontSize: 16, color: Colors.textPrimary },
  qtyTotal: { fontFamily: 'Sora_400Regular', fontSize: 13, color: Colors.textSecondary },
  qtyTotalBold: { fontFamily: 'Sora_700Bold', color: Colors.textPrimary },

  specsCard: { borderRadius: Spacing.radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderLight },
  specsHeader: { backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: 14 },
  specsHeaderText: { fontFamily: 'Sora_700Bold', fontSize: 13, color: '#fff' },
  specRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14 },
  specRowAlt: { backgroundColor: Colors.surfaceAlt },
  specKey: { flex: 1, fontFamily: 'Sora_400Regular', fontSize: 13, color: Colors.textSecondary },
  specVal: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: 13, color: Colors.textPrimary },

  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.lg,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
    ...Spacing.shadows.sm,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  reviewName: { fontFamily: 'Sora_700Bold', fontSize: 13, color: Colors.textPrimary },
  reviewLoc: { fontFamily: 'Sora_400Regular', fontSize: 12, color: Colors.textSecondary, flex: 1 },
  reviewText: { fontFamily: 'Sora_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 6 },
  reviewVerified: { fontFamily: 'Sora_600SemiBold', fontSize: 10, color: Colors.primary },

  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface,
    paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    paddingHorizontal: Spacing.xl,
    ...Spacing.shadows.md,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  stickyPrice: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 10 },
  stickyPriceText: { fontFamily: 'Sora_800ExtraBold', fontSize: 22, color: Colors.textPrimary },
  stickyQty: { fontFamily: 'Sora_400Regular', fontSize: 13, color: Colors.textSecondary },
  buyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F97316',
    borderRadius: Spacing.radius.xl,
    paddingVertical: 15, gap: 10,
    ...Spacing.shadows.sm,
  },
  buyBtnText: { fontFamily: 'Sora_800ExtraBold', fontSize: 16, color: '#fff' },
  secureNote: { fontFamily: 'Sora_400Regular', fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 8 },
});
