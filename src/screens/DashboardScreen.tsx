/**
 * dashboard.tsx — Saathi AI Home Screen
 * True Liquid Glassmorphism (No Plastic Neumorphism)
 */
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing, Dimensions, Platform, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/Colors';
import { Shadows } from '@/constants/Shadows';
import { Type } from '@/constants/Typography';
import { Image, Modal } from 'react-native';
import LottieView from 'lottie-react-native';
import { getDashboardStats, DashboardStats } from '@/services/analytics';
import { getNotifications, AppNotification } from '@/services/notifications';
import { useNavigationStore } from '@/store/navigationStore';
import { tabBarY, hideTabBar, showTabBar } from '@/constants/Animations';

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

  if (h >= 5 && h < 12) return 'Good morning 🌿';
  if (h >= 12 && h < 15) return 'Good afternoon ☀️';
  if (h >= 15 && h < 18) return 'Good evening 🌇';
  if (h >= 18 && h < 22) return 'Good night 🌙';

  return 'Hello 👋';
};

const getInitials = (user: any): string => {
  const raw = user?.name || user?.username || user?.email || '';
  const parts = raw.trim().split(/[\s_@.]+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return raw.slice(0, 3).toUpperCase() || 'Farmer';
};

const getFirstName = (user: any): string => {
  return user?.name || user?.username || user?.email?.split('@')[0] || 'Farmer';
};

const getUserAvatar = (u: any): string | null => {
  return u?.avatar_url || u?.profile_picture || u?.profile_image || null;
};

const FEATURES = [
  { id: 'analysis', icon: 'trending-up', color: '#21db6eff', bg: Colors.fillGreen, title: 'Instant Analysis', subtitle: 'Get comprehensive soil health data in seconds with our Agni device.', tabIndex: 2 },
  { id: 'language', icon: 'brain', color: '#2787f6ff', bg: Colors.fillBlue, title: 'Local Language', subtitle: 'Receive recommendations in Odia, Hindi, or English with voice support.', tabIndex: 2 },
  { id: 'farming', icon: 'microscope', color: '#eab329ff', bg: Colors.fillAmber, title: 'Sustainable Farming', subtitle: 'AI-powered organic fertilizer recommendations for better crop yield.', tabIndex: 2 },
  { id: 'mapping', icon: 'map-marker-radius', color: '#c438e4ff', bg: Colors.fillPurple, title: 'Field Mapping', subtitle: 'Visualize your soil data on interactive maps for better field management.', tabIndex: 2 },
];

const FEATURE_DETAILS: Record<string, any> = {
  analysis: {
    title: 'Instant Analysis',
    tagline: 'Know Your Soil Instantly ⚡',
    content: 'Scan with Agni and get:\n• NPK levels in seconds\n• Soil health score\n• AI-powered fertilizer advice',
    result: 'Save time, increase yield, avoid lab delays',
    icon: 'trending-up',
    color: '#21db6eff',
    gradient: ['rgba(33, 219, 110, 0.15)', 'rgba(33, 219, 110, 0.05)']
  },
  language: {
    title: 'Local Language',
    tagline: 'Talk in Your Language 🗣️',
    content: 'Ask questions in:\n• Odia\n• Hindi\n• English\n\nAI responds in your language with voice support',
    result: 'No confusion, easy decisions for every farmer',
    icon: 'brain',
    color: '#2787f6ff',
    gradient: ['rgba(39, 135, 246, 0.15)', 'rgba(39, 135, 246, 0.05)']
  },
  farming: {
    title: 'Sustainable Farming',
    tagline: 'Smart & Eco Farming 🌿',
    content: 'Get:\n• Organic fertilizer suggestions\n• Reduced chemical usage\n• Crop-specific guidance',
    result: 'Better soil health + long-term profit',
    icon: 'microscope',
    color: '#eab329ff',
    gradient: ['rgba(234, 179, 41, 0.15)', 'rgba(234, 179, 41, 0.05)']
  },
  mapping: {
    title: 'Field Mapping',
    tagline: 'See Your Farm Data 📍',
    content: 'Visualize:\n• Soil test locations\n• Field-wise insights\n• Smart planning tools',
    result: 'Make data-driven farming decisions',
    icon: 'map-marker-radius',
    color: '#c438e4ff',
    gradient: ['rgba(196, 56, 228, 0.15)', 'rgba(196, 56, 228, 0.05)']
  }
};

const HOW_STEPS = [
  {
    num: 1, numBg: '#d1fae5', numText: '#065f46',
    animation: require('assets/animations/Microscope.json'),
    title: 'Scan Soil with Agni',
    body: 'Insert the Agni device into your field to instantly read real-time soil parameters.',
  },
  {
    num: 2, numBg: '#dbeafe', numText: '#1e40af',
    animation: require('assets/animations/Bluetooth-icon.json'),
    title: 'Connect to Saathi',
    body: 'Sync your sensor data securely via Bluetooth to the Saathi mobile app.',
  },
  {
    num: 3, numBg: '#fef3c7', numText: '#92400e',
    animation: require('assets/animations/Brain.json'),
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

function AnimatedCounter({ value, style }: { value: number, style?: any }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!value) {
      setCurrent(0);
      return;
    }
    const duration = 1500;
    const steps = 30;
    const intervalTime = duration / steps;
    const stepValue = Math.max(1, value / steps);

    let currentVal = 0;
    const timer = setInterval(() => {
      currentVal += stepValue;
      if (currentVal >= value) {
        setCurrent(value);
        clearInterval(timer);
      } else {
        setCurrent(Math.floor(currentVal));
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [value]);

  return <Text style={style}>{current.toLocaleString('en-IN')}</Text>;
}

function FloatingAgniDevice() {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -12, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ width: 110, height: 140, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: y }] }}>
      <Image source={require('assets/images/Agni_Device.png')} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
    </Animated.View>
  );
}

function HowItWorksTicker() {
  const x = useRef(new Animated.Value(0)).current;
  const W_CARD = 355;
  const MARGIN = 18;
  const totalStepsWidth = HOW_STEPS.length * (W_CARD + MARGIN);

  const startAnimation = (startX = 0) => {
    const remaining = totalStepsWidth + startX;
    const duration = remaining * 30; // approx smooth speed

    Animated.timing(x, {
      toValue: -totalStepsWidth,
      duration: duration,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        x.setValue(0);
        startAnimation(0);
      }
    });
  };

  useEffect(() => {
    startAnimation(0);
    return () => x.stopAnimation();
  }, []);

  const handlePress = () => {
    x.stopAnimation((current) => {
      setTimeout(() => {
        startAnimation(current);
      }, 5000);
    });
  };

  const HOW_STEPS_X2 = [...HOW_STEPS, ...HOW_STEPS];

  return (
    <View style={{ overflow: 'hidden', marginHorizontal: -20 }}>
      <Animated.View style={[{ flexDirection: 'row', paddingLeft: 20, paddingTop: 10, paddingBottom: 24 }, { transform: [{ translateX: x }] }]}>
        {HOW_STEPS_X2.map((step, i) => (
          <TouchableOpacity key={i} activeOpacity={0.9} onPress={handlePress}>
            <GlassCard style={{ width: W_CARD, marginRight: MARGIN, padding: 22, height: 185, justifyContent: 'center', ...Shadows.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: step.numBg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <Text style={{ fontSize: 16, fontFamily: 'Sora_700Bold', color: step.numText }}>{step.num}</Text>
                  </View>
                  <Text style={{ fontSize: 18, fontFamily: 'Sora_700Bold', color: Colors.label1, marginBottom: 8, letterSpacing: -0.5 }}>{step.title}</Text>
                  <Text numberOfLines={4} style={{ fontSize: 14, fontFamily: 'Sora_400Regular', color: Colors.label2, lineHeight: 21 }}>{step.body}</Text>
                </View>
                <View style={{ width: 120, height: 120 }}>
                  <LottieView source={step.animation} autoPlay loop style={{ width: '100%', height: '100%' }} />
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const isStatsLoading = statsLoading === true;

  // POPUP STATE
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const popupFade = useRef(new Animated.Value(0)).current;
  const popupSlide = useRef(new Animated.Value(400)).current;

  const showPopup = (id: string) => {
    setSelectedFeature(id);
    Animated.parallel([
      Animated.timing(popupFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(popupSlide, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true })
    ]).start();
    hideTabBar();
  };

  const hidePopup = () => {
    Animated.parallel([
      Animated.timing(popupFade, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(popupSlide, { toValue: 400, duration: 300, useNativeDriver: true })
    ]).start(() => {
      setSelectedFeature(null);
      showTabBar();
    });
  };

  const handleConnect = () => {
    router.replace('/(app)/connect');
  };

  useEffect(() => {
    async function loadStats() {
      setStatsLoading(true);
      setStatsError(null);

      try {
        const data = await getDashboardStats();
        // Only set stats if we got a valid response (null means error or no data yet)
        if (data) {
          setStats(data);
        } else {
          setStats(null);
        }
      } catch (e: any) {
        setStats(null);
        setStatsError(e?.message || 'Unable to load dashboard stats.');
      } finally {
        setStatsLoading(false);
      }
    }

    loadStats();

    getNotifications().then(data => setNotifications(Array.isArray(data) ? data : [])).catch(() => {
      setNotifications([]);
    });
  }, []);

  /* Tab Bar visibility logic moved to constants/Animations.ts */


  return (
      <View style={s.root}>
      {/* ── MESH BACKGROUND ── */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={[Colors.bg0, Colors.bg1, Colors.surface]} style={StyleSheet.absoluteFill} />
        <View style={[s.blob, { top: -80, left: -50, width: 300, height: 300, backgroundColor: 'rgba(167, 243, 208, 0.4)' }]} />
        <View style={[s.blob, { top: 150, right: -100, width: 350, height: 350, backgroundColor: 'rgba(224, 245, 233, 0.5)' }]} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        bounces
        onScrollBeginDrag={hideTabBar}
        onScrollEndDrag={showTabBar}
        onMomentumScrollBegin={hideTabBar}
        onMomentumScrollEnd={showTabBar}
        scrollEventThrottle={16}
      >

        {/* ── HEADER ── */}
        <View style={s.header}>
          <View style={{ flex: 1, paddingRight: 12 }}>

            {/* ADJUST WELCOME TEXT POSITION AND SIZE HERE */}
            <Text numberOfLines={1} adjustsFontSizeToFit style={[s.greeting, { fontSize: 34, marginBottom: 2, marginTop: 28, paddingVertical: 10, lineHeight: 45 }]}>{getGreeting()}</Text>

            {/* ADJUST USER NAME SIZE HERE */}

            <Text numberOfLines={1} adjustsFontSizeToFit style={[s.name, { fontSize: 49, fontFamily: 'Pacifico_400Regular', lineHeight: 50 }]}>{getFirstName(user)}</Text>

          </View>
          <View style={s.headerRight}>
            <TouchableOpacity onPress={() => setIsNotifOpen(true)} style={[s.headerBtn, { backgroundColor: Colors.surface, ...Shadows.sm }]}>
              <Feather name="bell" size={20} color={Colors.label2} />
              {(Array.isArray(notifications) ? notifications : []).some(n => !n.isRead) && <View style={s.notifDot} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => useNavigationStore.getState().setCurrentIndex(4)} style={[s.headerBtn, { backgroundColor: Colors.surface, ...Shadows.sm, padding: 0, overflow: 'hidden' }]}>
              {getUserAvatar(user) ? (
                <Image source={{ uri: getUserAvatar(user) as string }} style={{ width: 44, height: 44, borderRadius: 22 }} />
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
                      {getUserAvatar(user) ? (
                        <Image source={{ uri: getUserAvatar(user) as string }} style={{ width: 40, height: 40 }} />
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
        {statsError && (
          <View style={[s.statsAlert, Shadows.sm]}>
            <Feather name="alert-circle" size={14} color="#B45309" />
            <Text style={s.statsAlertText}>{statsError || 'Unable to load live stats right now.'}</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
          {[
            { label: 'FARMS ANALYZED', value: stats?.farms, icon: 'map', color: '#059669', bg: 'rgba(16, 185, 129, 0.2)', gradient: ['#F0FDF4', '#D1FAE5'] },
            { label: 'SOIL TESTS', value: stats?.tests, icon: 'activity', color: '#D97706', bg: 'rgba(245, 158, 11, 0.2)', gradient: ['#FFFBEB', '#FEF3C7'] },
            { label: 'AI RECOMMENDATIONS', value: stats?.aiTips, icon: 'zap', color: '#2563EB', bg: 'rgba(59, 130, 246, 0.2)', gradient: ['#EFF6FF', '#DBEAFE'] },
          ].map((st, i) => (
            <View key={i} style={[Shadows.sm, { flex: 1, borderRadius: 20, borderWidth: 1, borderColor: st.bg, overflow: 'hidden' }]}>
              <LinearGradient colors={st.gradient as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

              <View style={{ position: 'absolute', right: -15, bottom: -15, opacity: 0.15, transform: [{ rotate: '-15deg' }] }}>
                <Feather name={st.icon as any} size={70} color={st.color} />
              </View>

              <View style={{ paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center' }}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: 8, borderRadius: 12, marginBottom: 8, ...Shadows.sm }}>
                  <Feather name={st.icon as any} size={18} color={st.color} />
                </View>
                <Text style={{ fontSize: 11, color: Colors.label2, fontFamily: 'Sora_700Bold', letterSpacing: 0.5, marginBottom: 4 }}>{st.label}</Text>
                {isStatsLoading
                  ? <ActivityIndicator size="small" color={st.color} style={{ marginTop: 2 }} />
                  : typeof st.value === 'number'
                    ? <AnimatedCounter value={st.value} style={{ color: st.color, fontSize: 26, fontFamily: 'Sora_700Bold', letterSpacing: -1 }} />
                    : <Text style={{ color: Colors.label2, fontSize: 20, fontFamily: 'Sora_700Bold' }}>--</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* ── AGNI CONNECT HERO CARD ── */}
        <View style={[s.heroCard, Shadows.md, { backgroundColor: '#FFF5EF', borderColor: 'rgba(255, 107, 0, 0.1)', borderWidth: 1.5 }]}>
          <LinearGradient colors={['#FFEDE4', '#F4F4F4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

          <View style={{ paddingVertical: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 28, fontFamily: 'Sora_700Bold', color: '#1A1A1A', marginBottom: 12, letterSpacing: -0.8 }}>Connect Agni</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Sora_500Medium', color: '#4A4A4A', lineHeight: 24, marginBottom: 24 }}>
                Pair your soil sensor instantly for real-time insights.
              </Text>
              <TouchableOpacity onPress={handleConnect} style={{ alignSelf: 'flex-start' }}>
                <LinearGradient colors={['#FF5F6D', '#FFC371']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.heroBtn, { borderWidth: 0, paddingHorizontal: 24 }]}>
                  <Text style={{ fontSize: 16, fontFamily: 'Sora_600SemiBold', color: '#FFFFFF', marginRight: 10 }}>Pair Device</Text>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={{ position: 'relative' }}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 107, 0, 0.1)', borderRadius: 50, filter: 'blur(20px)', transform: [{ scale: 1.5 }] }]} />
              <FloatingAgniDevice />
            </View>
          </View>
        </View>

        <GlassCard style={{ padding: 21, marginBottom: 28, ...Shadows.md }}>
          <Text style={{ ...Type.title3, color: Colors.label1, marginBottom: 17 }}>Testing Speed</Text>
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

        <SectionHeader title="Saathi Features" />
        <GlassCard style={{ marginBottom: 32, paddingVertical: 8, ...Shadows.md }}>
          {FEATURES.map((f, i) => (
            <View key={i}>
              <TouchableOpacity onPress={() => showPopup(f.id)} style={s.featureRow}>
                <View style={[s.featureIconBox, { backgroundColor: f.bg }]}>
                  <MaterialCommunityIcons name={f.icon as any} size={20} color={f.color} />
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

        <SectionHeader title="How It Works" />
        <HowItWorksTicker />

        <View style={{ alignItems: 'center', marginBottom: 18, marginTop: 34, }}>
          <Text style={{ ...Type.headline, color: Colors.label3 }}>Trusted & Recognized</Text>
        </View>

        <AwardsTicker />

        <View style={{ alignItems: 'flex-start', marginTop: 20, marginBottom: -18 }}>
          <Text style={{ fontSize: 24, color: Colors.label2, fontFamily: 'Sora_600SemiBold', lineHeight: 34, marginBottom: 16, letterSpacing: -0.5 }}>
            Har kisan ka digital saathi,{'\n'}Mitti samjho, sahi faisla lo...
          </Text>
          <Text style={{ fontSize: 16, color: Colors.label3, fontFamily: 'Sora_500Medium', letterSpacing: 0.2 }}>
            💚 From Mitti AI
          </Text>
        </View>
      </ScrollView>

      {selectedFeature && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[s.popupOverlay, { opacity: popupFade }]}>
            <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={hidePopup} />
          </Animated.View>
          <Animated.View style={[s.popupContainer, { transform: [{ translateY: popupSlide }] }]}>
            <View style={s.popupCard}>
              <LinearGradient colors={FEATURE_DETAILS[selectedFeature].gradient} style={s.popupGradientHeader}>
                <View style={[s.popupIconBox, { backgroundColor: FEATURE_DETAILS[selectedFeature].color + '22' }]}>
                  <MaterialCommunityIcons name={FEATURE_DETAILS[selectedFeature].icon as any} size={32} color={FEATURE_DETAILS[selectedFeature].color} />
                </View>
              </LinearGradient>
              <View style={s.popupBody}>
                <Text style={s.popupPopupTitle}>{FEATURE_DETAILS[selectedFeature].title}</Text>
                <Text style={s.popupTagline}>{FEATURE_DETAILS[selectedFeature].tagline}</Text>
                <View style={s.popupDivider} />
                <Text style={s.popupContent}>{FEATURE_DETAILS[selectedFeature].content}</Text>
                <View style={s.popupResultBox}>
                  <Text style={s.popupResultLabel}>KEY BENEFIT</Text>
                  <Text style={s.popupResultText}>{FEATURE_DETAILS[selectedFeature].result}</Text>
                </View>
                <TouchableOpacity onPress={hidePopup} style={s.popupCloseBtn}>
                  <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={s.popupCloseGradient}>
                    <Text style={s.popupCloseText}>Got it, thanks!</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg0 },
  blob: { position: 'absolute', borderRadius: 999, filter: 'blur(30px)' },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 150,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 28,
  },
  greeting: { ...Type.callout, color: Colors.label2, marginBottom: 4 },
  name: { ...Type.largeTitle, color: Colors.label1 },
  headerRight: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 6 },
  statsAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFBEB', borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A',
    paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10,
  },
  statsAlertText: { flex: 1, fontFamily: 'Sora_500Medium', fontSize: 11, color: '#92400E' },
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.sep2, backgroundColor: '#FFF'
  },
  avatarText: { ...Type.subheadline, color: Colors.label1 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.sep2, overflow: 'hidden',
  },
  statCard: {
    backgroundColor: Colors.surface,
    paddingVertical: 18, paddingHorizontal: 24,
    alignItems: 'center', justifyContent: 'center',
    minWidth: 104, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.sep2,
    overflow: 'hidden',
  },
  statLabel: { ...Type.caption2, color: Colors.label3, marginBottom: 6 },
  statValue: { ...Type.title2, color: Colors.label1 },
  statSpecular: {
    position: 'absolute', top: 0, left: 16, right: 16,
    height: 1, backgroundColor: 'rgba(255,255,255,0.7)',
  },
  heroCard: {
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 28, overflow: 'hidden',
  },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 100, overflow: 'hidden', alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  featureIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureTitle: { ...Type.headline, color: Colors.label1 },
  featureSubtitle: { ...Type.footnote, color: Colors.label3, marginTop: 2 },
  chevronBox: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.sep2, alignItems: 'center', justifyContent: 'center' },
  featureSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.sep1, marginLeft: 80 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 8 },
  sectionTitle: { ...Type.title2, color: Colors.label1 },
  sectionAction: { ...Type.callout, color: Colors.primary, fontFamily: 'Sora_600SemiBold' },
  notifDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error },
  notifPanel: { backgroundColor: Colors.surface, borderRadius: 20, padding: 16, marginBottom: 24, ...Shadows.md, borderWidth: 1, borderColor: Colors.sep2 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  notifTitle: { ...Type.title3, color: Colors.label1 },
  notifItem: { flexDirection: 'row', marginBottom: 16, alignItems: 'center' },
  notifAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  notifItemUser: { ...Type.headline, color: Colors.label1 },
  notifItemMsg: { ...Type.subheadline, color: Colors.label2 },
  notifTime: { ...Type.caption2, color: Colors.label3, marginTop: 4 },

  // POPUP STYLES
  popupOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  popupContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },
  popupCard: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    overflow: 'hidden',
    ...Shadows.lg,
    elevation: 20,
  },
  popupGradientHeader: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  popupBody: {
    padding: 24,
    paddingTop: 16,
  },
  popupPopupTitle: {
    ...Type.title1,
    color: Colors.label1,
    textAlign: 'center',
  },
  popupTagline: {
    ...Type.headline,
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 4,
  },
  popupDivider: {
    height: 1,
    backgroundColor: Colors.sep2,
    marginVertical: 20,
    width: '60%',
    alignSelf: 'center',
  },
  popupContent: {
    ...Type.body,
    color: Colors.label2,
    lineHeight: 28,
  },
  popupResultBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: Colors.bg0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.sep2,
  },
  popupResultLabel: {
    ...Type.caption2,
    color: Colors.primary,
    marginBottom: 4,
  },
  popupResultText: {
    ...Type.subheadline,
    color: Colors.label1,
    fontFamily: 'Sora_700Bold',
  },
  popupCloseBtn: {
    marginTop: 32,
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadows.md,
  },
  popupCloseGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupCloseText: {
    ...Type.headline,
    color: '#FFF',
  },
});


