import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
  ImageBackground,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { apiCall } from '@/services/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [isLoading, setIsLoading] = useState(false);

  async function handleRequestOTP() {
    if (!email.trim()) {
      Alert.alert('Missing Email', 'Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      await apiCall('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      Alert.alert('OTP Sent', 'Please check your email for the verification code.');
      setStep('otp');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (!otp.trim()) {
      Alert.alert('Missing OTP', 'Please enter the verification code.');
      return;
    }

    setIsLoading(true);
    try {
      await apiCall('/auth/verify-reset-otp', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      setStep('reset');
    } catch (err: any) {
      Alert.alert('Invalid OTP', err?.message || 'The verification code is incorrect or expired.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetPassword() {
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
      await apiCall('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      Alert.alert('Success', 'Your password has been reset successfully!', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container} bounces={false}>
        {/* Hero Header Image Background */}
        <ImageBackground
          source={require('assets/images/auth_screen_mobile.png')}
          style={styles.hero}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={{ fontSize: 24, color: '#fff' }}>←</Text>
            </TouchableOpacity>
            <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>🔐</Text></View>
            <Text style={styles.heroTitle}>
              {step === 'email' ? 'Forgot Password?' : step === 'otp' ? 'Verify OTP' : 'Set New Password'}
            </Text>
            <Text style={styles.heroSub}>
              {step === 'email' ? "No worries! We'll send you reset instructions." : 
               step === 'otp' ? 'Enter the 6-digit code sent to your email.' : 
               'Choose a strong password for your account.'}
            </Text>
          </View>
        </ImageBackground>

        {/* Auth Card */}
        <View style={styles.card}>
          {step === 'email' && (
            <>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#B0C4B8"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <TouchableOpacity
                style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
                onPress={handleRequestOTP}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Send OTP →</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={styles.label}>VERIFICATION CODE</Text>
              <TextInput
                style={styles.input}
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter 6-digit code"
                placeholderTextColor="#B0C4B8"
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
                onPress={handleVerifyOTP}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Verify OTP →</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('email')} style={{ marginTop: 16, alignSelf: 'center' }}>
                <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 13, color: Colors.primary }}>
                  ← Go Back
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'reset' && (
            <>
              <Text style={styles.label}>NEW PASSWORD</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#B0C4B8"
                secureTextEntry
                autoComplete="password-new"
              />
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#B0C4B8"
                secureTextEntry
                autoComplete="password-new"
              />
              <TouchableOpacity
                style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Reset Password ✓</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Remember your password? <Text style={{ color: Colors.primary }}>Log in</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { minHeight: 340, position: 'relative', overflow: 'hidden' },
  heroOverlay: {
    paddingTop: 80, 
    paddingHorizontal: 24, 
    paddingBottom: 48,
    backgroundColor: 'rgba(0,0,0,0.4)', // 40% black overlay
    flex: 1,
  },
  backBtn: {
    position: 'absolute',
    top: 48,
    left: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-end', marginBottom: 12,
  },
  heroBadgeText: { fontSize: 20 },
  heroTitle: { fontSize: 28, fontFamily: 'Sora_800ExtraBold', color: '#fff', lineHeight: 36, marginTop: 75 },
  heroSub: { fontSize: 13, fontFamily: 'Sora_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 28, margin: 0,
    marginTop: -20,
    padding: 24,
    paddingBottom: 40,
    minHeight: 300,
  },
  label: { fontFamily: 'Sora_600SemiBold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 0.6, marginBottom: 6, textTransform: 'uppercase' },
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
  loginLink: {
    marginTop: 24,
    alignSelf: 'center',
  },
  loginLinkText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
});


