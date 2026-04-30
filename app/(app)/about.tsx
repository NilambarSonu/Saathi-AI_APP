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

// ─── Exact color palette from screenshots ─────────────────────────────────────
const C = {
  // Greens
  darkGreen:   '#1B5E20',
  midGreen:    '#2E7D32',
  baseGreen:   '#388E3C',
  tealGreen:   '#00897B',
  accentGreen: '#4CAF50',
  lightGreen:  '#81C784',
  paleGreen:   '#E8F5E9',
  mintBg:      '#F0FAF4',   // hero card background (very light mint)

  // Blues (for icons/pills)
  blue:        '#1565C0',
  lightBlue:   '#E3F2FD',

  // Neutrals
  white:       '#FFFFFF',
  bgPage:      '#F8F9FA',
  cardBg:      '#FFFFFF',
  border:      '#E0E0E0',
  borderLight: '#EEEEEE',

  // Text
  txt1:        '#212121',   // primary - near black
  txt2:        '#424242',   // secondary
  txt3:        '#757575',   // tertiary / muted
  txt4:        '#9E9E9E',   // placeholder

  // Stars
  star:        '#FFC107',

  // Contact icon backgrounds
  locBg:       '#E3F2FD',
  phoneBg:     '#E8F5E9',
  emailBg:     '#FFF3E0',
};

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

const TECH_FEATURES = [
  {
    icon:  'analytics-outline' as const,
    color: '#00897B',
    bg:    '#E0F2F1',
    title: 'Advanced Sensors',
    desc:  'Multi-parameter soil analysis with laboratory-grade accuracy',
  },
  {
    icon:  'hardware-chip-outline' as const,
    color: '#1565C0',
    bg:    '#E3F2FD',
    title: 'AI Processing',
    desc:  'Machine learning algorithms trained on local soil data',
  },
  {
    icon:  'chatbubble-ellipses-outline' as const,
    color: '#F57C00',
    bg:    '#FFF3E0',
    title: 'Local Language Support',
    desc:  'Recommendations in Odia, Hindi, and English with audio support',
  },
];

const STATS = [
  { val: '5+',  label: 'Years of Research' },
  { val: '50+', label: 'Farming Partners' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Stars({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons key={i} name="star" size={16} color={i <= count ? C.star : '#E0E0E0'} />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [email,    setEmail]    = useState('');
  const [message,  setMessage]  = useState('');

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
    <View style={[s.root, { paddingTop: topPad }]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* ── Nav bar (matches app header) ──────────────────────────────────── */}
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={s.navBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={C.midGreen} />
        </TouchableOpacity>
        <View style={s.navBrand}>
          <Ionicons name="leaf" size={18} color={C.accentGreen} />
          <Text style={s.navTitle}>Saathi AI</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >

        {/* ── 1. Hero card — light mint background ───────────────────────── */}
        <View style={s.heroCard}>
          <Text style={s.heroTitle}>About Saathi AI</Text>
          <Text style={s.heroDesc}>
            Revolutionizing agriculture through organic intelligence, empowering
            farmers with AI-driven insights for sustainable farming practices.
          </Text>
        </View>

        {/* ── 2. Our Mission ─────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionHeading}>Our Mission</Text>
          <Text style={s.bodyText}>
            At Agni Innovations, we believe that technology should serve those
            who feed the world. Our mission is to bridge the gap between advanced
            agricultural science and traditional farming wisdom, making precision
            agriculture accessible to every farmer.
          </Text>
          <Text style={[s.bodyText, { marginTop: 14 }]}>
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
        <View style={s.techList}>
          {TECH_FEATURES.map((feat, i) => (
            <View key={i} style={s.techRow}>
              <View style={[s.techIconBox, { backgroundColor: feat.bg }]}>
                <Ionicons name={feat.icon} size={24} color={feat.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.techTitle}>{feat.title}</Text>
                <Text style={s.techDesc}>{feat.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── 5. Meet Our Team ───────────────────────────────────────────── */}
        <View style={s.teamSection}>
          <Text style={s.teamHeading}>Meet Our Team</Text>

          {/* Founder */}
          <View style={s.teamCard}>
            <View style={s.teamAvatarRing}>
              <Image
                source={require('../../assets/images/founder.png')}
                style={s.teamAvatarImg}
                resizeMode="cover"
              />
            </View>
            <Text style={s.teamName}>Nilambar Behera</Text>
            <View style={s.teamRolePillBlue}>
              <Text style={s.teamRoleTxtBlue}>Founder &amp; Lead Architect{'\n'}( IoT &amp; AI LLM)</Text>
            </View>
            <Text style={s.teamLocation}>Bhadrak Auto.clg, BCA</Text>
          </View>

          {/* Co-Founder */}
          <View style={s.teamCard}>
            <View style={s.teamAvatarRing}>
              <Image
                source={require('../../assets/images/co-founder.png')}
                style={s.teamAvatarImg}
                resizeMode="cover"
              />
            </View>
            <Text style={s.teamName}>Sanatan Sethi</Text>
            <View style={s.teamRolePillGreen}>
              <Text style={s.teamRoleTxtGreen}>Co-Founder &amp; Mobile App{'\n'}Developer</Text>
            </View>
            <Text style={s.teamLocation}>Bhadrak Auto.clg, BCA</Text>
          </View>
        </View>

        {/* ── 6. What Farmers Say ────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionHeading}>What Farmers Say</Text>

          {TESTIMONIALS.map((t, i) => (
            <View key={i} style={s.testimonialCard}>
              {/* Avatar circle */}
              <View style={s.testimonialHeader}>
                <View style={s.testimonialAvatar}>
                  <Ionicons name="person-outline" size={24} color={C.tealGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.testimonialName}>{t.name}</Text>
                  <Text style={s.testimonialLabel}>{t.label}</Text>
                </View>
              </View>
              <Text style={s.testimonialText}>{t.text}</Text>
              <Stars count={t.stars} />
            </View>
          ))}
        </View>

        {/* ── 7. Get In Touch ────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionHeading}>Get In Touch</Text>

          <Text style={s.contactGroupLabel}>Contact Information</Text>

          {/* Location */}
          <View style={s.contactInfoRow}>
            <View style={[s.contactInfoIcon, { backgroundColor: C.locBg }]}>
              <Ionicons name="location-outline" size={18} color={C.blue} />
            </View>
            <Text style={s.contactInfoText}>FMU-TBI | Balasore, Odisha, India</Text>
          </View>

          {/* Phone */}
          <TouchableOpacity
            style={s.contactInfoRow}
            onPress={() => Linking.openURL('tel:+917205095602')}
          >
            <View style={[s.contactInfoIcon, { backgroundColor: C.phoneBg }]}>
              <Ionicons name="call-outline" size={18} color={C.accentGreen} />
            </View>
            <Text style={s.contactInfoText}>+91 7205095602</Text>
          </TouchableOpacity>

          {/* Email */}
          <TouchableOpacity
            style={s.contactInfoRow}
            onPress={() => Linking.openURL('mailto:saathi.ai.innovation@gmail.com')}
          >
            <View style={[s.contactInfoIcon, { backgroundColor: C.emailBg }]}>
              <Ionicons name="mail-outline" size={18} color="#F57C00" />
            </View>
            <Text style={s.contactInfoText}>saathi.ai.innovation@gmail.com</Text>
          </TouchableOpacity>

          {/* ── Contact form ──────────────────────────────────────────── */}
          <View style={{ marginTop: 20 }}>
            <Text style={s.inputLabel}>Full Name</Text>
            <TextInput
              style={s.input}
              placeholder="Enter your name"
              placeholderTextColor={C.txt4}
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={s.inputLabel}>Email Address</Text>
            <TextInput
              style={s.input}
              placeholder="Enter your email"
              placeholderTextColor={C.txt4}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={s.inputLabel}>Message</Text>
            <TextInput
              style={s.textarea}
              placeholder="Tell us about your farming needs"
              placeholderTextColor={C.txt4}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
            />

            <TouchableOpacity style={s.sendBtn} onPress={handleSend} activeOpacity={0.85}>
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
    backgroundColor: C.white,
  },

  // ── Navbar ────────────────────────────────────────────────────────────────
  navbar: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical:   10,
    backgroundColor:   C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  navBack: {
    width:          36,
    height:         36,
    borderRadius:   18,
    backgroundColor: '#F0FAF4',
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
    color:      C.txt1,
    fontFamily: 'Sora_700Bold',
  },


  // ── Hero card ─────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: C.mintBg,
    marginHorizontal: 16,
    marginTop:        16,
    borderRadius:     16,
    padding:          22,
    alignItems:       'flex-start',
  },
  heroTitle: {
    fontSize:   22,
    fontWeight: '800',
    color:      C.tealGreen,
    fontFamily: 'Sora_800ExtraBold',
    marginBottom: 10,
  },
  heroDesc: {
    fontSize:   14,
    color:      C.txt2,
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
    color:        C.txt1,
    fontFamily:   'Sora_700Bold',
    marginBottom: 12,
  },
  bodyText: {
    fontSize:   14,
    color:      C.txt2,
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
    color:      C.white,
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
    backgroundColor: '#F0FAF4',
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
    color:      C.txt1,
    fontFamily: 'Sora_700Bold',
    marginBottom: 3,
  },
  techDesc: {
    fontSize:   13,
    color:      C.txt3,
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
    color:        C.tealGreen,
    fontFamily:   'Sora_700Bold',
    marginBottom: 20,
    textAlign:    'center',
  },
  teamCard: {
    backgroundColor: C.white,
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
    borderColor:     C.borderLight,
  },
  teamAvatarRing: {
    width:        88,
    height:       88,
    borderRadius: 44,
    borderWidth:  2,
    borderColor:  C.lightGreen,
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
    color:        C.txt1,
    fontFamily:   'Sora_700Bold',
    marginBottom: 10,
    textAlign:    'center',
  },
  teamRolePillBlue: {
    backgroundColor: C.lightBlue,
    borderRadius:    20,
    paddingHorizontal: 16,
    paddingVertical:    7,
    marginBottom:      12,
  },
  teamRoleTxtBlue: {
    fontSize:   13,
    fontWeight: '600',
    color:      C.blue,
    fontFamily: 'Sora_600SemiBold',
    textAlign:  'center',
    lineHeight: 19,
  },
  teamRolePillGreen: {
    backgroundColor: C.paleGreen,
    borderRadius:    20,
    paddingHorizontal: 16,
    paddingVertical:    7,
    marginBottom:      12,
  },
  teamRoleTxtGreen: {
    fontSize:   13,
    fontWeight: '600',
    color:      C.midGreen,
    fontFamily: 'Sora_600SemiBold',
    textAlign:  'center',
    lineHeight: 19,
  },
  teamLocation: {
    fontSize:   13,
    color:      C.txt3,
    fontFamily: 'Sora_400Regular',
  },

  // ── Testimonials ──────────────────────────────────────────────────────────
  testimonialCard: {
    backgroundColor: C.white,
    borderRadius:    12,
    padding:         16,
    marginBottom:    14,
    borderWidth:     1,
    borderColor:     C.borderLight,
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
    backgroundColor: C.mintBg,
    alignItems:   'center',
    justifyContent: 'center',
    borderWidth:  1,
    borderColor:  C.lightGreen,
  },
  testimonialName: {
    fontSize:   15,
    fontWeight: '700',
    color:      C.txt1,
    fontFamily: 'Sora_700Bold',
  },
  testimonialLabel: {
    fontSize:   12,
    color:      C.txt3,
    fontFamily: 'Sora_400Regular',
    marginTop:  2,
  },
  testimonialText: {
    fontSize:   14,
    color:      C.txt2,
    lineHeight: 21,
    fontFamily: 'Sora_400Regular',
    marginBottom: 10,
    fontStyle:  'italic',
  },

  // ── Contact info ──────────────────────────────────────────────────────────
  contactGroupLabel: {
    fontSize:     15,
    fontWeight:   '700',
    color:        C.txt1,
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
    color:      C.txt2,
    fontFamily: 'Sora_400Regular',
    flex:       1,
  },

  // ── Contact form ──────────────────────────────────────────────────────────
  inputLabel: {
    fontSize:     13,
    fontWeight:   '600',
    color:        C.txt1,
    fontFamily:   'Sora_600SemiBold',
    marginBottom: 6,
    marginTop:    14,
  },
  input: {
    borderWidth:   1,
    borderColor:   C.border,
    borderRadius:  10,
    paddingHorizontal: 14,
    paddingVertical:   12,
    fontSize:       14,
    color:          C.txt1,
    fontFamily:     'Sora_400Regular',
    backgroundColor: C.white,
  },
  textarea: {
    borderWidth:   1,
    borderColor:   C.border,
    borderRadius:  10,
    paddingHorizontal: 14,
    paddingVertical:   12,
    fontSize:       14,
    color:          C.txt1,
    fontFamily:     'Sora_400Regular',
    backgroundColor: C.white,
    minHeight:      110,
  },
  sendBtn: {
    backgroundColor: C.accentGreen,
    borderRadius:    10,
    paddingVertical: 15,
    alignItems:      'center',
    marginTop:       20,
    marginBottom:    8,
  },
  sendBtnTxt: {
    fontSize:   16,
    fontWeight: '700',
    color:      C.white,
    fontFamily: 'Sora_700Bold',
  },
});
