import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Alert, ActivityIndicator, Platform, Image, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { apiCall } from '../../services/api';

// ─── Data ────────────────────────────────────────────────────
const STATS = [
  { value: '5+', label: 'Years of Research' },
  { value: '50+', label: 'Farming Partners' },
  { value: '500+', label: 'Farmers Served' },
  { value: '3', label: 'Language Support' },
];

const TECH_FEATURES = [
  {
    animation: require('../../animations/Microscope.json'),
    color: Colors.primary,
    title: 'Advanced Sensors',
    desc: 'Multi-parameter soil probes measuring NPK, pH, moisture, EC, and temperature with lab-grade accuracy.',
  },
  {
    animation: require('../../animations/Brain.json'),
    color: Colors.blue,
    title: 'AI Processing',
    desc: 'Gemini-powered recommendations analyzing your soil data to suggest optimal fertilizers and treatments.',
  },
  {
    animation: require('../../animations/chatbot.json'),
    color: Colors.amber,
    title: 'Language Support',
    desc: 'Full support for English, Hindi, Odia, and more — making precision farming accessible for every farmer.',
  },
];

const TEAM = [
  {
    name: 'Nilambar Behera',
    role: 'Founder & Lead Architect\n(IoT & AI LLM)',
    college: 'Bhadrak Auto. Clg, BCA',
    color: Colors.blue,
  },
  {
    name: 'Sanatan Sethi',
    role: 'Co-Founder &\nMobile App Developer',
    college: 'Bhadrak Auto. Clg, BCA',
    color: Colors.primary,
  },
];

const TESTIMONIALS = [
  {
    name: 'Suresh Mohanty',
    loc: 'Farmer from Balasore',
    quote: 'Saathi AI has transformed my farming. The soil test results were accurate and the recommendations actually improved my harvest by 40%.',
    stars: 5,
  },
  {
    name: 'Lakshmi Sahoo',
    loc: 'Progressive Farmer',
    quote: "The AI recommendations are spot on! I\'ve reduced fertilizer costs by 25% while improving soil health. Highly recommended.",
    stars: 5,
  },
];

function Stars({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Ionicons key={i} name="star" size={14} color={i < count ? '#FBBF24' : Colors.borderLight} />
      ))}
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function AboutScreen() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields before sending.');
      return;
    }
    setIsSending(true);
    try {
      await apiCall('/api/contact', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      Alert.alert('Message Sent!', "Thank you! We'll get back to you shortly.");
      setFormData({ name: '', email: '', message: '' });
    } catch (e: any) {
      Alert.alert('Send Failed', e.message || 'Could not send your message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>About Saathi AI</Text>
          <Text style={styles.heroDesc}>
            Empowering India's farmers with AI-powered soil intelligence. We bridge the gap between modern technology and traditional farming practices.
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {STATS.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Mission */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.bodyText}>
            Agriculture is the backbone of India's economy, yet millions of farmers struggle without access to modern soil analysis tools. Saathi AI exists to change that.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 10 }]}>
            We combine IoT sensors (Agni device), artificial intelligence (Gemini AI), and multilingual support to deliver precise, actionable soil health insights directly to farmers' hands.
          </Text>
        </View>

        {/* How It Works */}
        <View style={styles.techCard}>
          <View style={styles.techCardHeader}>
            <Text style={styles.techCardTitle}>How Our Technology Works</Text>
          </View>
          <View style={styles.techCardBody}>
            {TECH_FEATURES.map((f, i) => (
              <View key={i} style={styles.techFeature}>
                <View style={[styles.techIconBg, { backgroundColor: f.color + '20' }]}>
                  <LottieView source={f.animation} autoPlay loop style={{ width: 40, height: 40 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.techTitle}>{f.title}</Text>
                  <Text style={styles.techDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Team */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meet Our Team</Text>
          <View style={styles.teamGrid}>
            {TEAM.map((m, i) => (
              <View key={i} style={[styles.teamCard, { borderTopColor: m.color }]}>
                <View style={[styles.teamAvatar, { backgroundColor: m.color }]}>
                  <Text style={styles.teamAvatarText}>{m.name[0]}</Text>
                </View>
                <Text style={styles.teamName}>{m.name}</Text>
                <Text style={[styles.teamRole, { color: m.color }]}>{m.role}</Text>
                <View style={styles.teamCollege}>
                  <Text style={styles.teamCollegeText}>{m.college}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Testimonials */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Farmers Say</Text>
          {TESTIMONIALS.map((t, i) => (
            <View key={i} style={styles.testimonialCard}>
              <View style={styles.testimonialHeader}>
                <View style={styles.testimonialAvatarBg}>
                  <Ionicons name="person-circle-outline" size={32} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.testimonialName}>{t.name}</Text>
                  <Text style={styles.testimonialLoc}>{t.loc}</Text>
                </View>
              </View>
              <Text style={styles.testimonialQuote}>"{t.quote}"</Text>
              <Stars count={t.stars} />
            </View>
          ))}
        </View>

        {/* Contact */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Get In Touch</Text>

          <View style={styles.contactInfoRow}>
            <Ionicons name="location-outline" size={18} color={Colors.primary} />
            <Text style={styles.contactInfoText}>FMU-TBI | Balasore, Odisha, India</Text>
          </View>
          <Pressable style={styles.contactInfoRow} onPress={() => Linking.openURL('tel:+917205095602')}>
            <Ionicons name="call-outline" size={18} color={Colors.primary} />
            <Text style={[styles.contactInfoText, { color: Colors.blue }]}>+91 7205095602</Text>
          </Pressable>
          <Pressable style={styles.contactInfoRow} onPress={() => Linking.openURL('mailto:saathi.ai.innovation@gmail.com')}>
            <Ionicons name="mail-outline" size={18} color={Colors.primary} />
            <Text style={[styles.contactInfoText, { color: Colors.blue }]}>saathi.ai.innovation@gmail.com</Text>
          </Pressable>

          <View style={styles.formDivider} />
          <Text style={styles.formLabel}>Send Us a Message</Text>

          <TextInput
            style={styles.input}
            placeholder="Your Full Name"
            placeholderTextColor={Colors.textMuted}
            value={formData.name}
            onChangeText={t => setFormData(p => ({ ...p, name: t }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor={Colors.textMuted}
            value={formData.email}
            onChangeText={t => setFormData(p => ({ ...p, email: t }))}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Tell us about your needs..."
            placeholderTextColor={Colors.textMuted}
            value={formData.message}
            onChangeText={t => setFormData(p => ({ ...p, message: t }))}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Pressable
            style={[styles.sendBtn, isSending && { opacity: 0.7 }]}
            onPress={handleSend}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send-outline" size={18} color="#fff" />
            )}
            <Text style={styles.sendBtnText}>{isSending ? 'Sending...' : 'Send Message'}</Text>
          </Pressable>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 20 },

  hero: {
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
  },
  heroTitle: {
    fontFamily: 'Sora_800ExtraBold', fontSize: 28, color: Colors.primary,
    textAlign: 'center', marginBottom: 10,
  },
  heroDesc: {
    fontFamily: 'Sora_400Regular', fontSize: 14, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl, gap: 12,
  },
  statCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.lg,
    padding: 16, alignItems: 'center',
    ...Spacing.shadows.sm, borderWidth: 1, borderColor: Colors.borderLight,
  },
  statValue: { fontFamily: 'Sora_800ExtraBold', fontSize: 24, color: Colors.primary },
  statLabel: { fontFamily: 'Sora_400Regular', fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 },

  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  sectionTitle: { fontFamily: 'Sora_700Bold', fontSize: 20, color: Colors.textPrimary, marginBottom: 12 },
  bodyText: { fontFamily: 'Sora_400Regular', fontSize: 14, color: Colors.textSecondary, lineHeight: 23 },

  techCard: {
    marginHorizontal: Spacing.xl, marginBottom: Spacing.xl,
    backgroundColor: Colors.surface, borderRadius: Spacing.radius.xl,
    overflow: 'hidden', ...Spacing.shadows.md,
  },
  techCardHeader: {
    backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: Spacing.lg,
  },
  techCardTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#fff' },
  techCardBody: { padding: Spacing.lg, gap: 16 },
  techFeature: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  techIconBg: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  techTitle: { fontFamily: 'Sora_700Bold', fontSize: 14, color: Colors.textPrimary, marginBottom: 4 },
  techDesc: { fontFamily: 'Sora_400Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  teamGrid: { flexDirection: 'row', gap: 14 },
  teamCard: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.xl, padding: 16,
    alignItems: 'center', borderTopWidth: 4,
    ...Spacing.shadows.md,
  },
  teamAvatar: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  teamAvatarText: { fontFamily: 'Sora_800ExtraBold', fontSize: 26, color: '#fff' },
  teamName: { fontFamily: 'Sora_700Bold', fontSize: 14, color: Colors.textPrimary, textAlign: 'center', marginBottom: 4 },
  teamRole: { fontFamily: 'Sora_600SemiBold', fontSize: 11, textAlign: 'center', marginBottom: 8 },
  teamCollege: { backgroundColor: Colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  teamCollegeText: { fontFamily: 'Sora_400Regular', fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },

  testimonialCard: {
    backgroundColor: Colors.surface, borderRadius: Spacing.radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderLight, ...Spacing.shadows.sm,
  },
  testimonialHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  testimonialAvatarBg: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  testimonialName: { fontFamily: 'Sora_700Bold', fontSize: 14, color: Colors.textPrimary },
  testimonialLoc: { fontFamily: 'Sora_400Regular', fontSize: 12, color: Colors.textSecondary },
  testimonialQuote: { fontFamily: 'Sora_400Regular', fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 20, marginBottom: 10 },

  contactCard: {
    marginHorizontal: Spacing.xl, marginBottom: Spacing.xl,
    backgroundColor: Colors.surface, borderRadius: Spacing.radius.xl,
    padding: Spacing.lg, ...Spacing.shadows.md,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  contactTitle: { fontFamily: 'Sora_700Bold', fontSize: 20, color: Colors.textPrimary, textAlign: 'center', marginBottom: 16 },
  contactInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  contactInfoText: { fontFamily: 'Sora_400Regular', fontSize: 13, color: Colors.textSecondary, flex: 1 },
  formDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 16 },
  formLabel: { fontFamily: 'Sora_700Bold', fontSize: 15, color: Colors.textPrimary, marginBottom: 12 },
  input: {
    backgroundColor: Colors.background, borderRadius: Spacing.radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: 'Sora_400Regular', fontSize: 14, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 12,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Spacing.radius.lg,
    paddingVertical: 14, gap: 10,
  },
  sendBtnText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#fff' },
});
