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
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import { Shadows } from '@/constants/Shadows';
import { Type } from '@/constants/Typography';
import { Image, Modal } from 'react-native';
import LottieView from 'lottie-react-native';
import { getDashboardStats, DashboardStats } from '@/services/analytics';
import { getNotifications, AppNotification, markNotificationRead, notifyUser } from '@/services/notifications';

import { useNavigationStore } from '@/store/navigationStore';
import { tabBarY, hideTabBar, showTabBar } from '@/constants/Animations';

import { useHomeTheme } from '@/context/ThemeContext';

function BouncingIndicator({ state }: { state: 'connecting' | 'connected' | 'disconnected' }) {
  const { theme } = useHomeTheme();
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 6, duration: 800, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const color = state === 'connected' ? theme.success : state === 'connecting' ? theme.amber : theme.error;

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

const getProfilePictureUrl = (filename: string | null | undefined): string | null => {
  if (!filename) return null;
  const filenameMap: Record<string, string> = {
    'farmer.png': 'farmer.png',
    'farmer_1.png': 'farmer (1).png',
    'farmer_2.png': 'farmer (2).png',
    'farmer_3.png': 'farmer (3).png',
    'farmer_4.png': 'farmer (4).png',
    'farmer (1).png': 'farmer (1).png',
    'farmer (2).png': 'farmer (2).png',
    'farmer (3).png': 'farmer (3).png',
    'farmer (4).png': 'farmer (4).png',
  };
  const mappedName = filenameMap[filename] || filename;
  if (filename.startsWith('http')) return filename;
  const encodedName = encodeURI(mappedName);
  return `https://www.saathiai.org/Farmer_Icon/${encodedName}`;
};

const getUserAvatar = (u: any): string | null => {
  const filename = u?.profilePicture || u?.profile_picture || u?.avatar_url || u?.profile_image;
  return getProfilePictureUrl(filename);
};

const getNotifIcon = (theme: any, type: string) => {
  switch (type) {
    case 'alert': return { name: 'alert-circle', color: theme.error };
    case 'insight': return { name: 'brain', color: theme.primary };
    case 'reminder': return { name: 'calendar', color: theme.amber };
    case 'battery': return { name: 'battery-alert', color: theme.error };
    case 'sync': return { name: 'sync', color: theme.success };
    default: return { name: 'bell', color: theme.primary };
  }
};


const AWARDS = [
  '🏆 Disruptive Innovation Award', '🌱 Best Farmer-Tech Solution',
  '🚀 Govt. Incubated Startup', '💰 ₹5L Govt Seed Grant',
  '🏅 FM University Innovation', '⚡ < 60s Soil Testing', '🥇 State Level Winner',
];
const AWARDS_X2 = [...AWARDS, ...AWARDS];

function AwardsTicker() {
  const { theme } = useHomeTheme();
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
            backgroundColor: theme.surface, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 10,
            marginRight: 12, minWidth: 180, alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: theme.sep2, ...Shadows.sm
          }}>
            <Text style={{ ...Type.caption2, color: theme.label2 }}>{a}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

// ─── Reusable Components ────────────────────────────────────────────────────────
function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { theme } = useHomeTheme();
  return (
    <View style={s.sectionHeader}>
      <Text style={[s.sectionTitle, { color: theme.label1 }]}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={[s.sectionAction, { color: theme.primary }]}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function GlassCard({ style, children }: { style?: any; children: React.ReactNode }) {
  const { theme } = useHomeTheme();
  return (
    <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.sep2 }, style]}>
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
  const { theme, isDark } = useHomeTheme();
  
  const HOW_STEPS = [
    {
      num: 1, numBg: isDark ? 'rgba(34, 197, 94, 0.2)' : '#d1fae5', numText: isDark ? '#34D399' : '#065f46',
      animation: require('assets/animations/Microscope.json'),
      title: 'Scan Soil with Agni',
      body: 'Insert the Agni device into your field to instantly read real-time soil parameters.',
    },
    {
      num: 2, numBg: isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe', numText: isDark ? '#60A5FA' : '#1e40af',
      animation: require('assets/animations/Bluetooth-icon.json'),
      title: 'Connect to Saathi',
      body: 'Sync your sensor data securely via Bluetooth to the Saathi mobile app.',
    },
    {
      num: 3, numBg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7', numText: isDark ? '#FBBF24' : '#92400e',
      animation: require('assets/animations/Brain.json'),
      title: 'Get AI Advice',
      body: 'Receive personalized crop plans and smart fertilizer recommendations.',
    },
  ];

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
                  <Text style={{ fontSize: 18, fontFamily: 'Sora_700Bold', color: theme.label1, marginBottom: 8, letterSpacing: -0.5 }}>{step.title}</Text>
                  <Text numberOfLines={4} style={{ fontSize: 14, fontFamily: 'Sora_400Regular', color: theme.label2, lineHeight: 21 }}>{step.body}</Text>
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
  const { theme, isDark } = useHomeTheme();
  const user = useAuthStore(s => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const isStatsLoading = statsLoading === true;

  const FEATURES = [
    { id: 'analysis', icon: 'trending-up', color: theme.featureGreen, bg: theme.fillGreen, title: 'Instant Analysis', subtitle: 'Get comprehensive soil health data in seconds with our Agni device.', tabIndex: 2 },
    { id: 'language', icon: 'brain', color: theme.featureBlue, bg: theme.fillBlue, title: 'Local Language', subtitle: 'Receive recommendations in Odia, Hindi, or English with voice support.', tabIndex: 2 },
    { id: 'farming', icon: 'microscope', color: theme.featureAmber, bg: theme.fillAmber, title: 'Sustainable Farming', subtitle: 'AI-powered organic fertilizer recommendations for better crop yield.', tabIndex: 2 },
    { id: 'mapping', icon: 'map-marker-radius', color: theme.featurePurple, bg: theme.fillPurple, title: 'Field Mapping', subtitle: 'Visualize your soil data on interactive maps for better field management.', tabIndex: 2 },
  ];

  const FEATURE_DETAILS: Record<string, any> = {
    analysis: {
      title: 'Instant Analysis',
      tagline: 'Know Your Soil Instantly with Agni ⚡',
      content: 'Traditional soil testing takes days, sometimes even weeks. Farmers often have to depend on distant laboratories, spend money on testing, and wait without clarity. This delay can lead to wrong fertilizer decisions, reduced crop quality, and unnecessary expenses.\n\nWith Saathi AI and the Agni Soil Scanner, you can analyze your soil directly from your field within seconds. Just insert the device into the soil, and it instantly measures critical parameters like Nitrogen (N), Phosphorus (P), Potassium (K), pH level, moisture, and temperature.\n\nThe system then converts this raw data into a simple, easy-to-understand soil health report. You will also receive an AI-powered soil health score and immediate recommendations tailored specifically to your field conditions.\n\nThis means you no longer have to guess what your soil needs. You can take precise actions at the right time, improving crop yield, reducing fertilizer waste, and saving both time and money.\n\nSaathi AI brings lab-level accuracy directly to your hands — fast, reliable, and farmer-friendly.',
      result: 'Save time, increase yield, avoid lab delays',
      icon: 'trending-up',
      color: theme.featureGreen,
      gradient: theme.cardGradientGreen
    },
    language: {
      title: 'Local Language',
      tagline: 'Farming Guidance in Your Own Language 🗣️',
      content: 'Many farmers struggle to use modern technology because most apps and tools are only available in English or use complicated terminology. This creates a gap between advanced technology and real-world farming needs.\n\nSaathi AI removes this barrier completely by allowing you to interact in your own language. Whether you speak Odia, Hindi, or English, you can ask questions, understand recommendations, and receive guidance in a way that feels natural to you.\n\nYou can even use voice input to speak directly to the AI. Ask questions like “Which fertilizer should I use?” or “Why is my crop turning yellow?” and get clear, practical answers instantly.\n\nThe system not only translates but understands your farming context, making the advice more relevant and actionable. This ensures that every farmer, regardless of education level or language, can confidently use advanced AI tools.\n\nWith Saathi AI, technology becomes simple, accessible, and truly inclusive for every farmer.',
      result: 'No confusion, easy decisions for every farmer',
      icon: 'brain',
      color: theme.featureBlue,
      gradient: theme.cardGradientBlue
    },
    farming: {
      title: 'Sustainable Farming',
      tagline: 'Smart and Sustainable Farming for the Future 🌿',
      content: 'Excessive use of chemical fertilizers can harm soil health over time, reduce productivity, and increase farming costs. Many farmers unknowingly overuse fertilizers, leading to poor soil balance and long-term damage.\n\nSaathi AI helps you adopt a smarter and more sustainable approach to farming. Based on your soil data, it provides precise recommendations on what your soil actually needs — not more, not less.\n\nYou will receive a balanced mix of organic and chemical fertilizer suggestions, helping you reduce unnecessary chemical usage while maintaining high productivity. The system also suggests suitable crops based on soil condition, season, and nutrient levels.\n\nBy following these recommendations, you can improve soil fertility, reduce input costs, and ensure better crop quality. Over time, this leads to healthier land, higher profits, and a more sustainable farming practice.\n\nSaathi AI empowers you to farm intelligently — protecting both your income and your soil for future generations.',
      result: 'Better soil health + long-term profit',
      icon: 'microscope',
      color: theme.featureAmber,
      gradient: theme.cardGradientAmber
    },
    mapping: {
      title: 'Field Mapping',
      tagline: 'Understand Your Farm Like Never Before 📍',
      content: 'Every part of your field is different. Soil conditions can vary from one area to another, but traditional farming methods treat the entire field the same. This often leads to uneven crop growth and inefficient use of resources.\n\nSaathi AI introduces smart field mapping to solve this problem. Every time you perform a soil test, the data is linked to a specific location on your farm. Over time, this creates a detailed map of your field showing variations in soil health.\n\nYou can visualize where nutrients are low, where moisture is high, and which areas need special attention. This allows you to take targeted actions instead of applying the same treatment everywhere.\n\nWith this insight, you can optimize fertilizer usage, improve crop consistency, and make better long-term planning decisions. It transforms your farm into a data-driven system where every decision is backed by real information.\n\nSaathi AI helps you see your land not just as a field, but as a smart, manageable ecosystem.',
      result: 'Make data-driven farming decisions',
      icon: 'map-marker-radius',
      color: theme.featurePurple,
      gradient: theme.cardGradientPurple
    }
  };

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
    useNavigationStore.getState().setCurrentIndex(1);
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
      <View style={[s.root, { backgroundColor: theme.background }]}>
      {/* ── MESH BACKGROUND ── */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={[theme.bg0, theme.bg1, theme.surface]} style={StyleSheet.absoluteFill} />
        <View style={[s.blob, { top: -80, left: -50, width: 300, height: 300, backgroundColor: isDark ? 'rgba(34, 180, 85, 0.15)' : 'rgba(167, 243, 208, 0.4)' }]} />
        <View style={[s.blob, { top: 150, right: -100, width: 350, height: 350, backgroundColor: isDark ? 'rgba(34, 180, 85, 0.1)' : 'rgba(224, 245, 233, 0.5)' }]} />
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
            <Text numberOfLines={1} adjustsFontSizeToFit style={[s.greeting, { fontSize: 34, marginBottom: 2, marginTop: 28, paddingVertical: 10, lineHeight: 45, color: theme.label2 }]}>{getGreeting()}</Text>

            {/* ADJUST USER NAME SIZE HERE */}

            <Text numberOfLines={1} adjustsFontSizeToFit style={[s.name, { fontSize: 49, fontFamily: 'Pacifico_400Regular', lineHeight: 50, color: theme.label1 }]}>{getFirstName(user)}</Text>

          </View>
          <View style={s.headerRight}>
            <TouchableOpacity onPress={() => router.push('/(app)/notifications')} style={[s.headerBtn, { backgroundColor: theme.surface, borderColor: theme.sep2, ...Shadows.sm }]}>
              <Feather name="bell" size={20} color={theme.label2} />
              {(Array.isArray(notifications) ? notifications : []).some(n => !n.isRead) && <View style={s.notifDot} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => useNavigationStore.getState().setCurrentIndex(4)} style={[s.headerBtn, { backgroundColor: theme.surface, borderColor: theme.sep2, ...Shadows.sm, padding: 0, overflow: 'hidden' }]}>
              {getUserAvatar(user) ? (
                <Image source={{ uri: getUserAvatar(user) as string }} style={{ width: 44, height: 44, borderRadius: 22 }} />
              ) : (
                <LinearGradient colors={['#4ade80', '#16a34a']} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: 'Sora_800ExtraBold', fontSize: 16, color: '#fff' }}>{getInitials(user)}</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        </View>


        {/* ── STATS ROW ── */}
        {statsError && (
          <View style={[s.statsAlert, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB', borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A' }, Shadows.sm]}>
            <Feather name="alert-circle" size={14} color={isDark ? theme.warning : "#B45309"} />
            <Text style={[s.statsAlertText, { color: isDark ? theme.label2 : "#92400E" }]}>{statsError || 'Unable to load live stats right now.'}</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
          {[
            { label: 'FARMS ANALYZED', value: stats?.farms, icon: 'map', color: isDark ? '#34D399' : '#059669', bg: theme.fillGreen, gradient: theme.statsGreen },
            { label: 'SOIL TESTS', value: stats?.tests, icon: 'activity', color: isDark ? '#FBBF24' : '#D97706', bg: theme.fillAmber, gradient: theme.statsAmber },
            { label: 'AI RECOMMENDATIONS', value: stats?.aiTips, icon: 'zap', color: isDark ? '#60A5FA' : '#2563EB', bg: theme.fillBlue, gradient: theme.statsBlue },
          ].map((st, i) => (
            <View key={i} style={[Shadows.sm, { flex: 1, borderRadius: 20, borderWidth: 1, borderColor: st.bg, overflow: 'hidden' }]}>
              <LinearGradient colors={st.gradient as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

              <View style={{ position: 'absolute', right: -15, bottom: -15, opacity: 0.15, transform: [{ rotate: '-15deg' }] }}>
                <Feather name={st.icon as any} size={70} color={st.color} />
              </View>

              <View style={{ paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center' }}>
                <View style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', padding: 8, borderRadius: 12, marginBottom: 8, ...Shadows.sm }}>
                  <Feather name={st.icon as any} size={18} color={st.color} />
                </View>
                <Text style={{ fontSize: 11, color: theme.label2, fontFamily: 'Sora_700Bold', letterSpacing: 0.5, marginBottom: 4 }}>{st.label}</Text>
                {isStatsLoading
                  ? <ActivityIndicator size="small" color={st.color} style={{ marginTop: 2 }} />
                  : typeof st.value === 'number'
                    ? <AnimatedCounter value={st.value} style={{ color: st.color, fontSize: 26, fontFamily: 'Sora_700Bold', letterSpacing: -1 }} />
                    : <Text style={{ color: theme.label2, fontSize: 20, fontFamily: 'Sora_700Bold' }}>--</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* ── AGNI CONNECT HERO CARD ── */}
        <View style={[s.heroCard, Shadows.md, { backgroundColor: theme.heroBackground, borderColor: theme.heroBorder, borderWidth: 1.5 }]}>
          <LinearGradient colors={theme.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

          <View style={{ paddingVertical: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 28, fontFamily: 'Sora_700Bold', color: theme.heroText, marginBottom: 12, letterSpacing: -0.8 }}>Connect Agni</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Sora_500Medium', color: theme.heroSubtext, lineHeight: 24, marginBottom: 24 }}>
                Pair your soil sensor instantly for real-time insights.
              </Text>
              <TouchableOpacity onPress={handleConnect} style={{ alignSelf: 'flex-start' }}>
                <LinearGradient colors={theme.heroBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.heroBtn, { borderWidth: 0, paddingHorizontal: 24 }]}>
                  <Text style={{ fontSize: 16, fontFamily: 'Sora_600SemiBold', color: '#FFFFFF', marginRight: 10 }}>Pair Agni</Text>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={{ position: 'relative' }}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(34, 180, 85, 0.2)' : 'rgba(255, 107, 0, 0.1)', borderRadius: 50, filter: 'blur(20px)', transform: [{ scale: 1.5 }] }]} />
              <FloatingAgniDevice />
            </View>
          </View>
        </View>

        <GlassCard style={{ padding: 21, marginBottom: 28, ...Shadows.md }}>
          <Text style={{ ...Type.title3, color: theme.label1, marginBottom: 17 }}>Testing Speed</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <MaterialCommunityIcons name="flask-outline" size={16} color={theme.error} style={{ marginRight: 6 }} />
                <Text style={{ ...Type.subheadline, color: theme.label2 }}>Traditional Lab</Text>
              </View>
              <Text style={{ ...Type.title3, color: theme.error }}>14 days wait</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ ...Type.subheadline, color: theme.label1 }}>Saathi AI</Text>
                <Feather name="cpu" size={16} color={theme.success} style={{ marginLeft: 6 }} />
              </View>
              <Text style={{ ...Type.title3, color: theme.success }}>{'< 60 seconds'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ ...Type.caption2, color: theme.label3 }}>EFFICIENCY</Text>
            <Text style={{ ...Type.caption2, color: theme.success }}>336X FASTER</Text>
          </View>
          <View style={{ height: 8, backgroundColor: theme.sep2, borderRadius: 4, overflow: 'hidden' }}>
            <LinearGradient colors={isDark ? ['#065f46', theme.success] : ['#A7F3D0', theme.success]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: '98%', height: '100%', borderRadius: 4 }} />
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
                  <Text style={[s.featureTitle, { color: theme.label1 }]}>{f.title}</Text>
                  <Text style={[s.featureSubtitle, { color: theme.label3 }]}>{f.subtitle}</Text>
                </View>
                <View style={[s.chevronBox, { backgroundColor: theme.sep2 }]}>
                  <Feather name="chevron-right" size={18} color={theme.label3} />
                </View>
              </TouchableOpacity>
              {i !== FEATURES.length - 1 && <View style={[s.featureSeparator, { backgroundColor: theme.sep1 }]} />}
            </View>
          ))}
        </GlassCard>

        <SectionHeader title="How It Works" />
        <HowItWorksTicker />

        <View style={{ alignItems: 'center', marginBottom: 18, marginTop: 34, }}>
          <Text style={{ ...Type.headline, color: theme.label3 }}>Trusted & Recognized</Text>
        </View>

        <AwardsTicker />

        <View style={{ alignItems: 'flex-start', marginTop: 20, marginBottom: -18 }}>
          <Text style={{ fontSize: 24, color: theme.label2, fontFamily: 'Sora_600SemiBold', lineHeight: 34, marginBottom: 16, letterSpacing: -0.5 }}>
            Har kisan ka digital saathi,{'\n'}Mitti samjho, sahi faisla lo...
          </Text>
          <Text style={{ fontSize: 16, color: theme.label3, fontFamily: 'Sora_500Medium', letterSpacing: 0.2 }}>
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
            <View style={[s.popupCard, { backgroundColor: theme.modalBackground }]}>
              <View style={[s.popupHandle, { backgroundColor: theme.popupHandle }]} />
              <ScrollView showsVerticalScrollIndicator={false} bounces={true}>
                <LinearGradient colors={FEATURE_DETAILS[selectedFeature].gradient} style={s.popupGradientHeader}>
                  <View style={[s.popupIconBox, { backgroundColor: FEATURE_DETAILS[selectedFeature].color + '22' }]}>
                    <MaterialCommunityIcons name={FEATURE_DETAILS[selectedFeature].icon as any} size={32} color={FEATURE_DETAILS[selectedFeature].color} />
                  </View>
                </LinearGradient>
                <View style={s.popupBody}>
                  <Text style={[s.popupPopupTitle, { color: theme.label1 }]}>{FEATURE_DETAILS[selectedFeature].title}</Text>
                  <Text style={[s.popupTagline, { color: theme.featureGreen }]}>{FEATURE_DETAILS[selectedFeature].tagline}</Text>
                  <View style={[s.popupDivider, { backgroundColor: theme.sep2 }]} />
                  <Text style={[s.popupContent, { color: theme.label2 }]}>{FEATURE_DETAILS[selectedFeature].content}</Text>
                  <View style={[s.popupResultBox, { backgroundColor: theme.bg0, borderColor: theme.sep2 }]}>
                    <Text style={[s.popupResultLabel, { color: theme.primary }]}>KEY BENEFIT</Text>
                    <Text style={[s.popupResultText, { color: theme.label1 }]}>{FEATURE_DETAILS[selectedFeature].result}</Text>
                  </View>
                  <TouchableOpacity onPress={hidePopup} style={s.popupCloseBtn}>
                    <LinearGradient colors={[theme.primary, theme.primaryDark]} style={s.popupCloseGradient}>
                      <Text style={s.popupCloseText}>Got it, thanks!</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
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
  greeting: { ...Type.callout, marginBottom: 4 },
  name: { ...Type.largeTitle },
  headerRight: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 6 },
  statsAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10,
  },
  statsAlertText: { flex: 1, fontFamily: 'Sora_500Medium', fontSize: 11 },
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1
  },
  avatarText: { ...Type.subheadline },
  card: {
    borderRadius: 20, borderWidth: 1, overflow: 'hidden',
  },
  statCard: {
    paddingVertical: 18, paddingHorizontal: 24,
    alignItems: 'center', justifyContent: 'center',
    minWidth: 104, borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statLabel: { ...Type.caption2, marginBottom: 6 },
  statValue: { ...Type.title2 },
  statSpecular: {
    position: 'absolute', top: 0, left: 16, right: 16,
    height: 1, backgroundColor: 'rgba(255,255,255,0.7)',
  },
  heroCard: {
    borderRadius: 24, borderWidth: 1, marginBottom: 28, overflow: 'hidden',
  },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 100, overflow: 'hidden', alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  featureIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureTitle: { ...Type.headline },
  featureSubtitle: { ...Type.footnote, marginTop: 2 },
  chevronBox: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featureSeparator: { height: StyleSheet.hairlineWidth, marginLeft: 80 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 8 },
  sectionTitle: { ...Type.title2 },
  sectionAction: { ...Type.callout, fontFamily: 'Sora_600SemiBold' },
  notifDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error },
  notifPanel: { borderRadius: 20, padding: 16, marginBottom: 24, ...Shadows.md, borderWidth: 1 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  notifTitle: { ...Type.title3 },
  notifItem: { 
    flexDirection: 'row', 
    paddingVertical: 12, 
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
    alignItems: 'center' 
  },
  notifItemUnread: {
  },
  notifIconContainer: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12 
  },
  notifItemTitle: { ...Type.headline, fontSize: 14 },
  notifItemMsg: { ...Type.subheadline, fontSize: 13, marginTop: 2 },
  notifTime: { ...Type.caption2, marginTop: 4 },
  unreadDot: { width: 6, height: 6, borderRadius: 3 },
  testNotifBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  testNotifText: { ...Type.caption1, fontFamily: 'Sora_600SemiBold' },


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
    borderRadius: 32,
    overflow: 'hidden',
    ...Shadows.lg,
    elevation: 20,
    maxHeight: Dimensions.get('window').height * 0.75,
  },
  popupHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
    position: 'absolute',
    top: 0,
    zIndex: 10,
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
    textAlign: 'center',
  },
  popupTagline: {
    ...Type.headline,
    textAlign: 'center',
    marginTop: 4,
  },
  popupDivider: {
    height: 1,
    marginVertical: 20,
    width: '60%',
    alignSelf: 'center',
  },
  popupContent: {
    ...Type.body,
    lineHeight: 28,
  },
  popupResultBox: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  popupResultLabel: {
    ...Type.caption2,
    marginBottom: 4,
  },
  popupResultText: {
    ...Type.subheadline,
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



