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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: Colors.textSecondary });
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<null | 'google' | 'facebook' | 'x'>(null);
  const { setSession } = useAuthStore();

  const checkStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    let label = '';
    let color = Colors.error;
    if (pass.length === 0) {
      label = '';
      color = Colors.textSecondary;
    } else if (score <= 2) {
      label = 'Weak';
      color = Colors.error;
    } else if (score <= 4) {
      label = 'Fair';
      color = Colors.warning;
    } else {
      label = 'Strong';
      color = Colors.success;
    }
    setPasswordStrength({ score, label, color });
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    checkStrength(text);
  };

  async function handleSocialLogin(provider: 'google' | 'facebook' | 'x') {
    setSocialLoading(provider);
    try {
      // Opens the system browser. When the backend redirects back to
      // saathiai://auth/callback?token=…, the Linking listener in _layout.tsx
      // catches the URL, parses the token, and navigates to /(app).
      const session = await startSocialAuth(provider);
      await setSession(session.user, session.token, session.refreshToken ?? null);
      router.replace('/(app)');
    } catch (err: any) {
      Alert.alert('Social Auth Error', err?.message || 'Could not complete social login.');
    } finally {
      setSocialLoading(null);
    }
  }

  async function handleRegister() {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter your full name.');
      return;
    }
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Email and password are required.');
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
      // Map name to username: lowercase, trim, spaces to underscores
      const generatedUsername = name.toLowerCase().trim().replace(/\s+/g, '_');
      
      const response = await registerAccount({ 
        name: name.trim(), 
        username: generatedUsername,
        email: email.trim(), 
        phone: phone.trim() || undefined, 
        password 
      });

      if (response.requiresOTP) {
        router.push({
          pathname: '/(auth)/verify-otp',
          params: { email: response.email },
        });
      }
    } catch (err: any) {
      console.error('[Register] Error:', err);
      // Try to extract detailed error message from server response
      const serverMessage = err.response?.data?.message || err.response?.data?.error;
      const errorMessage = serverMessage || err.message || 'Please check your connection and try again.';
      
      Alert.alert('Registration Failed', errorMessage);
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
          <View style={styles.inputContainer}>
            <FontAwesome name="user" size={16} color="#8A9E8E" style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              value={name}
              onChangeText={setName}
              placeholder="Ramesh Kumar"
              placeholderTextColor="#B0C4B8"
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>

          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <View style={styles.inputContainer}>
            <FontAwesome name="envelope" size={16} color="#8A9E8E" style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              value={email}
              onChangeText={setEmail}
              placeholder="ramesh@gmail.com"
              placeholderTextColor="#B0C4B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <Text style={styles.label}>PHONE (OPTIONAL)</Text>
          <View style={styles.inputContainer}>
            <FontAwesome name="phone" size={16} color="#8A9E8E" style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 9876543210"
              placeholderTextColor="#B0C4B8"
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </View>

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.inputContainer}>
            <FontAwesome name="lock" size={16} color="#8A9E8E" style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              value={password}
              onChangeText={handlePasswordChange}
              placeholder="Create a strong password (min 8 chars)"
              placeholderTextColor="#B0C4B8"
              secureTextEntry={!showPassword}
              autoComplete="new-password"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <FontAwesome name={showPassword ? 'eye-slash' : 'eye'} size={18} color="#8A9E8E" />
            </TouchableOpacity>
          </View>

          {password.length > 0 && (
            <>
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBarBackground}>
                  <View style={[styles.strengthBar, { width: `${(passwordStrength.score / 5) * 100}%`, backgroundColor: passwordStrength.color }]} />
                </View>
                <Text style={[styles.strengthText, { color: passwordStrength.color }]}>{passwordStrength.label}</Text>
              </View>
              
              <View style={styles.requirementsContainer}>
                <View style={styles.requirementItem}>
                  <FontAwesome 
                    name={password.length >= 8 ? 'check-circle' : 'circle-o'} 
                    size={12} 
                    color={password.length >= 8 ? Colors.success : Colors.textMuted} 
                  />
                  <Text style={[styles.requirementText, password.length >= 8 && styles.requirementMet]}>
                    At least 8 characters
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <FontAwesome 
                    name={/[A-Z]/.test(password) ? 'check-circle' : 'circle-o'} 
                    size={12} 
                    color={/[A-Z]/.test(password) ? Colors.success : Colors.textMuted} 
                  />
                  <Text style={[styles.requirementText, /[A-Z]/.test(password) && styles.requirementMet]}>
                    Contains uppercase letter
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <FontAwesome 
                    name={/[0-9]/.test(password) ? 'check-circle' : 'circle-o'} 
                    size={12} 
                    color={/[0-9]/.test(password) ? Colors.success : Colors.textMuted} 
                  />
                  <Text style={[styles.requirementText, /[0-9]/.test(password) && styles.requirementMet]}>
                    Contains a number
                  </Text>
                </View>
              </View>
            </>
          )}

          <Text style={styles.label}>CONFIRM PASSWORD</Text>
          <View style={styles.inputContainer}>
            <FontAwesome name="lock" size={16} color="#8A9E8E" style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              placeholderTextColor="#B0C4B8"
              secureTextEntry={!showConfirmPassword}
              autoComplete="new-password"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <FontAwesome name={showConfirmPassword ? 'eye-slash' : 'eye'} size={18} color="#8A9E8E" />
            </TouchableOpacity>
          </View>

          {confirmPassword.length > 0 && (
            <View style={styles.matchContainer}>
              <FontAwesome
                name={password === confirmPassword ? 'check-circle' : 'times-circle'}
                size={14}
                color={password === confirmPassword ? Colors.success : Colors.error}
              />
              <Text style={[styles.matchText, { color: password === confirmPassword ? Colors.success : Colors.error }]}>
                {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
              </Text>
            </View>
          )}

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
  inputField: {
    flex: 1,
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
    height: '100%',
    padding: 0,
  },
  eyeBtn: {
    padding: 8,
    marginRight: -8,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -12,
    marginBottom: 12,
    gap: 8,
  },
  strengthBarBackground: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    flex: 1,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 10,
    minWidth: 40,
    textAlign: 'right',
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -12,
    marginBottom: 12,
  },
  matchText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 10,
  },
  requirementsContainer: {
    marginBottom: 16,
    paddingLeft: 4,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  requirementText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  requirementMet: {
    color: Colors.success,
    fontFamily: 'Sora_600SemiBold',
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


