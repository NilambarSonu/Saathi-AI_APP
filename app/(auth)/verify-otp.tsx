import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { verifyOTP, resendOTP } from '@/features/auth/services/auth';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

const OTP_LENGTH = 6;

export default function VerifyOTPScreen() {
  const { theme } = useTheme();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { setSession } = useAuthStore();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  function handleOtpChange(value: string, index: number) {
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

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
      const response = await verifyOTP(email, code);
      if (response.success && response.token && response.user) {
        await setSession(response.user, response.token, response.refreshToken ?? null);
        router.replace('/(app)');
      } else {
        Alert.alert('Verification Failed', 'Could not verify email. Please try again.');
      }
    } catch (err: any) {
      const serverMessage = err.response?.data?.error || err.message || 'The code is incorrect or expired.';
      Alert.alert('Verification Failed', serverMessage);
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={[styles.backText, { color: theme.textSecondary }]}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={[styles.icon, { backgroundColor: theme.surfaceAlt }]}>
          <Text style={{ fontSize: 32 }}>📧</Text>
        </View>

        <Text style={[styles.title, { color: theme.textPrimary }]}>Verify Your Email</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          We sent a 6-digit code to{'\n'}
          <Text style={[styles.emailHighlight, { color: theme.textPrimary }]}>{maskedEmail}</Text>
          {'\n'}Enter it below to continue.
        </Text>

        {/* OTP boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => { if (ref) inputRefs.current[i] = ref; }}
              style={[
                styles.otpBox,
                {
                  borderColor: digit ? theme.primary : theme.sep1,
                  backgroundColor: digit ? theme.surfaceAlt : theme.background,
                  color: theme.primary,
                }
              ]}
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
        <Text style={[styles.timer, { color: theme.textSecondary }]}>
          {canResend ? (
            <Text style={[styles.resendLink, { color: theme.primary }]} onPress={handleResend}>
              Resend OTP
            </Text>
          ) : (
            <>Resend in <Text style={[styles.timerHighlight, { color: theme.primary }]}>{countdown}s</Text></>
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
  container: { flex: 1 },
  back: { padding: 20, paddingTop: 56 },
  backText: { fontFamily: 'Sora_600SemiBold', fontSize: 16 },
  content: { flex: 1, paddingHorizontal: 28, alignItems: 'center' },
  icon: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  title: {
    fontFamily: 'Sora_800ExtraBold', fontSize: 24,
    textAlign: 'center', marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Sora_400Regular', fontSize: 14,
    textAlign: 'center', lineHeight: 22, marginBottom: 36,
  },
  emailHighlight: { fontFamily: 'Sora_700Bold' },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  otpBox: {
    width: 48, height: 60, borderRadius: 14,
    borderWidth: 2, fontFamily: 'Sora_800ExtraBold', fontSize: 22,
  },
  timer: { fontFamily: 'Sora_400Regular', fontSize: 14, marginBottom: 28 },
  timerHighlight: { fontFamily: 'Sora_700Bold' },
  resendLink: { fontFamily: 'Sora_700Bold' },
  btnPrimary: {
    width: '100%', height: 54, backgroundColor: Colors.primary,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  btnText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#fff' },
});
