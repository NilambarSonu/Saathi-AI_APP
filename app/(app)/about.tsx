import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Image,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

// ─── Data ─────────────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name:  'Mahendra Behera',
    label: 'Farmer from Balasore',
    text:  '"Saathi AI helped me understand my soil better. The Odia recommendations made it so easy to follow, and my crop yield improved by 30% this season."',
    stars: 5,
  },
  {
    name:  'Ramamani Behera',
    label: 'Progressive Farmer, Cuttack',
    text:  '"The AI chat feature is amazing! I can ask questions anytime and get instant answers in my language. It\'s like having an agricultural expert in my pocket."',
    stars: 5,
  },
];

const getTECH_FEATURES = (theme: any) => [
  {
    icon:  'analytics-outline' as const,
    color: '#00897B',
    bg:    theme.fillGreen,
    title: 'Advanced Sensors',
    desc:  'Multi-parameter soil analysis with laboratory-grade accuracy',
  },
  {
    icon:  'hardware-chip-outline' as const,
    color: '#1565C0',
    bg:    theme.fillBlue,
    title: 'AI Processing',
    desc:  'Machine learning algorithms trained on local soil data',
  },
  {
    icon:  'chatbubble-ellipses-outline' as const,
    color: '#F57C00',
    bg:    theme.fillAmber,
    title: 'Local Language Support',
    desc:  'Recommendations in Odia, Hindi, and English with audio support',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Stars({ count, theme }: { count: number; theme: any }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons key={i} name="star" size={16} color={i <= count ? '#FFC107' : theme.sep2} />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email,    setEmail]    = useState('');
  const [message,  setMessage]  = useState('');

  const TECH_FEATURES = getTECH_FEATURES(theme);

  const handleSend = () => {
    if (!fullName.trim() || !email.trim() || !message.trim()) {
      Alert.alert('Missing Fields', 'Please fill all fields before sending.');
      return;
    }
    Linking.openURL(
      `mailto:saathi.ai.innovation@gmail.com?subject=Message from ${fullName}&body=${message}`
    );
  };

  const topPad =
    insets.top || (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0);

  return (
    <View style={[s.root, { paddingTop: topPad, backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* ── Nav bar (matches app header) ──────────────────────────────────── */}
      <View style={[s.navbar, { backgroundColor: theme.surface, borderBottomColor: theme.sep2 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.navBack, { backgroundColor: theme.fillGreen }]} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={theme.primary} />
        </TouchableOpacity>
        <View style={s.navBrand}>
          <Ionicons name="leaf" size={18} color={theme.success} />
          <Text style={[s.navTitle, { color: theme.textPrimary }]}>Saathi AI</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >

        {/* ── 1. Hero card — themed background ───────────────────────── */}
        <View style={[s.heroCard, { backgroundColor: theme.primaryLight }]}>
          <Text style={[s.heroTitle, { color: theme.primary }]}>About Saathi AI</Text>
          <Text style={[s.heroDesc, { color: theme.textSecondary }]}>
            Revolutionizing agriculture through organic intelligence, empowering
            farmers with AI-driven insights for sustainable farming practices.
          </Text>
        </View>

        {/* ── 2. Our Mission ─────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionHeading, { color: theme.textPrimary }]}>Our Mission</Text>
          <Text style={[s.bodyText, { color: theme.textSecondary }]}>
            At Agni Innovations, we believe that technology should serve those
            who feed the world. Our mission is to bridge the gap between advanced
            agricultural science and traditional farming wisdom, making precision
            agriculture accessible to every farmer.
          </Text>
          <Text style={[s.bodyText, { color: theme.textSecondary, marginTop: 14 }]}>
            Saathi AI combines the power of artificial intelligence with deep
            understanding of local farming practices, delivering personalized
            recommendations in farmers' native languages.
          </Text>
        </View>

        {/* ── 3 + 4. Stats + How Our Technology Works — 3D premium block ── */}
        <LinearGradient
          colors={['#1B5E20', '#2E7D32', '#1B8C3A', '#0D5C2E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.techBlock}
        >
          {/* Decorative glow rings */}
          <View style={s.techRing1} />
          <View style={s.techRing2} />

          {/* Centred stat cards */}
          <View style={s.statsRow3D}>
            <View style={s.statCard3D}>
              <Text style={s.statVal3D}>5+</Text>
              <Text style={s.statLabel3D}>Years of{`\n`}Research</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCard3D}>
              <Text style={s.statVal3D}>50+</Text>
              <Text style={s.statLabel3D}>Farming{`\n`}Partners</Text>
            </View>
          </View>

          {/* Separator line */}
          <View style={s.techSep} />

          {/* Banner title */}
          <View style={s.techBannerInner}>
            <View style={s.techIconCircle}>
              <Ionicons name="flask-outline" size={20} color="#fff" />
            </View>
            <Text style={s.techBannerTitle}>How Our Technology Works</Text>
          </View>
          <Text style={s.techBannerSub}>
            Precision AI · Local Wisdom · Farmer-First Design
          </Text>
        </LinearGradient>

        {/* Tech feature rows */}
        <View style={[s.techList, { backgroundColor: theme.primaryLight }]}>
          {TECH_FEATURES.map((feat, i) => (
            <View key={i} style={s.techRow}>
              <View style={[s.techIconBox, { backgroundColor: feat.bg }]}>
                <Ionicons name={feat.icon} size={24} color={feat.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.techTitle, { color: theme.textPrimary }]}>{feat.title}</Text>
                <Text style={[s.techDesc, { color: theme.textSecondary }]}>{feat.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── 5. Meet Our Team ───────────────────────────────────────────── */}
        <View style={s.teamSection}>
          <Text style={[s.teamHeading, { color: theme.primary }]}>Meet Our Team</Text>

          {/* Founder */}
          <View style={[s.teamCard, { backgroundColor: theme.surface, borderColor: theme.sep2 }]}>
            <View style={[s.teamAvatarRing, { borderColor: theme.primaryLight }]}>
              <Image
                source={require('../../assets/images/founder.png')}
                style={s.teamAvatarImg}
                resizeMode="cover"
              />
            </View>
            <Text style={[s.teamName, { color: theme.textPrimary }]}>Nilambar Behera</Text>
            <View style={[s.teamRolePillBlue, { backgroundColor: theme.fillBlue }]}>
              <Text style={[s.teamRoleTxtBlue, { color: theme.blue }]}>Founder &amp; Lead Architect{'\n'}( IoT &amp; AI LLM)</Text>
            </View>
            <Text style={[s.teamLocation, { color: theme.textSecondary }]}>Bhadrak Auto.clg, BCA</Text>
          </View>

          {/* Co-Founder */}
          <View style={[s.teamCard, { backgroundColor: theme.surface, borderColor: theme.sep2 }]}>
            <View style={[s.teamAvatarRing, { borderColor: theme.primaryLight }]}>
              <Image
                source={require('../../assets/images/co-founder.png')}
                style={s.teamAvatarImg}
                resizeMode="cover"
              />
            </View>
            <Text style={[s.teamName, { color: theme.textPrimary }]}>Sanatan Sethi</Text>
            <View style={[s.teamRolePillGreen, { backgroundColor: theme.fillGreen }]}>
              <Text style={[s.teamRoleTxtGreen, { color: theme.primary }]}>Co-Founder &amp; Mobile App{'\n'}Developer</Text>
            </View>
            <Text style={[s.teamLocation, { color: theme.textSecondary }]}>Bhadrak Auto.clg, BCA</Text>
          </View>
        </View>

        {/* ── 6. What Farmers Say ────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionHeading, { color: theme.textPrimary }]}>What Farmers Say</Text>

          {TESTIMONIALS.map((t, i) => (
            <View key={i} style={[s.testimonialCard, { backgroundColor: theme.surface, borderColor: theme.sep2 }]}>
              {/* Avatar circle */}
              <View style={s.testimonialHeader}>
                <View style={[s.testimonialAvatar, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                  <Ionicons name="person-outline" size={24} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.testimonialName, { color: theme.textPrimary }]}>{t.name}</Text>
                  <Text style={[s.testimonialLabel, { color: theme.textMuted }]}>{t.label}</Text>
                </View>
              </View>
              <Text style={[s.testimonialText, { color: theme.textSecondary }]}>{t.text}</Text>
              <Stars count={t.stars} theme={theme} />
            </View>
          ))}
        </View>

        {/* ── 7. Get In Touch ────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionHeading, { color: theme.textPrimary }]}>Get In Touch</Text>

          <Text style={[s.contactGroupLabel, { color: theme.textPrimary }]}>Contact Information</Text>

          {/* Location */}
          <View style={s.contactInfoRow}>
            <View style={[s.contactInfoIcon, { backgroundColor: theme.fillBlue }]}>
              <Ionicons name="location-outline" size={18} color={theme.blue} />
            </View>
            <Text style={[s.contactInfoText, { color: theme.textSecondary }]}>FMU-TBI | Balasore, Odisha, India</Text>
          </View>

          {/* Phone */}
          <TouchableOpacity
            style={s.contactInfoRow}
            onPress={() => Linking.openURL('tel:+917205095602')}
          >
            <View style={[s.contactInfoIcon, { backgroundColor: theme.fillGreen }]}>
              <Ionicons name="call-outline" size={18} color={theme.primary} />
            </View>
            <Text style={[s.contactInfoText, { color: theme.textSecondary }]}>+91 7205095602</Text>
          </TouchableOpacity>

          {/* Email */}
          <TouchableOpacity
            style={s.contactInfoRow}
            onPress={() => Linking.openURL('mailto:saathi.ai.innovation@gmail.com')}
          >
            <View style={[s.contactInfoIcon, { backgroundColor: theme.fillAmber }]}>
              <Ionicons name="mail-outline" size={18} color={theme.amber} />
            </View>
            <Text style={[s.contactInfoText, { color: theme.textSecondary }]}>saathi.ai.innovation@gmail.com</Text>
          </TouchableOpacity>

          {/* ── Contact form ──────────────────────────────────────────── */}
          <View style={{ marginTop: 20 }}>
            <Text style={[s.inputLabel, { color: theme.textPrimary }]}>Full Name</Text>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface, borderColor: theme.sep2, color: theme.textPrimary }]}
              placeholder="Enter your name"
              placeholderTextColor={theme.textMuted}
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={[s.inputLabel, { color: theme.textPrimary }]}>Email Address</Text>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface, borderColor: theme.sep2, color: theme.textPrimary }]}
              placeholder="Enter your email"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={[s.inputLabel, { color: theme.textPrimary }]}>Message</Text>
            <TextInput
              style={[s.textarea, { backgroundColor: theme.surface, borderColor: theme.sep2, color: theme.textPrimary }]}
              placeholder="Tell us about your farming needs"
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
            />

            <TouchableOpacity style={[s.sendBtn, { backgroundColor: theme.primary }]} onPress={handleSend} activeOpacity={0.85}>
              <Text style={s.sendBtnTxt}>Send Message</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  root: {
    flex: 1,
  },

  // ── Navbar ────────────────────────────────────────────────────────────────
  navbar: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical:   10,
    borderBottomWidth: 1,
  },
  navBack: {
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
  },
  navBrand: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  navTitle: {
    fontSize:   18,
    fontWeight: '700',
    fontFamily: 'Sora_700Bold',
  },


  // ── Hero card ─────────────────────────────────────────────────────────────
  heroCard: {
    marginHorizontal: 16,
    marginTop:        16,
    borderRadius:     16,
    padding:          22,
    alignItems:       'flex-start',
  },
  heroTitle: {
    fontSize:   22,
    fontWeight: '800',
    fontFamily: 'Sora_800ExtraBold',
    marginBottom: 10,
  },
  heroDesc: {
    fontSize:   14,
    lineHeight: 22,
    fontFamily: 'Sora_400Regular',
    textAlign:  'center',
    width:      '100%',
  },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 16,
    paddingTop:        24,
    paddingBottom:     8,
  },
  sectionHeading: {
    fontSize:     20,
    fontWeight:   '700',
    fontFamily:   'Sora_700Bold',
    marginBottom: 12,
  },
  bodyText: {
    fontSize:   14,
    lineHeight: 22,
    fontFamily: 'Sora_400Regular',
  },

  // ── 3D Tech block (stats + banner combined) ───────────────────────────────
  techBlock: {
    marginTop:     22,
    paddingTop:    28,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems:    'center',
    overflow:      'hidden',
    // 3-D depth via shadows
    shadowColor:   '#0D5C2E',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius:  16,
    elevation:     12,
  },
  techRing1: {
    position:     'absolute',
    width:        260,
    height:       260,
    borderRadius: 130,
    borderWidth:  1,
    borderColor:  'rgba(255,255,255,0.08)',
    top:          -80,
    right:        -80,
  },
  techRing2: {
    position:     'absolute',
    width:        160,
    height:       160,
    borderRadius: 80,
    borderWidth:  1,
    borderColor:  'rgba(255,255,255,0.06)',
    bottom:       -50,
    left:         -50,
  },
  statsRow3D: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            0,
    marginBottom:   0,
    width:          '100%',
  },
  statCard3D: {
    flex:             1,
    alignItems:       'center',
    backgroundColor:  'rgba(255,255,255,0.12)',
    borderRadius:     16,
    paddingVertical:  18,
    paddingHorizontal: 10,
    marginHorizontal:  6,
    // pressed-up 3-D effect
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 4 },
    shadowOpacity:    0.25,
    shadowRadius:     8,
    elevation:        6,
    borderWidth:      1,
    borderColor:      'rgba(255,255,255,0.18)',
  },
  statDivider: {
    width:           1,
    height:          50,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statVal3D: {
    fontSize:   34,
    fontWeight: '800',
    color:      '#FFFFFF',
    fontFamily: 'Sora_800ExtraBold',
    letterSpacing: -0.5,
  },
  statLabel3D: {
    fontSize:   12,
    color:      'rgba(255,255,255,0.75)',
    fontFamily: 'Sora_400Regular',
    textAlign:  'center',
    lineHeight: 17,
    marginTop:  4,
  },
  techSep: {
    width:           '85%',
    height:          1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginVertical:  22,
  },
  techBannerInner: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            10,
    marginBottom:   8,
  },
  techIconCircle: {
    width:           38,
    height:          38,
    borderRadius:    19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.3)',
  },
  techBannerTitle: {
    fontSize:   19,
    fontWeight: '700',
    color:      '#FFFFFF',
    fontFamily: 'Sora_700Bold',
    textAlign:  'center',
  },
  techBannerSub: {
    fontSize:   12,
    color:      'rgba(255,255,255,0.65)',
    fontFamily: 'Sora_400Regular',
    textAlign:  'center',
    letterSpacing: 0.5,
  },

  // ── Tech list ─────────────────────────────────────────────────────────────
  techList: {
    paddingHorizontal: 20,
    paddingTop:        18,
    paddingBottom:     22,
    gap:               18,
  },
  techRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           14,
  },
  techIconBox: {
    width:        44,
    height:       44,
    borderRadius: 22,
    alignItems:   'center',
    justifyContent: 'center',
    flexShrink:   0,
  },
  techTitle: {
    fontSize:   14,
    fontWeight: '700',
    fontFamily: 'Sora_700Bold',
    marginBottom: 3,
  },
  techDesc: {
    fontSize:   13,
    lineHeight: 19,
    fontFamily: 'Sora_400Regular',
  },

  // ── Team section ──────────────────────────────────────────────────────────
  teamSection: {
    paddingHorizontal: 16,
    paddingTop:        28,
    alignItems:        'center',
  },
  teamHeading: {
    fontSize:     22,
    fontWeight:   '700',
    fontFamily:   'Sora_700Bold',
    marginBottom: 20,
    textAlign:    'center',
  },
  teamCard: {
    borderRadius:    16,
    padding:         24,
    alignItems:      'center',
    width:           '100%',
    marginBottom:    14,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    6,
    elevation:       2,
    borderWidth:     1,
  },
  teamAvatarRing: {
    width:        88,
    height:       88,
    borderRadius: 44,
    borderWidth:  2,
    alignItems:   'center',
    justifyContent: 'center',
    marginBottom:   14,
    padding:        2,
  },
  teamAvatarImg: {
    width:        80,
    height:       80,
    borderRadius: 40,
  },
  teamName: {
    fontSize:     18,
    fontWeight:   '700',
    fontFamily:   'Sora_700Bold',
    marginBottom: 10,
    textAlign:    'center',
  },
  teamRolePillBlue: {
    borderRadius:    20,
    paddingHorizontal: 16,
    paddingVertical:    7,
    marginBottom:      12,
  },
  teamRoleTxtBlue: {
    fontSize:   13,
    fontWeight: '600',
    fontFamily: 'Sora_600SemiBold',
    textAlign:  'center',
    lineHeight: 19,
  },
  teamRolePillGreen: {
    borderRadius:    20,
    paddingHorizontal: 16,
    paddingVertical:    7,
    marginBottom:      12,
  },
  teamRoleTxtGreen: {
    fontSize:   13,
    fontWeight: '600',
    fontFamily: 'Sora_600SemiBold',
    textAlign:  'center',
    lineHeight: 19,
  },
  teamLocation: {
    fontSize:   13,
    fontFamily: 'Sora_400Regular',
  },

  // ── Testimonials ──────────────────────────────────────────────────────────
  testimonialCard: {
    borderRadius:    12,
    padding:         16,
    marginBottom:    14,
    borderWidth:     1,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.05,
    shadowRadius:    4,
    elevation:       1,
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
    marginBottom:  10,
  },
  testimonialAvatar: {
    width:        44,
    height:       44,
    borderRadius: 22,
    alignItems:   'center',
    justifyContent: 'center',
    borderWidth:  1,
  },
  testimonialName: {
    fontSize:   15,
    fontWeight: '700',
    fontFamily: 'Sora_700Bold',
  },
  testimonialLabel: {
    fontSize:   12,
    fontFamily: 'Sora_400Regular',
    marginTop:  2,
  },
  testimonialText: {
    fontSize:   14,
    lineHeight: 21,
    fontFamily: 'Sora_400Regular',
    marginBottom: 10,
    fontStyle:  'italic',
  },

  // ── Contact info ──────────────────────────────────────────────────────────
  contactGroupLabel: {
    fontSize:     15,
    fontWeight:   '700',
    fontFamily:   'Sora_700Bold',
    marginBottom: 12,
  },
  contactInfoRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
    marginBottom:  12,
  },
  contactInfoIcon: {
    width:        36,
    height:       36,
    borderRadius: 18,
    alignItems:   'center',
    justifyContent: 'center',
  },
  contactInfoText: {
    fontSize:   14,
    fontFamily: 'Sora_400Regular',
    flex:       1,
  },

  // ── Contact form ──────────────────────────────────────────────────────────
  inputLabel: {
    fontSize:     13,
    fontWeight:   '600',
    fontFamily:   'Sora_600SemiBold',
    marginBottom: 6,
    marginTop:    14,
  },
  input: {
    borderWidth:   1,
    borderRadius:  10,
    paddingHorizontal: 14,
    paddingVertical:   12,
    fontSize:       14,
    fontFamily:     'Sora_400Regular',
  },
  textarea: {
    borderWidth:   1,
    borderRadius:  10,
    paddingHorizontal: 14,
    paddingVertical:   12,
    fontSize:       14,
    fontFamily:     'Sora_400Regular',
    minHeight:      110,
  },
  sendBtn: {
    borderRadius:    10,
    paddingVertical: 15,
    alignItems:      'center',
    marginTop:       20,
    marginBottom:    8,
  },
  sendBtnTxt: {
    fontSize:   16,
    fontWeight: '700',
    color:      '#FFFFFF',
    fontFamily: 'Sora_700Bold',
  },
});
