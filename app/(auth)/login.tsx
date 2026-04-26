import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
  ImageBackground,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { startSocialAuth } from '@/features/auth/services/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/authStore';

export default function LoginScreen() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<null | 'google' | 'facebook' | 'x'>(null);
  const { login, setSession } = useAuthStore();

  // Floating animation for the hero badge
  const badgeFloat = useSharedValue(0);

  useEffect(() => {
    badgeFloat.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      false
    );
  }, []);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: badgeFloat.value }],
  }));

  async function handleLogin() {
    if (!usernameOrEmail.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(usernameOrEmail.trim(), password);
      // Clear any pending BLE intent to ensure we land on Home, not Connect
      await AsyncStorage.removeItem('saathi_ble_connect_intent');
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
    setSocialLoading(provider);
    try {
      const session = await startSocialAuth(provider);
      await setSession(session.user, session.token, session.refreshToken ?? null);
      await AsyncStorage.removeItem('saathi_ble_connect_intent');
      router.replace('/(app)');
      // Browser closed — Linking listener in _layout.tsx handles the callback
    } catch (err: any) {
      Alert.alert('Social Auth Error', err?.message || 'Could not open login browser.');
    } finally {
      setSocialLoading(null);
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
      <ScrollView style={styles.container} bounces={false} showsVerticalScrollIndicator={false}>
        {/* Hero Header Image Background */}
        <ImageBackground
          source={require('assets/images/auth_screen_mobile.png')}
          style={styles.hero}
          resizeMode="cover"
        >
          {/* Subtle Dark Overlay to ensure text readability */}
          <View style={styles.heroOverlay}>
            {/* Animated floating elements */}
            <Animated.View style={[styles.floatingDot, { top: 185, left: 15, width: 60, height: 60, opacity: 0.12 }]} />
            <Animated.View style={[styles.floatingDot, { top: 180, right: 80, width: 40, height: 40, opacity: 0.18 }]} />

            <Animated.View style={[styles.heroBadge, badgeStyle]} entering={FadeInDown.delay(200).springify()}>
              <Text style={styles.heroBadgeText}>🌱</Text>
            </Animated.View>
            <Animated.Text style={styles.heroTitle} entering={FadeInDown.delay(300).springify()}>
              Welcome Back,{'\n'}
              <Text style={styles.heroAccent}>Farmer's!</Text>
            </Animated.Text>
            <Animated.Text style={styles.heroSub} entering={FadeInDown.delay(400).springify()}>
              Login to access your soil insights and AI recommendations
            </Animated.Text>
          </View>
        </ImageBackground>

        {/* Auth Card */}
        <Animated.View style={styles.card} entering={FadeInUp.delay(500).springify()}>
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
          <View style={styles.inputContainer}>
            <FontAwesome name="user" size={16} color="#8A9E8E" style={styles.inputIcon} />
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
          </View>

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.inputContainer}>
            <FontAwesome name="lock" size={16} color="#8A9E8E" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
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
              <FontAwesome name={showPassword ? 'eye-slash' : 'eye'} size={16} color="#8A9E8E" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotLink}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Primary button */}
          <TouchableOpacity
            style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={isLoading ? ['#8A9E8E', '#6B7F6B'] : ['#1A7B3C', '#22B455']}
              style={styles.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>🌱 Login to Saathi AI →</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social buttons */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtnCircle} onPress={() => handleSocialLogin('google')}>
              <Animated.View
                style={[styles.socialIconCircle, { backgroundColor: '#FFF', borderColor: '#E5E7EB' }]}
                entering={FadeInDown.delay(600).springify()}
              >
                {socialLoading === 'google'
                  ? <ActivityIndicator size="small" color="#DB4437" />
                  : <FontAwesome name="google" size={20} color="#DB4437" />}
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtnCircle} onPress={() => handleSocialLogin('facebook')}>
              <Animated.View
                style={[styles.socialIconCircle, { backgroundColor: '#1877F2' }]}
                entering={FadeInDown.delay(700).springify()}
              >
                {socialLoading === 'facebook'
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <FontAwesome name="facebook-f" size={20} color="#FFFFFF" />}
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtnCircle} onPress={() => handleSocialLogin('x')}>
              <Animated.View
                style={[styles.socialIconCircle, { backgroundColor: '#000000' }]}
                entering={FadeInDown.delay(800).springify()}
              >
                {socialLoading === 'x'
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <FontAwesome name="twitter" size={20} color="#FFFFFF" />}
              </Animated.View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    minHeight: 340,
    position: 'relative',
    overflow: 'hidden',
  },
  heroOverlay: {
    flex: 1,
    paddingTop: 110,
    paddingHorizontal: 20,
    paddingBottom: 50,
    backgroundColor: 'rgba(0,0,0,0.4)', // 40% black overlay
  },
  floatingDot: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#FFF',
  },
  heroBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  heroBadgeText: { fontSize: 29 },
  heroTitle: {
    marginTop: 30,
    fontSize: 29,
    fontFamily: 'Sora_800ExtraBold',
    color: '#fff',
    lineHeight: 37,
    marginBottom: 2,
  },
  heroAccent: { color: '#A8F0C0' },
  heroSub: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 28,
    margin: 0,
    marginTop: -20,
    padding: 24,
    paddingBottom: 40,
    minHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 4,
    marginBottom: 15,
  },
  onboardingLinkBtn: {
    alignSelf: 'center',
    marginBottom: 10,
    paddingVertical: 0,
  },
  onboardingLinkText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 9,
    color: Colors.primary,
  },
  tab: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  tabTextActive: { color: Colors.primary },
  label: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
    padding: 0,
  },
  eyeBtn: {
    padding: 12,
    marginRight: -12,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 16,
  },
  forgotText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  btnPrimary: {
    height: 54,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnPrimaryText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 15,
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialBtnCircle: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});


