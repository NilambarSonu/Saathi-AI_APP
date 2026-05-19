import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
  ImageBackground, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useDarkModeTheme } from '@/context/ThemeContext';
import {
  sendOtp,
  verifyOtp,
  sendPasswordChangeOtp,
  changePassword,
  saveSession,
} from '@/features/auth/services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────
// Forgot Password — 4-step flow (no dedicated endpoint needed)
//
// Step 1 (email)  → POST /auth/send-otp { email, purpose: "login" }
// Step 2 (otp)    → POST /auth/verify-otp { otp, email, client: "mobile" }
//                    ↳ returns { token, refreshToken, user } — temporarily stored
// Step 3 (change) → POST /auth/send-password-change-otp  (Bearer token)
//                    ↳ returns { otpId }
// Step 4 (newpwd) → POST /auth/change-password { otpId, otp: changeOtp, newPassword }
// ─────────────────────────────────────────────────────────────────

type Step = 'email' | 'verify' | 'change_otp' | 'new_password';

export default function ForgotPasswordScreen() {
  const { theme, isDark } = useDarkModeTheme();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [changeOtp, setChangeOtp] = useState('');
  const [otpId, setOtpId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [isLoading, setIsLoading] = useState(false);

  // ── Step 1: Send login OTP to email ──────────────────────────────
  async function handleSendOtp() {
    if (!email.trim()) {
      Alert.alert('Missing Email', 'Please enter your email address.');
      return;
    }
    setIsLoading(true);
    try {
      await sendOtp(email.trim(), 'login');
      Alert.alert('OTP Sent', 'Please check your email for the 6-digit verification code.');
      setStep('verify');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Step 2: Verify OTP → get temp token ─────────────────────────
  async function handleVerifyOtp() {
    if (!otp.trim() || otp.trim().length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code from your email.');
      return;
    }
    setIsLoading(true);
    try {
      // verifyOtp returns { success, token, refreshToken, user }
      const response = await verifyOtp(otp.trim(), email.trim());

      if (!response.success || !response.token) {
        throw new Error('OTP verification did not return a token.');
      }

      // Temporarily store token so sendPasswordChangeOtp can use it
      await AsyncStorage.setItem('saathi_token', response.token);
      if (response.refreshToken) {
        await AsyncStorage.setItem('saathi_refresh_token', response.refreshToken);
      }

      // Step 3: now request the change-password OTP
      const changeOtpResponse = await sendPasswordChangeOtp();
      setOtpId(changeOtpResponse.otpId);

      Alert.alert(
        'Security Code Sent',
        'A password-change verification code has been sent to your email.'
      );
      setStep('new_password');
    } catch (err: any) {
      Alert.alert('Invalid OTP', err?.message || 'The code is incorrect or expired.');
      setOtp('');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Step 4: Set new password ──────────────────────────────────────
  async function handleResetPassword() {
    if (!changeOtp.trim() || changeOtp.trim().length !== 6) {
      Alert.alert('Missing Code', 'Please enter the 6-digit change-password code from your email.');
      return;
    }
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Missing Fields', 'Please enter and confirm your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(otpId, changeOtp.trim(), newPassword.trim());

      // Clean up temporary token
      await AsyncStorage.multiRemove(['saathi_token', 'saathi_refresh_token']);

      Alert.alert(
        '✅ Password Reset!',
        'Your password has been changed successfully. Please log in with your new password.',
        [{ text: 'Log In', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Dynamic hero copy
  const heroTitle =
    step === 'email' ? 'Forgot Password?' :
    step === 'verify' ? 'Verify Your Email' :
    'Set New Password';

  const heroSub =
    step === 'email' ? "No worries! We'll send a code to your email." :
    step === 'verify' ? 'Enter the 6-digit code sent to your email.' :
    'Enter the security code & choose a strong password.';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.keyboardRoot, { backgroundColor: theme.background }]}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.background }]}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Header */}
        <ImageBackground
          source={require('assets/images/auth_screen_mobile.png')}
          style={styles.hero}
          resizeMode="cover"
        >
          <View style={[styles.heroOverlay, isDark && styles.heroOverlayDark]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={{ fontSize: 24, color: '#fff' }}>←</Text>
            </TouchableOpacity>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>🔐</Text>
            </View>
            <Text style={styles.heroTitle}>{heroTitle}</Text>
            <Text style={styles.heroSub}>{heroSub}</Text>
          </View>
        </ImageBackground>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>

          {/* ── Step 1: Email ── */}
          {step === 'email' && (
            <>
              <Text style={[styles.label, { color: theme.textSecondary }]}>EMAIL ADDRESS</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: isDark ? theme.sep2 : Colors.border, color: theme.textPrimary }]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={isDark ? theme.textMuted : '#B0C4B8'}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <TouchableOpacity
                style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnPrimaryText}>Send OTP →</Text>}
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 2: Verify login OTP ── */}
          {step === 'verify' && (
            <>
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Enter the 6-digit code sent to <Text style={[styles.emailHighlight, { color: theme.textPrimary }]}>{email}</Text>
              </Text>
              <Text style={[styles.label, { color: theme.textSecondary }]}>VERIFICATION CODE</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: isDark ? theme.sep2 : Colors.border, color: theme.textPrimary }]}
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter 6-digit code"
                placeholderTextColor={isDark ? theme.textMuted : '#B0C4B8'}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnPrimaryText}>Verify OTP →</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('email')} style={styles.backLink}>
                <Text style={[styles.backLinkText, { color: theme.primary }]}>← Change Email</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 3+4: New password + change OTP ── */}
          {step === 'new_password' && (
            <>
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Check your email for a <Text style={[styles.emailHighlight, { color: theme.textPrimary }]}>password-change code</Text>, then enter it below with your new password.
              </Text>

              <Text style={[styles.label, { color: theme.textSecondary }]}>SECURITY CODE (from email)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: isDark ? theme.sep2 : Colors.border, color: theme.textPrimary }]}
                value={changeOtp}
                onChangeText={setChangeOtp}
                placeholder="Enter 6-digit code"
                placeholderTextColor={isDark ? theme.textMuted : '#B0C4B8'}
                keyboardType="number-pad"
                maxLength={6}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>NEW PASSWORD</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: isDark ? theme.sep2 : Colors.border, color: theme.textPrimary }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password (min 8 chars)"
                placeholderTextColor={isDark ? theme.textMuted : '#B0C4B8'}
                secureTextEntry
                autoComplete="password-new"
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>CONFIRM PASSWORD</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: isDark ? theme.sep2 : Colors.border, color: theme.textPrimary }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={isDark ? theme.textMuted : '#B0C4B8'}
                secureTextEntry
                autoComplete="password-new"
              />

              <TouchableOpacity
                style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnPrimaryText}>Reset Password ✓</Text>}
              </TouchableOpacity>
            </>
          )}

          {/* Back to login link — always shown */}
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={styles.loginLink}
          >
            <Text style={[styles.loginLinkText, { color: theme.textSecondary }]}>
              Remember your password?{' '}
              <Text style={{ color: theme.primary }}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flexGrow: 1 },
  hero: { minHeight: 340, position: 'relative', overflow: 'hidden' },
  heroOverlay: {
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 48,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flex: 1,
  },
  heroOverlayDark: {
    backgroundColor: 'rgba(0,0,0,0.56)',
  },
  backBtn: {
    position: 'absolute', top: 48, left: 20,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  heroBadge: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-end', marginBottom: 12,
  },
  heroBadgeText: { fontSize: 20 },
  heroTitle: {
    fontSize: 28, fontFamily: 'Sora_800ExtraBold',
    color: '#fff', lineHeight: 36, marginTop: 75,
  },
  heroSub: {
    fontSize: 13, fontFamily: 'Sora_400Regular',
    color: 'rgba(255,255,255,0.7)', marginTop: 8,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: 28,
    flexGrow: 1,
    margin: 0, marginTop: -20, padding: 24, paddingBottom: 40, minHeight: 300,
  },
  infoText: {
    fontFamily: 'Sora_400Regular', fontSize: 13,
    color: Colors.textSecondary, marginBottom: 20, lineHeight: 20,
  },
  emailHighlight: { fontFamily: 'Sora_700Bold', color: Colors.textPrimary },
  label: {
    fontFamily: 'Sora_600SemiBold', fontSize: 11,
    color: Colors.textSecondary, letterSpacing: 0.6,
    marginBottom: 6, textTransform: 'uppercase',
  },
  input: {
    height: 52, backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 14, paddingHorizontal: 16,
    fontFamily: 'Sora_400Regular', fontSize: 14,
    color: Colors.textPrimary, marginBottom: 16,
  },
  btnPrimary: {
    height: 54, backgroundColor: Colors.primary,
    borderRadius: 16, alignItems: 'center',
    justifyContent: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnPrimaryText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#fff' },
  backLink: { marginTop: 16, alignSelf: 'center' },
  backLinkText: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: Colors.primary },
  loginLink: { marginTop: 24, alignSelf: 'center' },
  loginLinkText: { fontFamily: 'Sora_400Regular', fontSize: 13, color: Colors.textSecondary },
});
