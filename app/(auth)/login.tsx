import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Link } from 'expo-router';
import { loginWithCredentials } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/Colors';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuthStore();

  async function handleLogin() {
    if (!usernameOrEmail.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await loginWithCredentials(usernameOrEmail.trim(), password);
      setUser(response.user);
      router.replace('/(app)');
    } catch (err: any) {
      const rawMessage = err?.message || '';
      const message =
        rawMessage === 'INVALID_AUTH_TOKEN' || rawMessage === 'INVALID_REFRESH_TOKEN' || rawMessage === 'INVALID_AUTH_USER'
          ? 'Server returned an invalid login response. Please try again in a minute.'
          : rawMessage === 'NETWORK_REQUEST_FAILED'
            ? 'Network request failed. Please check internet and backend server status.'
            : rawMessage || 'Invalid credentials. Please try again.';

      Alert.alert(
        'Login Failed',
        message
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSocialLogin(provider: 'google' | 'facebook' | 'x') {
    try {
      const { API_BASE } = await import('../../services/api');
      const authUrl = `${API_BASE}/api/auth/${provider}?state=mobile`;
      await WebBrowser.openBrowserAsync(authUrl);
    } catch (err) {
      Alert.alert('Social Auth Error', 'Could not open login page.');
    }
  }

  async function handleShowOnboardingAgain() {
    await AsyncStorage.multiRemove(['saathi_has_onboarded', 'hasOnboarded']);
    router.replace('/(onboarding)');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container} bounces={false}>
        {/* Hero Header */}
        <LinearGradient
          colors={['#0D3B1D', '#1A7B3C']}
          style={styles.hero}
        >
          <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>🌱</Text></View>
          <Text style={styles.heroTitle}>
            Empowering Farmers,{'\n'}
            <Text style={styles.heroAccent}>Transforming Agriculture.</Text>
          </Text>
          <Text style={styles.heroSub}>Join 10,000+ farmers across India</Text>
        </LinearGradient>

        {/* Auth Card */}
        <View style={styles.card}>
          {/* Tab switcher */}
          <View style={styles.tabRow}>
            <View style={[styles.tab, styles.tabActive]}>
              <Text style={[styles.tabText, styles.tabTextActive]}>Login</Text>
            </View>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => router.replace('/(auth)/register')}
            >
              <Text style={styles.tabText}>Register</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleShowOnboardingAgain} style={styles.onboardingLinkBtn}>
            <Text style={styles.onboardingLinkText}>Show onboarding screens again</Text>
          </TouchableOpacity>

          {/* Form */}
          <Text style={styles.label}>USERNAME OR EMAIL</Text>
          <TextInput
            style={styles.input}
            value={usernameOrEmail}
            onChangeText={setUsernameOrEmail}
            placeholder="farmer123 or you@gmail.com"
            placeholderTextColor="#B0C4B8"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#B0C4B8"
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          {/* Primary button */}
          <TouchableOpacity
            style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnPrimaryText}>🌱 Login to Saathi AI →</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social buttons */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocialLogin('google')}>
              <Text style={styles.socialBtnText}>🔵 Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocialLogin('facebook')}>
              <Text style={styles.socialBtnText}>📘 Facebook</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocialLogin('x')}>
              <Text style={styles.socialBtnText}>✖ X</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { paddingTop: 64, paddingHorizontal: 24, paddingBottom: 48 },
  heroBadge: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-end', marginBottom: 12,
  },
  heroBadgeText: { fontSize: 20 },
  heroTitle: { fontSize: 24, fontFamily: 'Sora_800ExtraBold', color: '#fff', lineHeight: 32 },
  heroAccent: { color: '#A8F0C0' },
  heroSub: { fontSize: 13, fontFamily: 'Sora_400Regular', color: 'rgba(255,255,255,0.6)', marginTop: 6 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 28, margin: 0,
    marginTop: -20,
    padding: 24,
    paddingBottom: 40,
    minHeight: 400,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12, padding: 4,
    marginBottom: 24,
  },
  onboardingLinkBtn: {
    alignSelf: 'center',
    marginBottom: 18,
    paddingVertical: 4,
  },
  onboardingLinkText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  tab: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  tabActive: { backgroundColor: Colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },
  label: { fontFamily: 'Sora_600SemiBold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 0.6, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    height: 52, backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 14, paddingHorizontal: 16,
    fontFamily: 'Sora_400Regular', fontSize: 14,
    color: Colors.textPrimary, marginBottom: 16,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  eyeBtn: { padding: 12 },
  btnPrimary: {
    height: 54, backgroundColor: Colors.primary,
    borderRadius: 16, alignItems: 'center',
    justifyContent: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnPrimaryText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontFamily: 'Sora_400Regular', fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  socialRow: { flexDirection: 'row', gap: 10 },
  socialBtn: {
    flex: 1, height: 48,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  socialBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: 12, color: Colors.textPrimary },
});
