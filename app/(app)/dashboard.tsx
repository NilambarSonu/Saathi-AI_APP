import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { useAuthStore } from '../../store/authStore';
import LottieView from 'lottie-react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* 1. Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.name}>{user?.name || 'Farmer'} 👋</Text>
          </View>
          <Pressable onPress={() => router.push('/profile')}>
            <Image 
              source={require('../../public/founder.png')} 
              style={styles.avatar} 
            />
          </Pressable>
        </View>

        {/* 1.5 Glassmorphism Stat Pills */}
        <View style={styles.statsContainer}>
          <BlurView intensity={20} tint="dark" style={styles.statPill}>
            <Ionicons name="leaf" size={16} color="#FFF" style={styles.statIcon} />
            <Text style={styles.statValue}>127</Text>
            <Text style={styles.statLabel}>Farms</Text>
          </BlurView>
          <BlurView intensity={20} tint="dark" style={styles.statPill}>
            <Ionicons name="flask" size={16} color="#FFF" style={styles.statIcon} />
            <Text style={styles.statValue}>284</Text>
            <Text style={styles.statLabel}>Tests</Text>
          </BlurView>
          <BlurView intensity={20} tint="dark" style={styles.statPill}>
            <MaterialCommunityIcons name="brain" size={16} color="#FFF" style={styles.statIcon} />
            <Text style={styles.statValue}>195</Text>
            <Text style={styles.statLabel}>AI Tips</Text>
          </BlurView>
        </View>
      </View>

      {/* 2. Live Connect Card */}
      <Pressable 
        style={styles.connectCard}
        onPress={() => router.push('/(app)/live-connect')}
      >
        <View style={styles.connectCardIconBox}>
          <LottieView
            source={require('../../animations/Bluetooth-icon.json')}
            autoPlay
            loop
            style={{ width: 40, height: 40 }}
          />
        </View>
        <View style={styles.connectCardContent}>
          <Text style={styles.connectCardTitle}>Connect Agni</Text>
          <Text style={styles.connectCardSubtitle}>Pair your soil sensor via Bluetooth</Text>
        </View>
        <View style={styles.connectCardAction}>
          <Text style={styles.connectCardActionText}>Connect →</Text>
        </View>
      </Pressable>

      {/* 3. Soil Health Score Card */}
      <View style={styles.healthCard}>
        <View style={styles.healthCardLeft}>
          <View style={styles.ringContainer}>
            <LottieView
              source={require('../../animations/Microscope.json')}
              autoPlay
              loop
              style={{ width: 80, height: 80, position: 'absolute' }}
            />
          </View>
        </View>
        <View style={styles.healthCardRight}>
          <Text style={styles.healthCardTitle}>Good Soil Health 🌱</Text>
          <Text style={styles.healthCardSubtitle}>Perfect conditions for Rice planting</Text>
          <View style={styles.healthCardChips}>
            <View style={styles.chip}><Text style={styles.chipText}>pH 6.8</Text></View>
            <View style={styles.chip}><Text style={styles.chipText}>N: OK</Text></View>
            <View style={styles.chip}><Text style={styles.chipText}>K: ↑</Text></View>
          </View>
        </View>
      </View>

      {/* 4. Awards Ticker */}
      <View style={styles.tickerContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tickerScroll}>
          {['🏆 State Level Winner', '⚡ < 60s Testing', '🌿 Zero Chemicals', '🗣 3 Lang AI', '🥇 Best Agritech'].map((badge, idx) => (
            <View key={idx} style={styles.tickerBadge}>
              <Text style={styles.tickerBadgeText}>{badge}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 5. Quick Actions Grid */}
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <Pressable style={styles.gridTile} onPress={() => router.push('/(app)/ai-chat')}>
            <View style={[styles.tileIconBox, { backgroundColor: Colors.surfaceAlt }]}>
              <LottieView
                source={require('../../animations/Brain.json')}
                autoPlay
                loop
                style={{ width: 34, height: 34 }}
              />
            </View>
            <Text style={styles.tileTitle}>AI Assistant</Text>
            <Text style={styles.tileSubtitle}>Ask Saathi anything</Text>
          </Pressable>

          <Pressable style={styles.gridTile} onPress={() => router.push('/(app)/history')}>
            <View style={[styles.tileIconBox, { backgroundColor: '#FFF3E0' }]}>
              <Text style={{ fontSize: 22 }}>📊</Text>
            </View>
            <Text style={styles.tileTitle}>Analytics</Text>
            <Text style={styles.tileSubtitle}>View past trends</Text>
          </Pressable>
        </View>

        <View style={styles.gridRow}>
          <Pressable style={styles.gridTile}>
            <View style={[styles.tileIconBox, { backgroundColor: '#E3F2FD' }]}>
              <Text style={{ fontSize: 22 }}>🗺️</Text>
            </View>
            <Text style={styles.tileTitle}>Field Map</Text>
            <Text style={styles.tileSubtitle}>GPS test locations</Text>
          </Pressable>

          <Pressable style={styles.gridTile}>
            <View style={[styles.tileIconBox, { backgroundColor: '#F3E5F5' }]}>
              <Text style={{ fontSize: 22 }}>🌤️</Text>
            </View>
            <Text style={styles.tileTitle}>Weather</Text>
            <Text style={styles.tileSubtitle}>Advisory alerts</Text>
          </Pressable>
        </View>
      </View>

      {/* 5.5 Hardware Promo */}
      <Pressable style={styles.promoCard} onPress={() => router.push('/buy-agni')}>
        <View style={styles.promoContent}>
          <Text style={styles.promoTitle}>Need an Agni Sensor?</Text>
          <Text style={styles.promoSubtitle}>Get lab-grade NPK analysis instantly.</Text>
          <Text style={styles.promoAction}>Buy Now →</Text>
        </View>
        <Ionicons name="hardware-chip-outline" size={48} color={Colors.primary} style={styles.promoIcon} />
      </Pressable>

      {/* 6. Recent Tests */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Tests</Text>
        <Text style={styles.sectionAction}>View All →</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentScroll}>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.recentCard}>
            <Text style={styles.recentDate}>Today, 10:45 AM</Text>
            <Text style={[styles.recentValue, { color: Colors.primary }]}>6.8 pH</Text>
            <Text style={styles.recentField}>North Field {item}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom spacing for TabBar */}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
    backgroundColor: Colors.primaryDark,
    marginHorizontal: -Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: 10,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  name: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 24,
    color: '#FFF',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statPill: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statIcon: {
    marginBottom: 4,
    opacity: 0.9,
  },
  statValue: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 18,
    color: '#FFF',
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  connectCard: {
    backgroundColor: Colors.primaryDark,
    borderRadius: Spacing.radius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: '#1A7B3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
  connectCardIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  connectCardContent: {
    flex: 1,
  },
  connectCardTitle: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 16,
    color: '#FFF',
    marginBottom: 4,
  },
  connectCardSubtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
  },
  connectCardAction: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  connectCardActionText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    color: '#FFF',
  },
  tickerContainer: {
    marginBottom: Spacing.xl,
    marginHorizontal: -Spacing.xl, // Bleed out of padding
  },
  tickerScroll: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  tickerBadge: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tickerBadgeText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  healthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.radius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    shadowColor: '#1A7B3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  healthCardLeft: {
    marginRight: Spacing.lg,
  },
  ringContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthCardRight: {
    flex: 1,
  },
  healthCardTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  healthCardSubtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  healthCardChips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 11,
    color: Colors.primary,
  },
  grid: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  gridTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.radius.lg,
    padding: Spacing.lg,
    shadowColor: '#1A7B3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  tileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  tileTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  tileSubtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 18,
    color: Colors.textPrimary,
  },
  sectionAction: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
  },
  recentScroll: {
    gap: Spacing.md,
  },
  recentCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.radius.lg,
    padding: 14,
    shadowColor: '#1A7B3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  recentDate: {
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  recentValue: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 24,
    marginBottom: 2,
  },
  recentField: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
    color: Colors.textPrimary,
  },
  promoCard: {
    backgroundColor: '#E8F7ED',
    borderRadius: Spacing.radius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: '#C8E6D0',
    shadowColor: '#1A7B3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  promoContent: { flex: 1 },
  promoTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: Colors.primaryDark, marginBottom: 4 },
  promoSubtitle: { fontFamily: 'Sora_400Regular', fontSize: 12, color: Colors.primary, marginBottom: 8 },
  promoAction: { fontFamily: 'Sora_700Bold', fontSize: 12, color: Colors.primaryDark },
  promoIcon: { opacity: 0.8 }
});
