import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDarkModeTheme } from '@/context/ThemeContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type FeatureItem = {
  icon: IconName;
  title: string;
  body: string;
  color: string;
  tint: string;
};

const FEATURE_ITEMS: Omit<FeatureItem, 'tint'>[] = [
  {
    icon: 'leaf-outline',
    title: 'Instant Soil Analysis',
    body: 'Understand pH, NPK, moisture, EC and temperature without waiting for lab reports.',
    color: '#10B981',
  },
  {
    icon: 'sparkles-outline',
    title: 'AI Farming Guidance',
    body: 'Get crop, fertilizer and care recommendations tailored to your field conditions.',
    color: '#8B5CF6',
  },
  {
    icon: 'map-outline',
    title: 'Smart Field Mapping',
    body: 'Track soil health across farms with location-aware history and field insights.',
    color: '#3B82F6',
  },
  {
    icon: 'chatbubble-ellipses-outline',
    title: 'Local Language Support',
    body: 'Designed for farmers who prefer simple guidance in familiar languages.',
    color: '#F59E0B',
  },
  {
    icon: 'hardware-chip-outline',
    title: 'Agni Device Integration',
    body: 'Connect the soil scanner and turn sensor readings into clear next steps.',
    color: '#EF4444',
  },
  {
    icon: 'bar-chart-outline',
    title: 'Smart Recommendations',
    body: 'Convert raw soil data into practical plans for better yield and lower waste.',
    color: '#0EA5E9',
  },
];

const IMPACT_ITEMS = [
  { value: '< 60s', label: 'soil scan insight', icon: 'timer-outline' as IconName, color: '#10B981' },
  { value: '10+', label: 'local language ready', icon: 'language-outline' as IconName, color: '#3B82F6' },
  { value: '336x', label: 'faster than lab wait', icon: 'flash-outline' as IconName, color: '#F59E0B' },
  { value: 'AI', label: 'recommendation engine', icon: 'sparkles-outline' as IconName, color: '#8B5CF6' },
];

const TECH_ITEMS = [
  { title: 'AI Powered', body: 'Soil-aware intelligence for personalized farm decisions.', icon: 'hardware-chip-outline' as IconName, color: '#8B5CF6' },
  { title: 'Smart Sensors', body: 'Agni scanner reads core soil signals in the field.', icon: 'radio-outline' as IconName, color: '#10B981' },
  { title: 'Cloud Analytics', body: 'History, insights and recommendations stay connected.', icon: 'cloud-outline' as IconName, color: '#3B82F6' },
  { title: 'Real-time Processing', body: 'Guidance is generated when the farmer needs it.', icon: 'pulse-outline' as IconName, color: '#F97316' },
];

const DEVICE_POINTS = [
  'NPK, pH, EC, moisture and temperature readings',
  'Bluetooth workflow for rural field usage',
  'AI converts readings into farmer-friendly advice',
];

const TEAM_ITEMS = [
  {
    name: 'Nilambar Behera',
    role: 'Founder & Lead Architect (IoT & AI LLM)',
    college: 'Bhadrak Autonomous College, BCA',
    image: require('../../assets/images/founder.png'),
    accent: '#38BDF8',
    roleBg: 'rgba(56, 189, 248, 0.14)',
    gradient: ['rgba(56, 189, 248, 0.16)', 'rgba(59, 130, 246, 0.05)'] as [string, string],
  },
  {
    name: 'Sanatan Sethi',
    role: 'Co-Founder & Mobile App Developer',
    college: 'Bhadrak Autonomous College, BCA',
    image: require('../../assets/images/co-founder.png'),
    accent: '#22C55E',
    roleBg: 'rgba(34, 197, 94, 0.14)',
    gradient: ['rgba(34, 197, 94, 0.16)', 'rgba(16, 185, 129, 0.05)'] as [string, string],
  },
];

const TESTIMONIALS = [
  {
    name: 'Mahendra Behera',
    subtitle: 'Farmer from Balasore',
    review: 'Saathi AI helped me understand my soil better. The Odia recommendations made it so easy to follow, and my crop yield improved significantly this season.',
    icon: 'person-add-outline' as IconName,
    color: '#22C55E',
  },
  {
    name: 'Ramamani Behera',
    subtitle: 'Progressive Farmer, Cuttack',
    review: 'The AI chat feature is amazing! I can ask questions anytime and get instant answers in my language. It feels like having an agricultural expert in my pocket.',
    icon: 'people-outline' as IconName,
    color: '#3B82F6',
  },
];

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useDarkModeTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const featureItems = useMemo(
    () => FEATURE_ITEMS.map(item => ({ ...item, tint: isDark ? `${item.color}24` : `${item.color}14` })),
    [isDark]
  );

  const topPad = insets.top || (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0);

  const handleSend = async () => {
    if (!fullName.trim() || !email.trim() || !message.trim()) {
      Alert.alert('Missing Fields', 'Please fill all fields before sending.');
      return;
    }

    setSending(true);
    try {
      const subject = encodeURIComponent(`Message from ${fullName.trim()}`);
      const body = encodeURIComponent(`${message.trim()}\n\nFrom: ${fullName.trim()}\nEmail: ${email.trim()}`);
      await Linking.openURL(`mailto:saathi.ai.innovation@gmail.com?subject=${subject}&body=${body}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: topPad }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.navbar, { backgroundColor: isDark ? 'rgba(24,33,27,0.92)' : theme.surface, borderBottomColor: theme.sep2 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.navButton, { backgroundColor: theme.primaryLight }]} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={theme.primary} />
        </TouchableOpacity>
        <View style={styles.navBrand}>
          <Image source={require('../../assets/images/favicon.png')} style={styles.navLogo} />
          <Text style={[styles.navTitle, { color: theme.textPrimary }]}>Saathi AI</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={isDark ? ['#193120', '#101611'] : ['#ECFDF5', '#FFF7ED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { borderColor: isDark ? 'rgba(110,231,183,0.18)' : 'rgba(26,123,60,0.12)' }]}
        >
          <View style={[styles.heroOrb, styles.heroOrbOne, { backgroundColor: isDark ? 'rgba(110,231,183,0.16)' : 'rgba(16,185,129,0.18)' }]} />
          <View style={[styles.heroOrb, styles.heroOrbTwo, { backgroundColor: isDark ? 'rgba(251,191,36,0.14)' : 'rgba(245,158,11,0.18)' }]} />
          <View style={styles.heroTop}>
            <View style={[styles.heroLogoShell, { backgroundColor: isDark ? 'rgba(110,231,183,0.14)' : '#FFFFFF' }]}>
              <Image source={require('../../assets/images/favicon.png')} style={styles.heroLogo} />
            </View>
            <View style={[styles.heroChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)', borderColor: isDark ? theme.sep2 : 'rgba(255,255,255,0.9)' }]}>
              <Ionicons name="shield-checkmark-outline" size={14} color={theme.primary} />
              <Text style={[styles.heroChipText, { color: theme.textPrimary }]}>Farmer-first agri intelligence</Text>
            </View>
          </View>
          <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>Empowering Farmers with Organic Intelligence</Text>
          <Text style={[styles.heroBody, { color: theme.textSecondary }]}>
            Saathi AI brings soil testing, AI guidance and Agni device insights together so every farmer can make faster, confident decisions.
          </Text>
          <View style={styles.heroMiniRow}>
            {[
              ['leaf-outline', 'Growth'],
              ['sparkles-outline', 'AI'],
              ['earth-outline', 'Rural Ready'],
            ].map(([icon, label]) => (
              <View key={label} style={[styles.heroMini, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.74)' }]}>
                <Ionicons name={icon as IconName} size={15} color={theme.primary} />
                <Text style={[styles.heroMiniText, { color: theme.textPrimary }]}>{label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <SectionHeader eyebrow="OUR WHY" title="Built to remove farming guesswork" theme={theme} />
        <View style={[styles.missionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <View style={[styles.missionIcon, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="heart-outline" size={24} color={theme.primary} />
          </View>
          <Text style={[styles.missionTitle, { color: theme.textPrimary }]}>AI that respects soil, time and farmers.</Text>
          <Text style={[styles.missionBody, { color: theme.textSecondary }]}>
            Saathi AI exists to reduce long lab delays, make soil intelligence understandable, and help farmers improve productivity with practical recommendations that feel simple, local and trustworthy.
          </Text>
          <View style={styles.keywordRow}>
            {['Soil-first', 'Local', 'Fast', 'Human'].map(word => (
              <View key={word} style={[styles.keywordPill, { backgroundColor: isDark ? theme.bg1 : theme.primaryLight }]}>
                <Text style={[styles.keywordText, { color: theme.primary }]}>{word}</Text>
              </View>
            ))}
          </View>
        </View>

        <SectionHeader eyebrow="WHAT IT DOES" title="A complete farm intelligence companion" theme={theme} />
        <View style={styles.featureGrid}>
          {featureItems.map(item => (
            <View key={item.title} style={[styles.featureCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <View style={[styles.featureIcon, { backgroundColor: item.tint }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={[styles.featureTitle, { color: theme.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.featureBody, { color: theme.textSecondary }]}>{item.body}</Text>
            </View>
          ))}
        </View>

        <SectionHeader eyebrow="AGNI DEVICE" title="The soil scanner behind the intelligence" theme={theme} />
        <LinearGradient
          colors={isDark ? ['#202B24', '#121A14'] : ['#FFF7ED', '#ECFDF5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.deviceCard, { borderColor: isDark ? 'rgba(251,191,36,0.18)' : 'rgba(245,158,11,0.20)' }]}
        >
          <View style={styles.deviceCopy}>
            <View style={[styles.deviceTag, { backgroundColor: isDark ? 'rgba(251,191,36,0.14)' : '#FEF3C7' }]}>
              <Ionicons name="flash-outline" size={14} color={theme.amber} />
              <Text style={[styles.deviceTagText, { color: isDark ? '#FCD34D' : '#B45309' }]}>Real-time soil intelligence</Text>
            </View>
            <Text style={[styles.deviceTitle, { color: theme.textPrimary }]}>Agni Soil Scanner</Text>
            <Text style={[styles.deviceBody, { color: theme.textSecondary }]}>
              A portable field device that captures key soil signals and sends them into Saathi AI for clear, actionable guidance.
            </Text>
          </View>
          <Image source={require('../../assets/images/Agni_Device.png')} style={styles.deviceImage} resizeMode="contain" />
          <View style={styles.devicePoints}>
            {DEVICE_POINTS.map(point => (
              <View key={point} style={styles.devicePoint}>
                <View style={[styles.devicePointIcon, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="checkmark" size={13} color={theme.primary} />
                </View>
                <Text style={[styles.devicePointText, { color: theme.textSecondary }]}>{point}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <SectionHeader eyebrow="IMPACT" title="Designed for speed, clarity and scale" theme={theme} />
        <View style={styles.impactGrid}>
          {IMPACT_ITEMS.map(item => (
            <View key={item.label} style={[styles.impactCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <View style={[styles.impactIcon, { backgroundColor: `${item.color}${isDark ? '22' : '14'}` }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={[styles.impactValue, { color: item.color }]}>{item.value}</Text>
              <Text style={[styles.impactLabel, { color: theme.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        <SectionHeader eyebrow="FARMER-FIRST" title="Technology that feels familiar" theme={theme} />
        <View style={[styles.farmerCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <LinearGradient
            colors={isDark ? ['rgba(16,185,129,0.16)', 'rgba(245,158,11,0.08)'] : ['#ECFDF5', '#FFFBEB']}
            style={styles.farmerIllustration}
          >
            <Ionicons name="people-outline" size={34} color={theme.primary} />
            <Ionicons name="chatbubbles-outline" size={30} color={theme.amber} />
            <Ionicons name="leaf-outline" size={34} color={theme.success} />
          </LinearGradient>
          <Text style={[styles.farmerTitle, { color: theme.textPrimary }]}>Simple enough for every farmer. Powerful enough for every field.</Text>
          <Text style={[styles.farmerBody, { color: theme.textSecondary }]}>
            The experience is built for rural accessibility: simple words, clear next steps, local language support, offline-friendly device flows, and guidance that does not require technical knowledge.
          </Text>
        </View>

        <SectionHeader eyebrow="BUILDERS" title="Meet Our Team" theme={theme} />
        <View style={styles.teamWrap}>
          {TEAM_ITEMS.map(member => (
            <TouchableOpacity key={member.name} activeOpacity={0.86} style={[styles.teamCardShadow, { shadowColor: member.accent }]}>
              <LinearGradient
                colors={isDark ? [member.gradient[0], 'rgba(24,33,27,0.92)', 'rgba(16,22,17,0.98)'] : [member.gradient[0], 'rgba(248,250,252,0.86)', 'rgba(236,253,245,0.72)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.teamCard, { borderColor: isDark ? `${member.accent}30` : `${member.accent}22` }]}
              >
                <View style={[styles.teamLight, styles.teamLightTop, { backgroundColor: `${member.accent}${isDark ? '20' : '18'}` }]} />
                <View style={[styles.teamLight, styles.teamLightBottom, { backgroundColor: `${member.accent}${isDark ? '10' : '12'}` }]} />
                <View style={[styles.avatarGlow, { borderColor: `${member.accent}66`, backgroundColor: `${member.accent}${isDark ? '12' : '0E'}` }]}>
                  <Image source={member.image} style={styles.teamAvatar} resizeMode="cover" />
                </View>
                <Text style={[styles.teamName, { color: theme.textPrimary }]}>{member.name}</Text>
                <View style={[styles.roleBadge, { backgroundColor: isDark ? `${member.accent}20` : `${member.accent}14`, borderColor: `${member.accent}${isDark ? '35' : '26'}` }]}>
                  <Text style={[styles.roleText, { color: member.accent }]}>{member.role}</Text>
                </View>
                <View style={[styles.collegeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.32)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.42)' }]}>
                  <Ionicons name="school-outline" size={13} color={member.accent} />
                  <Text style={[styles.collegeText, { color: theme.textSecondary }]}>{member.college}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader eyebrow="TRUST" title="What Farmers Say" theme={theme} />
        <View style={styles.testimonialWrap}>
          {TESTIMONIALS.map(item => (
            <View key={item.name} style={[styles.testimonialCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <View style={styles.testimonialTop}>
                <View style={[styles.testimonialAvatar, { backgroundColor: `${item.color}${isDark ? '22' : '18'}` }]}>
                  <Ionicons name={item.icon} size={23} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.testimonialName, { color: theme.textPrimary }]}>{item.name}</Text>
                  <Text style={[styles.testimonialSubtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>
                </View>
              </View>
              <View style={[styles.quoteMark, { backgroundColor: `${item.color}${isDark ? '18' : '10'}` }]}>
                <Ionicons name="chatbox-ellipses-outline" size={16} color={item.color} />
              </View>
              <Text style={[styles.testimonialText, { color: theme.textSecondary }]}>{`"${item.review}"`}</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Ionicons key={star} name="star" size={16} color="#FBBF24" />
                ))}
              </View>
            </View>
          ))}
        </View>

        <SectionHeader eyebrow="TECHNOLOGY" title="Modern stack, grounded in agriculture" theme={theme} />
        <View style={styles.techGrid}>
          {TECH_ITEMS.map(item => (
            <View key={item.title} style={[styles.techCard, { backgroundColor: isDark ? theme.bg1 : theme.bg0, borderColor: theme.cardBorder }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
              <Text style={[styles.techTitle, { color: theme.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.techBody, { color: theme.textSecondary }]}>{item.body}</Text>
            </View>
          ))}
        </View>

        <SectionHeader eyebrow="CONNECT" title="Talk to the Saathi AI team" theme={theme} />
        <View style={[styles.contactCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <ContactRow icon="location-outline" color={theme.blue} text="FMU-TBI, Balasore, Odisha, India" theme={theme} />
          <TouchableOpacity onPress={() => Linking.openURL('tel:+917205095602')} activeOpacity={0.75}>
            <ContactRow icon="call-outline" color={theme.primary} text="+91 7205095602" theme={theme} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:saathi.ai.innovation@gmail.com')} activeOpacity={0.75}>
            <ContactRow icon="mail-outline" color={theme.amber} text="saathi.ai.innovation@gmail.com" theme={theme} />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { backgroundColor: isDark ? theme.bg1 : theme.bg0, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Your name"
            placeholderTextColor={theme.textMuted}
            value={fullName}
            onChangeText={setFullName}
          />
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? theme.bg1 : theme.bg0, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Email address"
            placeholderTextColor={theme.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={[styles.textarea, { backgroundColor: isDark ? theme.bg1 : theme.bg0, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Tell us about your farming needs"
            placeholderTextColor={theme.textMuted}
            multiline
            textAlignVertical="top"
            value={message}
            onChangeText={setMessage}
          />
          <TouchableOpacity style={[styles.sendButton, { backgroundColor: theme.primary }]} onPress={handleSend} disabled={sending} activeOpacity={0.85}>
            {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sendButtonText}>Send Message</Text>}
          </TouchableOpacity>
        </View>

        <View style={[styles.footer, { borderColor: theme.cardBorder }]}>
          <Image source={require('../../assets/images/favicon.png')} style={styles.footerLogo} />
          <Text style={[styles.footerTitle, { color: theme.textPrimary }]}>Saathi AI</Text>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>Version 1.0.0 - Built with care for Farmers</Text>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>Copyright 2026 Agni Innovations</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ eyebrow, title, theme }: { eyebrow: string; title: string; theme: any }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.eyebrow, { color: theme.primary }]}>{eyebrow}</Text>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>
    </View>
  );
}

function ContactRow({ icon, color, text, theme }: { icon: IconName; color: string; text: string; theme: any }) {
  return (
    <View style={styles.contactRow}>
      <View style={[styles.contactIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <Text style={[styles.contactText, { color: theme.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navLogo: { width: 22, height: 22 },
  navTitle: { fontFamily: 'Sora_700Bold', fontSize: 17 },
  scroll: { paddingBottom: 56 },

  hero: {
    margin: 16,
    padding: 22,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 292,
  },
  heroOrb: { position: 'absolute', borderRadius: 999 },
  heroOrbOne: { width: 150, height: 150, top: -52, right: -36 },
  heroOrbTwo: { width: 120, height: 120, bottom: -44, left: -38 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroLogoShell: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 5,
  },
  heroLogo: { width: 34, height: 34 },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexShrink: 1,
  },
  heroChipText: { fontFamily: 'Sora_600SemiBold', fontSize: 10 },
  heroTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 31, lineHeight: 39, marginTop: 28 },
  heroBody: { fontFamily: 'Sora_400Regular', fontSize: 14, lineHeight: 22, marginTop: 12 },
  heroMiniRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  heroMini: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  heroMiniText: { fontFamily: 'Sora_600SemiBold', fontSize: 11 },

  sectionHeader: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10 },
  eyebrow: { fontFamily: 'Sora_800ExtraBold', fontSize: 10, letterSpacing: 1.2 },
  sectionTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 22, lineHeight: 29, marginTop: 5 },

  missionCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  missionIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  missionTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 19, lineHeight: 26, marginTop: 14 },
  missionBody: { fontFamily: 'Sora_400Regular', fontSize: 14, lineHeight: 22, marginTop: 9 },
  keywordRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  keywordPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  keywordText: { fontFamily: 'Sora_700Bold', fontSize: 11 },

  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  featureCard: {
    width: '48.2%',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    minHeight: 184,
  },
  featureIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  featureTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 14, lineHeight: 19 },
  featureBody: { fontFamily: 'Sora_400Regular', fontSize: 12, lineHeight: 18, marginTop: 7 },

  deviceCard: {
    marginHorizontal: 16,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  deviceCopy: { width: '68%', zIndex: 2 },
  deviceTag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  deviceTagText: { fontFamily: 'Sora_700Bold', fontSize: 10 },
  deviceTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 24, marginTop: 14 },
  deviceBody: { fontFamily: 'Sora_400Regular', fontSize: 13, lineHeight: 20, marginTop: 8 },
  deviceImage: { position: 'absolute', right: -8, top: 28, width: 142, height: 190 },
  devicePoints: { marginTop: 28, gap: 10 },
  devicePoint: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  devicePointIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  devicePointText: { flex: 1, fontFamily: 'Sora_500Medium', fontSize: 12, lineHeight: 18 },

  impactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  impactCard: { width: '48.2%', borderWidth: 1, borderRadius: 22, padding: 15, minHeight: 132 },
  impactIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  impactValue: { fontFamily: 'Sora_800ExtraBold', fontSize: 25, marginTop: 12 },
  impactLabel: { fontFamily: 'Sora_500Medium', fontSize: 12, lineHeight: 18, marginTop: 2 },

  farmerCard: { marginHorizontal: 16, borderWidth: 1, borderRadius: 24, padding: 18 },
  farmerIllustration: {
    height: 94,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  farmerTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 18, lineHeight: 25 },
  farmerBody: { fontFamily: 'Sora_400Regular', fontSize: 14, lineHeight: 22, marginTop: 9 },

  teamWrap: { paddingHorizontal: 16, gap: 14 },
  teamCardShadow: {
    borderRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 5,
  },
  teamCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarGlow: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  teamAvatar: { width: 92, height: 92, borderRadius: 46 },
  teamName: { fontFamily: 'Sora_800ExtraBold', fontSize: 21, textAlign: 'center' },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 12,
    maxWidth: '94%',
  },
  roleText: { fontFamily: 'Sora_800ExtraBold', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  collegeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 12,
  },
  collegeText: { fontFamily: 'Sora_500Medium', fontSize: 11, textAlign: 'center', flexShrink: 1 },

  testimonialWrap: { paddingHorizontal: 16, gap: 12 },
  testimonialCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  testimonialTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  testimonialAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testimonialName: { fontFamily: 'Sora_800ExtraBold', fontSize: 16 },
  testimonialSubtitle: { fontFamily: 'Sora_400Regular', fontSize: 12, marginTop: 3 },
  quoteMark: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  testimonialText: { fontFamily: 'Sora_400Regular', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  starsRow: { flexDirection: 'row', gap: 3, marginTop: 13 },

  techGrid: { paddingHorizontal: 16, gap: 10 },
  techCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: 20, padding: 14 },
  techTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 14 },
  techBody: { fontFamily: 'Sora_400Regular', fontSize: 12, lineHeight: 18, marginTop: 4, flexShrink: 1 },

  contactCard: { marginHorizontal: 16, borderWidth: 1, borderRadius: 24, padding: 16 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  contactIcon: { width: 34, height: 34, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  contactText: { flex: 1, fontFamily: 'Sora_500Medium', fontSize: 12, lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Sora_400Regular', fontSize: 14, marginTop: 10 },
  textarea: { borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Sora_400Regular', fontSize: 14, minHeight: 110, marginTop: 10 },
  sendButton: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  sendButtonText: { fontFamily: 'Sora_800ExtraBold', fontSize: 15, color: '#FFFFFF' },

  footer: { marginHorizontal: 16, marginTop: 18, borderWidth: 1, borderRadius: 24, padding: 20, alignItems: 'center' },
  footerLogo: { width: 36, height: 36, marginBottom: 8 },
  footerTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 17 },
  footerText: { fontFamily: 'Sora_400Regular', fontSize: 12, marginTop: 5, textAlign: 'center' },
});
