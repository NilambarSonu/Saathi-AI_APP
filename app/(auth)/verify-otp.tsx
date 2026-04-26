import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { verifyOTP, resendOTP } from '@/features/auth/services/auth';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/Colors';

const OTP_LENGTH = 6;

export default function VerifyOTPScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { setSession } = useAuthStore();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<TextInput[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  function handleOtpChange(value: string, index: number) {
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // only last character
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (newOtp.every(d => d !== '') && newOtp.join('').length === OTP_LENGTH) {
      handleVerify(newOtp.join(''));
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(otpCode?: string) {
    const code = otpCode || otp.join('');
    if (code.length !== OTP_LENGTH) {
      Alert.alert('Incomplete', 'Please enter the 6-digit code.');
      return;
    }

    setIsLoading(true);
    try {
      // verifyOTP(email, otp) → { success, token, refreshToken, user }
      const response = await verifyOTP(email, code);

      if (response.success && response.token && response.user) {
        // Store session via the auth store (writes to AsyncStorage + Zustand)
        await setSession(response.user, response.token, response.refreshToken ?? null);
        router.replace('/(app)');
      } else {
        Alert.alert('Verification Failed', 'Could not verify email. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Invalid OTP', err.message || 'The code is incorrect or expired.');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    setCanResend(false);
    setCountdown(60);
    try {
      await resendOTP(email);
      Alert.alert('OTP Sent', 'A new verification code has been sent to your email.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resend OTP.');
    }
  }

  const maskedEmail = email?.replace(/(.{2})(.*)(@.*)/, '$1***$3') || '';

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.icon}><Text style={{ fontSize: 32 }}>📧</Text></View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.emailHighlight}>{maskedEmail}</Text>
          {'\n'}Enter it below to continue.
        </Text>

        {/* OTP boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => { if (ref) inputRefs.current[i] = ref; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : undefined]}
              value={digit}
              onChangeText={(v) => handleOtpChange(v, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Countdown / Resend */}
        <Text style={styles.timer}>
          {canResend ? (
            <Text style={styles.resendLink} onPress={handleResend}>
              Resend OTP
            </Text>
          ) : (
            <>Resend in <Text style={styles.timerHighlight}>{countdown}s</Text></>
          )}
        </Text>

        {/* Verify button */}
        <TouchableOpacity
          style={[styles.btnPrimary, isLoading && { opacity: 0.7 }]}
          onPress={() => handleVerify()}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>✓ Verify & Continue</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  back: { padding: 20, paddingTop: 56 },
  backText: { fontFamily: 'Sora_600SemiBold', fontSize: 16, color: Colors.textSecondary },
  content: { flex: 1, paddingHorizontal: 28, alignItems: 'center' },
  icon: {
    width: 80, height: 80, backgroundColor: Colors.surfaceAlt,
    borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  title: {
    fontFamily: 'Sora_800ExtraBold', fontSize: 24,
    color: Colors.textPrimary, textAlign: 'center', marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Sora_400Regular', fontSize: 14,
    color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 36,
  },
  emailHighlight: { fontFamily: 'Sora_700Bold', color: Colors.textPrimary },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  otpBox: {
    width: 48, height: 60, borderRadius: 14, borderWidth: 2,
    borderColor: Colors.border, backgroundColor: Colors.background,
    fontFamily: 'Sora_800ExtraBold', fontSize: 22, color: Colors.primary,
  },
  otpBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.surfaceAlt },
  timer: { fontFamily: 'Sora_400Regular', fontSize: 14, color: Colors.textSecondary, marginBottom: 28 },
  timerHighlight: { fontFamily: 'Sora_700Bold', color: Colors.primary },
  resendLink: { fontFamily: 'Sora_700Bold', color: Colors.primary },
  btnPrimary: {
    width: '100%', height: 54, backgroundColor: Colors.primary,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  btnText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#fff' },
});
