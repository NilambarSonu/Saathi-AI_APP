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
import AgniPulseAnimation from '../../components/AgniPulseAnimation';
import { getSoilTests, SoilTest } from '../../services/soil';
import LottieView from 'lottie-react-native';
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
  { icon: 'zap',          color: '#1A5C35', bg: Colors.fillGreen,  title: 'Smart Fertilizer Calculation', subtitle: 'AI saves up to 30% on inputs', route: '/(app)/ai-chat' },
  { icon: 'mic',          color: '#1565C0', bg: Colors.fillBlue,   title: 'Voice Advisory',               subtitle: 'Speak in Odia, Hindi, or English', route: '/(app)/ai-chat' },
  { icon: 'cpu',          color: '#E65100', bg: Colors.fillAmber,  title: 'Agri-Science LLM',             subtitle: 'Custom AI trained on crop research', route: '/(app)/ai-chat' },
  { icon: 'map',          color: '#6A1B9A', bg: Colors.fillPurple, title: 'Crop Planning',                subtitle: 'Market-driven advisory for max ROI', route: '/(app)/ai-chat' },
];

const HOW_STEPS = [
  {
    num: 1, numBg: '#d1fae5', numText: '#065f46',
    icon: 'microscope' as const, iconColor: '#059669',
    title: 'Scan Soil with Agni',
    body: 'Insert the Agni device into your field to instantly read real-time soil parameters.',
  },
  {
    num: 2, numBg: '#dbeafe', numText: '#1e40af',
    icon: 'bluetooth' as const, iconColor: '#2563eb',
    title: 'Connect to Saathi',
    body: 'Sync your sensor data securely via Bluetooth to the Saathi mobile app.',
  },
  {
    num: 3, numBg: '#fef3c7', numText: '#92400e',
    icon: 'brain' as const, iconColor: '#d97706',
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
  const [tests, setTests] = useState<SoilTest[]>([]);
  const [stats, setStats] = useState({ farms: 1401, soilTests: 78, aiTips: 74 });

  useEffect(() => {
    getSoilTests()
      .then(d => {
        if (d?.length) {
          setTests(d);
          setStats({ farms: d.length, soilTests: d.length, aiTips: Math.floor(d.length * 0.9) });
        }
      })
      .catch(() => {});
  }, []);

  const latestTest = tests[0] ?? null;

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
            <Text style={s.greeting}>{getGreeting()}</Text>
            <Text style={s.name}>{getFirstName(user)}</Text>
          </View>
          <View style={s.headerRight}>
            <View style={[s.headerBtn, { backgroundColor: Colors.surface, ...Shadows.sm }]}>
              <Feather name="bell" size={20} color={Colors.label2} />
            </View>
            <View style={[s.headerBtn, { paddingHorizontal: 16, width: 'auto', backgroundColor: Colors.surface, ...Shadows.sm }]}>
              <Text style={s.avatarText}>{getInitials(user)}</Text>
            </View>
          </View>
        </View>

        {/* ── STATS ROW ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }} style={{ marginHorizontal: -20, marginBottom: 24 }}>
          {[
            { label: 'FARMS', value: stats.farms.toLocaleString('en-IN') },
            { label: 'TESTS', value: stats.soilTests.toString() },
            { label: 'AI TIPS', value: stats.aiTips.toString() },
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
              <AgniPulseAnimation />
              <Text style={{ ...Type.caption2, color: 'rgba(255,255,255,0.5)', marginTop: 12, letterSpacing: 2 }}>AGNI</Text>
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
            <LinearGradient colors={['#A7F3D0', Colors.success]} start={{x:0, y:0}} end={{x:1, y:0}} style={{ width: '98%', height: '100%', borderRadius: 4 }} />
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
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: step.numBg, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <Text style={{ ...Type.title3, color: step.numText }}>{step.num}</Text>
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
});
