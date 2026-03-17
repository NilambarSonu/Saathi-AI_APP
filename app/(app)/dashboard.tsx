/**
 * dashboard.tsx — Saathi AI Home Screen
 * True Liquid Glassmorphism (No Plastic Neumorphism)
 */
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing, Dimensions, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { Type } from '../../constants/Typography';
import { Image, Modal } from 'react-native';
import LottieView from 'lottie-react-native';
import { getDashboardStats } from '../../services/analytics';
import { getNotifications, AppNotification } from '../../services/notifications';

function BouncingIndicator({ state }: { state: 'connecting' | 'connected' | 'disconnected' }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 6, duration: 800, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const color = state === 'connected' ? Colors.success : state === 'connecting' ? Colors.amber : Colors.error;

  return (
    <View style={{ alignItems: 'center', marginTop: 12 }}>
      <Animated.View style={{ transform: [{ translateY: y }], width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      {state === 'connecting' ? (
        <Text style={{ ...Type.caption2, color, marginTop: 8, letterSpacing: 1 }} numberOfLines={1} ellipsizeMode="tail">
          CONNECTING...
        </Text>
      ) : (
        <Text style={{ ...Type.caption2, color, marginTop: 8, letterSpacing: 1 }} numberOfLines={1} ellipsizeMode="tail">
          {state.toUpperCase()}
        </Text>
      )}
    </View>
  );
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning 🌿';
  if (h < 17) return 'Good afternoon ☀️';
  return 'Good evening 🌙';
};

const getInitials = (user: any): string => {
  const raw = user?.name || user?.username || user?.email || '';
  const parts = raw.trim().split(/[\s_@.]+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return raw.slice(0, 3).toUpperCase() || 'MAA';
};

const getFirstName = (user: any): string => {
  const raw = user?.name || user?.username || user?.email?.split('@')[0] || 'Farmer';
  const n = raw.split(/[\s_]+/)[0];
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
};

const FEATURES = [
  { icon: 'zap', color: '#1A5C35', bg: Colors.fillGreen, title: 'Smart Fertilizer Calculation', subtitle: 'AI saves up to 30% on inputs', route: '/(app)/ai-chat' },
  { icon: 'mic', color: '#1565C0', bg: Colors.fillBlue, title: 'Voice Advisory', subtitle: 'Speak in Odia, Hindi, or English', route: '/(app)/ai-chat' },
  { icon: 'cpu', color: '#E65100', bg: Colors.fillAmber, title: 'Agri-Science LLM', subtitle: 'Custom AI trained on crop research', route: '/(app)/ai-chat' },
  { icon: 'map', color: '#6A1B9A', bg: Colors.fillPurple, title: 'Crop Planning', subtitle: 'Market-driven advisory for max ROI', route: '/(app)/ai-chat' },
];

const HOW_STEPS = [
  {
    num: 1, numBg: '#d1fae5', numText: '#065f46',
    animation: require('../../animations/Microscope.json'),
    title: 'Scan Soil with Agni',
    body: 'Insert the Agni device into your field to instantly read real-time soil parameters.',
  },
  {
    num: 2, numBg: '#dbeafe', numText: '#1e40af',
    animation: require('../../animations/Bluetooth.json'),
    title: 'Connect to Saathi',
    body: 'Sync your sensor data securely via Bluetooth to the Saathi mobile app.',
  },
  {
    num: 3, numBg: '#fef3c7', numText: '#92400e',
    animation: require('../../animations/Brain.json'),
    title: 'Get AI Advice',
    body: 'Receive personalized crop plans and smart fertilizer recommendations.',
  },
];

const AWARDS = [
  '🏆 Disruptive Innovation Award', '🌱 Best Farmer-Tech Solution',
  '🚀 Govt. Incubated Startup', '💰 ₹5L Govt Seed Grant',
  '🏅 FM University Innovation', '⚡ < 60s Soil Testing', '🥇 State Level Winner',
];
const AWARDS_X2 = [...AWARDS, ...AWARDS];

function AwardsTicker() {
  const x = useRef(new Animated.Value(0)).current;
  const W_PILL = 200;
  useEffect(() => {
    Animated.loop(
      Animated.timing(x, {
        toValue: -(AWARDS.length * W_PILL),
        duration: AWARDS.length * W_PILL * 40,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);
  return (
    <View style={{ overflow: 'hidden', marginHorizontal: -20, marginBottom: 20 }}>
      <Animated.View style={[{ flexDirection: 'row', paddingLeft: 20, paddingVertical: 12 }, { transform: [{ translateX: x }] }]}>
        {AWARDS_X2.map((a, i) => (
          <View key={i} style={{
            backgroundColor: Colors.surface, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 10,
            marginRight: 12, minWidth: 180, alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: Colors.sep2, ...Shadows.sm
          }}>
            <Text style={{ ...Type.caption2, color: Colors.label2 }}>{a}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

// ─── Reusable Components ────────────────────────────────────────────────────────
function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={s.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function GlassCard({ style, children }: { style?: any; children: React.ReactNode }) {
  return (
    <View style={[s.card, style]}>
      {children}
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [stats, setStats] = useState({ farms: 0, soilTests: 0, aiTips: 0 });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    getDashboardStats().then(data => setStats(data || { farms: 0, soilTests: 0, aiTips: 0 })).catch(() => setStats({ farms: 0, soilTests: 0, aiTips: 0 }));
    getNotifications().then(data => setNotifications(Array.isArray(data) ? data : [])).catch(() => {
      setNotifications([]);
    });
  }, []);

  return (
    <View style={s.root}>
      {/* ── MESH BACKGROUND ── */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={[Colors.bg0, Colors.bg1, Colors.surface]} style={StyleSheet.absoluteFill} />
        <View style={[s.blob, { top: -80, left: -50, width: 300, height: 300, backgroundColor: 'rgba(167, 243, 208, 0.4)' }]} />
        <View style={[s.blob, { top: 150, right: -100, width: 350, height: 350, backgroundColor: 'rgba(224, 245, 233, 0.5)' }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} bounces>

        {/* ── HEADER ── */}
        <View style={s.header}>
          <View>
            <Text style={[s.greeting, { fontSize: 13, marginBottom: 2 }]}>{getGreeting()}</Text>
            <Text style={[s.name, { fontSize: 28 }]}>{getFirstName(user)}</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity onPress={() => setIsNotifOpen(true)} style={[s.headerBtn, { backgroundColor: Colors.surface, ...Shadows.sm }]}>
              <Feather name="bell" size={20} color={Colors.label2} />
              {(Array.isArray(notifications) ? notifications : []).some(n => !n.isRead) && <View style={s.notifDot} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(app)/account')} style={[s.headerBtn, { backgroundColor: Colors.surface, ...Shadows.sm, padding: 0, overflow: 'hidden' }]}>
              {(user as any)?.avatar_url ? (
                <Image source={{ uri: (user as any).avatar_url }} style={{ width: 44, height: 44, borderRadius: 22 }} />
              ) : (
                <Image source={{ uri: 'https://ui-avatars.com/api/?background=1A5C35&color=fff&name=' + encodeURIComponent(getFirstName(user)) }} style={{ width: 44, height: 44, borderRadius: 22 }} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {isNotifOpen && (
          <View style={s.notifPanel}>
            <View style={s.notifHeader}>
              <Text style={s.notifTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setIsNotifOpen(false)}>
                <Ionicons name="close" size={24} color={Colors.label1} />
              </TouchableOpacity>
            </View>
            <View style={{ maxHeight: 300 }}>
              {!(Array.isArray(notifications) && notifications.length > 0) ? (
                <Text style={{ padding: 16, textAlign: 'center', color: Colors.label3 }}>No notifications yet.</Text>
              ) : (
                notifications.map(n => (
                  <View key={n.id} style={s.notifItem}>
                    <View style={[s.notifAvatar, { overflow: 'hidden' }]}>
                      {(user as any)?.avatar_url ? (
                        <Image source={{ uri: (user as any).avatar_url }} style={{ width: 40, height: 40 }} />
                      ) : (
                        <Image source={{ uri: 'https://ui-avatars.com/api/?background=1A5C35&color=fff&name=' + encodeURIComponent(getFirstName(user)) }} style={{ width: 40, height: 40 }} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.notifItemUser}>{getFirstName(user)}</Text>
                      <Text style={s.notifItemMsg}>{n.title}</Text>
                      <Text style={s.notifTime}>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* ── STATS ROW ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }} style={{ marginHorizontal: -20, marginBottom: 24 }}>
          {[
            { label: 'FARMS', value: (stats?.farms || 0).toLocaleString('en-IN') },
            { label: 'TESTS', value: (stats?.soilTests || 0).toString() },
            { label: 'AI TIPS', value: (stats?.aiTips || 0).toString() },
          ].map((st, i) => (
            <View key={i} style={[s.statCard, Shadows.md]}>
              <Text style={s.statLabel}>{st.label}</Text>
              <Text style={s.statValue}>{st.value}</Text>
              <View style={s.statSpecular} />
            </View>
          ))}
        </ScrollView>

        {/* ── AGNI CONNECT HERO CARD ── */}
        <View style={[s.heroCard, Shadows.lg]}>
          {/* Deep dark gradient with slight tint */}
          <LinearGradient colors={['#0F1F17', '#152C22']} style={StyleSheet.absoluteFill} />

          <View style={{ padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Feather name="bluetooth" size={18} color={Colors.surface} style={{ marginRight: 8 }} />
                <Text style={{ ...Type.title2, color: Colors.surface, letterSpacing: -0.5 }}>Connect Agni</Text>
              </View>
              <Text style={{ ...Type.subheadline, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>
                Pair your soil sensor instantly for real-time insights.
              </Text>
              <TouchableOpacity onPress={() => router.push('/(app)/live-connect')}>
                <BlurView intensity={40} tint="light" style={s.heroBtn}>
                  <Text style={{ ...Type.callout, fontFamily: 'Sora_600SemiBold', color: Colors.surface, marginRight: 8 }}>Pair Device</Text>
                  <Feather name="arrow-right" size={18} color={Colors.surface} />
                </BlurView>
              </TouchableOpacity>
            </View>

            {/* Agni Animated Graphic */}
            <View style={{ width: 80, height: 100, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={require('../../public/Agni_Device.png')} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
            </View>
          </View>
        </View>

        {/* ── TESTING SPEED ── */}
        <GlassCard style={{ padding: 24, marginBottom: 28, ...Shadows.md }}>
          <Text style={{ ...Type.title3, color: Colors.label1, marginBottom: 20 }}>Testing Speed</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <MaterialCommunityIcons name="flask-outline" size={16} color={Colors.error} style={{ marginRight: 6 }} />
                <Text style={{ ...Type.subheadline, color: Colors.label2 }}>Traditional Lab</Text>
              </View>
              <Text style={{ ...Type.title3, color: Colors.error }}>14 days wait</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ ...Type.subheadline, color: Colors.label1 }}>Saathi AI</Text>
                <Feather name="cpu" size={16} color={Colors.success} style={{ marginLeft: 6 }} />
              </View>
              <Text style={{ ...Type.title3, color: Colors.success }}>{'< 60 seconds'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ ...Type.caption2, color: Colors.label3 }}>EFFICIENCY</Text>
            <Text style={{ ...Type.caption2, color: Colors.success }}>336X FASTER</Text>
          </View>
          <View style={{ height: 8, backgroundColor: Colors.sep2, borderRadius: 4, overflow: 'hidden' }}>
            <LinearGradient colors={['#A7F3D0', Colors.success]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: '98%', height: '100%', borderRadius: 4 }} />
          </View>
        </GlassCard>

        {/* ── SAATHI FEATURES ── */}
        <SectionHeader title="Saathi Features" />
        <GlassCard style={{ marginBottom: 32, paddingVertical: 8, ...Shadows.md }}>
          {FEATURES.map((f, i) => (
            <View key={i}>
              <TouchableOpacity onPress={() => router.push(f.route as any)} style={s.featureRow}>
                <View style={[s.featureIconBox, { backgroundColor: f.bg }]}>
                  <Feather name={f.icon as any} size={20} color={f.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={s.featureTitle}>{f.title}</Text>
                  <Text style={s.featureSubtitle}>{f.subtitle}</Text>
                </View>
                <View style={s.chevronBox}>
                  <Feather name="chevron-right" size={18} color={Colors.label3} />
                </View>
              </TouchableOpacity>
              {i !== FEATURES.length - 1 && <View style={s.featureSeparator} />}
            </View>
          ))}
        </GlassCard>

        {/* ── HOW IT WORKS ── */}
        <SectionHeader title="How It Works" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} style={{ marginHorizontal: -20, marginBottom: 8 }}>
          {HOW_STEPS.map((step, i) => (
            <GlassCard key={i} style={{ width: 280, marginRight: 16, padding: 24, alignItems: 'flex-start', ...Shadows.md }}>
              <View style={{ width: 64, height: 64, marginBottom: 20 }}>
                <LottieView source={step.animation} autoPlay loop style={{ width: '100%', height: '100%' }} />
              </View>
              <Text style={{ ...Type.headline, color: Colors.label1, marginBottom: 10 }}>{step.title}</Text>
              <Text style={{ ...Type.callout, color: Colors.label2 }}>{step.body}</Text>
            </GlassCard>
          ))}
        </ScrollView>

        <AwardsTicker />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg0 },
  blob: { position: 'absolute', borderRadius: 999, filter: 'blur(30px)' },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 110,  // critical logic for pill clearance
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 28,
  },
  greeting: {
    ...Type.callout,
    color: Colors.label2, marginBottom: 4,
  },
  name: {
    ...Type.largeTitle,
    color: Colors.label1,
  },
  headerRight: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 6 },
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.sep2,
  },
  avatarText: {
    ...Type.subheadline,
    color: Colors.label1,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.sep2,
    overflow: 'hidden',
  },
  statCard: {
    backgroundColor: Colors.surface,
    paddingVertical: 18, paddingHorizontal: 24,
    alignItems: 'center', justifyContent: 'center',
    minWidth: 104, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.sep2,
    overflow: 'hidden',
  },
  statLabel: {
    ...Type.caption2,
    color: Colors.label3, marginBottom: 6,
  },
  statValue: {
    ...Type.title2,
    color: Colors.label1,
  },
  statSpecular: {
    position: 'absolute', top: 0, left: 16, right: 16,
    height: 1, backgroundColor: 'rgba(255,255,255,0.7)',
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 28,
    overflow: 'hidden',
  },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 100, overflow: 'hidden', alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  // Feature row styles
  featureRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 20,
  },
  featureIconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featureTitle: { ...Type.headline, color: Colors.label1 },
  featureSubtitle: { ...Type.footnote, color: Colors.label3, marginTop: 2 },
  chevronBox: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.sep2,
    alignItems: 'center', justifyContent: 'center',
  },
  featureSeparator: {
    height: StyleSheet.hairlineWidth, backgroundColor: Colors.sep1,
    marginLeft: 80, // lines up with text
  },
  // Section Headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16, marginTop: 8,
  },
  sectionTitle: { ...Type.title2, color: Colors.label1 },
  sectionAction: { ...Type.subheadline, color: Colors.success },

  // Notifications
  notifDot: {
    position: 'absolute', top: 12, right: 12,
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error
  },
  notifPanel: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    ...Shadows.md,
    borderWidth: 1, borderColor: Colors.sep2,
  },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  notifTitle: { ...Type.title3, color: Colors.label1 },
  notifItem: { flexDirection: 'row', marginBottom: 16, alignItems: 'center' },
  notifAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  notifItemUser: { ...Type.headline, color: Colors.label1 },
  notifItemMsg: { ...Type.subheadline, color: Colors.label2 },
  notifTime: { ...Type.caption2, color: Colors.label3, marginTop: 4 },
});
