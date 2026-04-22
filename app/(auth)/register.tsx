import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
  ImageBackground,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { registerAccount, startSocialAuth } from '@/features/auth/services/auth';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<null | 'google' | 'facebook' | 'x'>(null);
  const { login } = useAuthStore();

  async function handleSocialLogin(provider: 'google' | 'facebook' | 'x') {
    setSocialLoading(provider);
    try {
      // Opens the system browser. When the backend redirects back to
      // saathiai://auth/callback?token=…, the Linking listener in _layout.tsx
      // catches the URL, parses the token, and navigates to /(app).
      const session = await startSocialAuth(provider);
      login(session.user, session.token);
      router.replace('/(app)');
    } catch (err: any) {
      Alert.alert('Social Auth Error', err?.message || 'Could not complete social login.');
    } finally {
      setSocialLoading(null);
    }
  }

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('Missing fields', 'Name, email and password are required.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await registerAccount({ name, email, phone: phone || undefined, password });

      if (response.requiresOTP) {
        router.push({
          pathname: '/(auth)/verify-otp',
          params: { email: response.email },
        });
      }
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={styles.container} bounces={false}>
        <ImageBackground
          source={require('assets/images/auth_screen_mobile.png')}
          style={styles.hero}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay}>
            <View style={styles.heroBadge}><Text style={{ fontSize: 20 }}>🌱</Text></View>
            <Text style={styles.heroTitle}>
              Empowering Farmers,{"\n"}
              <Text style={{ color: '#A8F0C0' }}>Transforming Agriculture.</Text>
            </Text>
            <Text style={styles.heroSub}>Join the smart farming revolution today</Text>
          </View>
        </ImageBackground>

        <View style={styles.card}>
          <View style={styles.tabRow}>
            <TouchableOpacity style={styles.tab} onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.tabText}>Login</Text>
            </TouchableOpacity>
            <View style={[styles.tab, styles.tabActive]}>
              <Text style={[styles.tabText, styles.tabTextActive]}>Register</Text>
            </View>
          </View>

          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ramesh Kumar"
            placeholderTextColor="#B0C4B8"
            autoComplete="name"
          />

          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="ramesh@gmail.com"
            placeholderTextColor="#B0C4B8"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Text style={styles.label}>PHONE (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 98765 43210"
            placeholderTextColor="#B0C4B8"
            keyboardType="phone-pad"
            autoComplete="tel"
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Create a strong password (min 8 chars)"
            placeholderTextColor="#B0C4B8"
            secureTextEntry
            autoComplete="new-password"
          />

          <Text style={styles.label}>CONFIRM PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            placeholderTextColor="#B0C4B8"
            secureTextEntry
            autoComplete="new-password"
          />

          <TouchableOpacity
            style={[styles.btnPrimary, isLoading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnPrimaryText}>Send OTP →</Text>}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtnCircle} onPress={() => handleSocialLogin('google')}>
              <View style={[styles.socialIconCircle, { backgroundColor: '#FFF', borderColor: '#E5E7EB' }]}>
                {socialLoading === 'google'
                  ? <ActivityIndicator size="small" color="#DB4437" />
                  : <FontAwesome name="google" size={20} color="#DB4437" />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialBtnCircle} onPress={() => handleSocialLogin('facebook')}>
              <View style={[styles.socialIconCircle, { backgroundColor: '#1877F2' }]}>
                {socialLoading === 'facebook'
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <FontAwesome name="facebook-f" size={20} color="#FFFFFF" />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialBtnCircle} onPress={() => handleSocialLogin('x')}>
              <View style={[styles.socialIconCircle, { backgroundColor: '#000000' }]}>
                {socialLoading === 'x'
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <FontAwesome name="twitter" size={20} color="#FFFFFF" />}
              </View>
            </TouchableOpacity>
          </View>
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
  heroBadge: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', marginBottom: 12,
  },
  heroTitle: { fontSize: 24, fontFamily: 'Sora_800ExtraBold', color: '#fff', lineHeight: 30, marginTop: 58 },
  heroSub: { fontSize: 13, fontFamily: 'Sora_400Regular', color: 'rgba(255,255,255,0.6)', marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 28, marginTop: -20, padding: 24, paddingBottom: 40 },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  tabActive: { backgroundColor: '#fff', elevation: 2 },
  tabText: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },
  label: {
    fontFamily: 'Sora_600SemiBold', fontSize: 11, color: Colors.textSecondary,
    letterSpacing: 0.6, marginBottom: 6, textTransform: 'uppercase',
  },
  input: {
    height: 52, backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 14, paddingHorizontal: 16, fontFamily: 'Sora_400Regular',
    fontSize: 14, color: Colors.textPrimary, marginBottom: 16,
  },
  btnPrimary: {
    height: 54, backgroundColor: Colors.primary, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  btnPrimaryText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontFamily: 'Sora_400Regular', fontSize: 11, color: Colors.textSecondary },
  socialRow: { flexDirection: 'row', gap: 16, justifyContent: 'center', alignItems: 'center' },
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
  },
});


