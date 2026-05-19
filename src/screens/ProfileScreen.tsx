import React, { useState, useEffect, useRef } from 'react';
import { hideTabBar, showTabBar } from '@/constants/Animations';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Alert, ActivityIndicator, Switch,
  Platform, Image, Animated, Modal, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/context/ThemeContext';
import { logout, sendPasswordChangeOtp, changePassword } from '@/features/auth/services/auth';
import {
  getUserProfile,
  updateUserProfile,
  getSettings,
  updateSettings,
  getPrivacySettings,
  updatePrivacySettings,
} from '@/features/auth/services/user';


// ─── Helpers ─────────────────────────────────────────────────────────────────
const getFirstName = (user: any): string => {
  const raw = user?.name || user?.username || user?.email?.split('@')[0] || 'Farmer';
  const n = raw.split(/[\s_]+/)[0];
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
};

const getInitials = (user: any): string => {
  const name = user?.name || user?.username || 'F';
  return name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
};

const getProfilePictureUrl = (filename: string | null | undefined): string | null => {
  if (!filename) return null;
  const filenameMap: Record<string, string> = {
    'farmer.png': 'farmer.png',
    'farmer_1.png': 'farmer (1).png',
    'farmer_2.png': 'farmer (2).png',
    'farmer_3.png': 'farmer (3).png',
    'farmer_4.png': 'farmer (4).png',
    'farmer (1).png': 'farmer (1).png',
    'farmer (2).png': 'farmer (2).png',
    'farmer (3).png': 'farmer (3).png',
    'farmer (4).png': 'farmer (4).png',
  };
  const mappedName = filenameMap[filename] || filename;
  if (filename.startsWith('http')) return filename;
  const encodedName = encodeURI(mappedName);
  return `https://www.saathiai.org/Farmer_Icon/${encodedName}`;
};

const getUserAvatar = (u: any): string | null => {
  const filename = u?.profilePicture || u?.profile_picture || u?.avatar_url || u?.profile_image;
  return getProfilePictureUrl(filename);
};

const getProviderLabel = (provider?: string) => {
  if (!provider || provider === 'local') return { label: 'Email', color: '#1A7B3C', icon: 'mail-outline' };
  if (provider === 'google') return { label: 'Google', color: '#DB4437', icon: 'logo-google' };
  if (provider === 'facebook') return { label: 'Facebook', color: '#1877F2', icon: 'logo-facebook' };
  return { label: provider, color: '#6B7280', icon: 'person-outline' };
};

const getAccountAge = (createdAt?: string) => {
  if (!createdAt) return 'New member';
  const diff = Math.ceil(Math.abs(Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (diff < 30) return `${diff}d member`;
  if (diff < 365) return `${Math.floor(diff / 30)}mo member`;
  return `${Math.floor(diff / 365)}yr member`;
};

const mergeUser = (base: any, patch: any) => {
  const merged = { ...(base || {}), ...(patch || {}) };
  return {
    ...merged,
    name: merged?.name || merged?.full_name || merged?.username || '',
    email: merged?.email || base?.email || '',
    avatar_url: merged?.profilePicture || merged?.avatar_url || merged?.profile_image || merged?.profile_picture || null,
  };
};


// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ title, icon, color, children, theme }: {
  title: string; icon: string; color: string; children: React.ReactNode; theme: any;
}) {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
      <View style={styles.cardHeader}>
        <LinearGradient colors={[color + '30', color + '10']} style={styles.cardIconBg}>
          <Ionicons name={icon as any} size={17} color={color} />
        </LinearGradient>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Field Row ────────────────────────────────────────────────────────────────
function FieldRow({ label, value, onChangeText, readOnly, placeholder, icon, theme }: {
  label: string; value: string; onChangeText?: (v: string) => void;
  readOnly?: boolean; placeholder?: string; icon?: string; theme: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View style={[
        styles.fieldInputWrap, 
        { backgroundColor: theme.background, borderColor: theme.borderLight },
        focused && { borderColor: theme.primary, backgroundColor: theme.primary + '08' }, 
        readOnly && { backgroundColor: theme.surfaceAlt, borderColor: 'transparent' }
      ]}>
        {icon && <Ionicons name={icon as any} size={15} color={readOnly ? theme.textMuted : theme.textSecondary} style={{ marginRight: 8 }} />}
        <TextInput
          style={[styles.fieldInput, { color: theme.textPrimary }, readOnly && { color: theme.textMuted }]}
          value={value}
          onChangeText={onChangeText}
          editable={!readOnly}
          placeholder={placeholder || label}
          placeholderTextColor={theme.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {readOnly && <Ionicons name="lock-closed-outline" size={13} color={theme.textMuted} />}
      </View>
    </View>
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────
function ToggleRow({ label, description, value, onToggle, loading, theme }: {
  label: string; description: string; value: boolean;
  onToggle: (v: boolean) => void; loading?: boolean; theme: any;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>{label}</Text>
        <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>{description}</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: theme.borderLight, true: theme.primary + '80' }}
          thumbColor={value ? theme.primary : '#ccc'}
        />
      )}
    </View>
  );
}

// ─── Action Row ───────────────────────────────────────────────────────────────
function ActionRow({ label, sublabel, icon, onPress, danger, badge, theme }: {
  label: string; sublabel?: string; icon: string; onPress: () => void; danger?: boolean; badge?: string; theme: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable style={[styles.actionRow, { borderTopColor: theme.borderLight }]} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={[styles.actionIconBg, { backgroundColor: theme.surfaceAlt }, danger && { backgroundColor: theme.error + '18' }]}>
          <Ionicons name={icon as any} size={17} color={danger ? theme.error : theme.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionLabel, { color: theme.textPrimary }, danger && { color: theme.error }]}>{label}</Text>
          {sublabel && <Text style={[styles.actionSublabel, { color: theme.textMuted }]}>{sublabel}</Text>}
        </View>
        {badge && (
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>{badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={15} color={danger ? theme.error + '80' : theme.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { user, setUser, clearUser } = useAuthStore();
  const { theme, isDark } = useTheme();

  const [name, setName] = useState(user?.username || '');
  const [location, setLocation] = useState(user?.location || '');
  const [originalName, setOriginalName] = useState(user?.username || '');
  const [originalLocation, setOriginalLocation] = useState(user?.location || '');

  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [aiPricingEnabled, setAiPricingEnabled] = useState(false);
  const [aiPricingLoading, setAiPricingLoading] = useState(false);

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: true,
    dataSharing: true,
    analytics: true,
    emailNotifications: true,
    marketingEmails: false,
  });
  const [isPrivacyLoading, setIsPrivacyLoading] = useState(false);
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);

  // ── Change Password Modal state ─────────────────────────────────
  type PwdStep = 'idle' | 'sending' | 'otp' | 'newpwd' | 'done';
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [pwdStep, setPwdStep] = useState<PwdStep>('idle');
  const [pwdOtpId, setPwdOtpId] = useState('');
  const [pwdOtp, setPwdOtp] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdShowNew, setPwdShowNew] = useState(false);
  const [pwdShowConfirm, setPwdShowConfirm] = useState(false);

  const openChangePwdModal = () => {
    setPwdStep('idle');
    setPwdOtp('');
    setPwdNew('');
    setPwdConfirm('');
    setPwdError('');
    setPwdModalVisible(true);
  };

  const handleSendPwdOtp = async () => {
    setPwdLoading(true);
    setPwdError('');
    try {
      const res = await sendPasswordChangeOtp();
      setPwdOtpId(res.otpId || '');
      setPwdStep('otp');
    } catch (e: any) {
      setPwdError(e?.message || 'Failed to send OTP. Try again.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleVerifyAndChange = async () => {
    if (pwdOtp.trim().length !== 6) {
      setPwdError('Please enter the 6-digit OTP from your email.');
      return;
    }
    if (!pwdNew.trim() || pwdNew.length < 8) {
      setPwdError('Password must be at least 8 characters.');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdError('Passwords do not match.');
      return;
    }
    setPwdLoading(true);
    setPwdError('');
    try {
      await changePassword(pwdOtpId, pwdOtp.trim(), pwdNew.trim());
      setPwdStep('done');
    } catch (e: any) {
      setPwdError(e?.message || 'Incorrect OTP or request expired. Try again.');
    } finally {
      setPwdLoading(false);
    }
  };

  const headerAnim = useRef(new Animated.Value(0)).current;

  const hasChanges = name !== originalName || location !== originalLocation;
  const provider = getProviderLabel(user?.provider);
  const isOAuthUser = user?.provider && user.provider !== 'local';
  const avatarUri = getUserAvatar(user);

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    getUserProfile().then(data => {
      if (data) {
        const next = mergeUser(user, data);
        const resolvedId = next.id || user?.id || '';
        setUser({
          id: resolvedId,
          username: next.name || next.username || user?.username || '',
          email: next.email ?? user?.email ?? '',
          phone: next.phone ?? user?.phone ?? null,
          location: next.location ?? user?.location ?? null,
          provider: next.provider ?? user?.provider ?? 'local',
          profilePicture: next.avatar_url ?? next.profilePicture ?? user?.profilePicture ?? null,
          preferredLanguage: next.preferredLanguage ?? user?.preferredLanguage ?? 'en',
          createdAt: next.createdAt ?? user?.createdAt ?? '',
        });
        setName(next.name || next.username || '');
        setOriginalName(next.name || next.username || '');
        setLocation(next.location || '');
        setOriginalLocation(next.location || '');
        setAvatarFailed(false);
      }
    }).catch(() => { });

    getSettings()
      .then(d => setAiPricingEnabled(d.aiPricingEnabled ?? false))
      .catch(() => { });

    getPrivacySettings()
      .then(d => {
        if (d && Object.keys(d).length > 0) setPrivacySettings(d);
      })
      .catch(() => { });
  }, []);

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    try {
      const updated = await updateUserProfile({ name, username: name, location });
      const next = mergeUser(user, updated || { name, username: name, location });
      setUser({
        id: next.id ?? user?.id ?? '',
        username: next.name || next.username || user?.username || '',
        email: next.email ?? user?.email ?? '',
        phone: next.phone ?? user?.phone ?? null,
        location: next.location ?? user?.location ?? null,
        provider: next.provider ?? user?.provider ?? 'local',
        profilePicture: next.avatar_url ?? next.profilePicture ?? user?.profilePicture ?? null,
        preferredLanguage: next.preferredLanguage ?? user?.preferredLanguage ?? 'en',
        createdAt: next.createdAt ?? user?.createdAt ?? '',
      });
      setOriginalName(name);
      setOriginalLocation(location);
      Alert.alert('✅ Saved', 'Your profile has been updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiPricingToggle = async (val: boolean) => {
    setAiPricingLoading(true);
    try {
      await updateSettings({ aiPricingEnabled: val });
      setAiPricingEnabled(val);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update.');
    } finally {
      setAiPricingLoading(false);
    }
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const doLogout = async () => {
    setIsLoggingOut(true);
    try { await logout(); } catch { }
    clearUser();
    router.replace('/(auth)/login');
  };

  const handleChangePassword = () => {
    if (isOAuthUser) {
      Alert.alert('Not Available', `Password change is not available for ${provider.label} accounts.`);
      return;
    }
    openChangePwdModal();
  };

  const handlePrivacyToggle = async (key: string, val: boolean) => {
    setIsPrivacyLoading(true);
    const nextSettings = { ...privacySettings, [key as keyof typeof privacySettings]: val };
    setPrivacySettings(nextSettings);
    try {
      await updatePrivacySettings(nextSettings);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update privacy settings.');
      setPrivacySettings({ ...privacySettings, [key as keyof typeof privacySettings]: !val });
    } finally {
      setIsPrivacyLoading(false);
    }
  };

  const handleExportData = () => {
    Alert.alert('Export Data', 'Your historical data export link will be generated.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Export JSON', onPress: () => Alert.alert('Exporting', 'Your data is being prepared and will be downloaded shortly.') },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>

      {/* ── Hero Header ───────────────────────────────────────── */}
      <View style={[styles.heroWrapper, { backgroundColor: theme.surface, shadowColor: theme.primary }]}>
        <ImageBackground
          source={require('assets/images/Profile_page.png')}
          style={styles.hero}
          imageStyle={{ opacity: 0.9 }}
        >
          <View style={styles.heroOverlay} />
          <View style={styles.heroBubble1} />
          <View style={styles.heroBubble2} />

          <Animated.View style={[styles.heroContent, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
            {/* Avatar — centred */}
            <View style={styles.avatarRing}>
              {!avatarFailed && avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarImg}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <LinearGradient colors={['#4ade80', '#16a34a']} style={styles.avatarImg}>
                  <Text style={styles.avatarInitials}>{getInitials(user)}</Text>
                </LinearGradient>
              )}
              <View style={styles.onlineDot} />
            </View>

            {/* Name, email & badges below avatar */}
            <Text style={styles.heroName} numberOfLines={1}>{user?.username || 'Kisan'}</Text>
            <Text style={styles.heroEmail} numberOfLines={1}>{user?.email || ''}</Text>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <Ionicons name={provider.icon as any} size={10} color="#fff" />
                <Text style={styles.heroBadgeText}>{provider.label}</Text>
              </View>
              <View style={styles.heroBadge}>
                <Ionicons name="time-outline" size={10} color="#fff" />
                <Text style={styles.heroBadgeText}>{getAccountAge(user?.createdAt)}</Text>
              </View>
              {user?.location && (
                <View style={styles.heroBadge}>
                  <Ionicons name="location-outline" size={10} color="#fff" />
                  <Text style={styles.heroBadgeText}>{user.location}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </ImageBackground>
      </View>

      {/* ── Scrollable Body ───────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={hideTabBar}
        onScrollEndDrag={showTabBar}
        onMomentumScrollBegin={hideTabBar}
        onMomentumScrollEnd={showTabBar}
        scrollEventThrottle={16}
      >

        {/* Profile Info */}
        <SectionCard title="Account Settings" icon="person-outline" color={theme.primary} theme={theme}>
          <FieldRow label="Full Name" value={name} onChangeText={setName} placeholder="Enter your full name" icon="person-outline" theme={theme} />
          <FieldRow label="Email Address" value={user?.email || ''} readOnly icon="mail-outline" theme={theme} />
          <FieldRow label="Phone Number" value={user?.phone || 'Not provided'} readOnly icon="call-outline" theme={theme} />
          <FieldRow label="Village / City" value={location} onChangeText={setLocation} placeholder="e.g. Balasore, Odisha" icon="location-outline" theme={theme} />

          <ActionRow
            label="Language Preferences"
            sublabel={user?.preferredLanguage || 'English'}
            icon="language-outline"
            onPress={() => Alert.alert('Language', 'Language selection coming soon!')}
            theme={theme}
          />

          {hasChanges && (
            <View style={[styles.unsavedBanner, { backgroundColor: isDark ? '#3D2B1A' : '#FEF3C7' }]}>
              <Ionicons name="alert-circle-outline" size={15} color={isDark ? '#F59E0B' : '#92400e'} />
              <Text style={[styles.unsavedText, { color: isDark ? '#F59E0B' : '#92400e' }]}>Unsaved changes</Text>
              <Pressable onPress={() => { setName(originalName); setLocation(originalLocation); }}>
                <Text style={[styles.discardText, { color: isDark ? '#FCD34D' : '#b45309' }]}>Discard</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={[styles.saveBtn, (!hasChanges || isSaving) && { opacity: 0.4 }]}
            onPress={handleSave}
            disabled={!hasChanges || isSaving}
          >
            <LinearGradient colors={['#1A6B3C', '#2D9B5A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtnGrad}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={17} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </SectionCard>

        {/* Security */}
        <SectionCard title="Security" icon="lock-closed-outline" color="#3b82f6" theme={theme}>
          <ActionRow
            label="Change Password"
            sublabel={isOAuthUser ? `Managed by ${provider.label}` : 'Send reset link to your email'}
            icon="key-outline"
            onPress={handleChangePassword}
            theme={theme}
          />
        </SectionCard>

        {/* AI Settings */}
        <SectionCard title="AI Settings" icon="sparkles-outline" color="#a855f7" theme={theme}>
          <ToggleRow
            label="AI Pipeline Control"
            description="Enable automated AI analysis when syncing data from your Agni soil sensor."
            value={aiPricingEnabled}
            onToggle={handleAiPricingToggle}
            loading={aiPricingLoading}
            theme={theme}
          />
        </SectionCard>

        {/* Privacy & Data Settings */}
        <SectionCard title="Privacy & Data Settings" icon="shield-checkmark-outline" color="#10b981" theme={theme}>
          <ActionRow
            label="Manage Privacy & Data"
            sublabel="Visibility, sharing, analytics, and emails"
            icon="options-outline"
            onPress={() => setPrivacyModalVisible(true)}
            theme={theme}
          />
        </SectionCard>

        {/* Data Management */}
        <SectionCard title="Data Management" icon="folder-open-outline" color="#8b5cf6" theme={theme}>
          <ActionRow
            label="Export Historical Data"
            sublabel="Download your soil tests as JSON or CSV"
            icon="download-outline"
            onPress={handleExportData}
            theme={theme}
          />
        </SectionCard>

        {/* Quick Links */}
        <SectionCard title="Quick Links" icon="apps-outline" color="#f59e0b" theme={theme}>
          <ActionRow label="App Settings" sublabel="Notifications, language, theme" icon="settings-outline" onPress={() => router.push('/(app)/settings')} theme={theme} />
          <ActionRow label="Chat History" sublabel="View past AI conversations" icon="chatbubbles-outline" onPress={() => router.push('/(app)/chat-history')} theme={theme} />
          <ActionRow label="Buy Agni Device" sublabel="Get your soil sensor" icon="cart-outline" onPress={() => router.push('/(app)/buy-agni')} badge="New" theme={theme} />
          <ActionRow label="About Saathi AI" sublabel="Version & legal info" icon="information-circle-outline" onPress={() => router.push('/(app)/about')} theme={theme} />
        </SectionCard>

        {/* Danger zone */}
        <SectionCard title="Account Actions" icon="warning-outline" color={theme.error} theme={theme}>
          <ActionRow
            label="Log Out"
            sublabel="You can log back in anytime"
            icon="log-out-outline"
            onPress={handleLogout}
            danger
            theme={theme}
          />
        </SectionCard>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>Saathi AI · Farmer First Technology</Text>
          <Text style={[styles.footerSub, { color: theme.textMuted + '99' }]}>
            {'Farmer ID: '}
            {user?.id
              ? String(user.id).length > 12
                ? String(user.id).slice(0, 6) + '···' + String(user.id).slice(-4)
                : String(user.id)
              : 'Loading...'}
            {'  ·  Joined '}
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
              : '—'}
          </Text>
        </View>

        <View style={{ height: 85 }} />
      </ScrollView>

      {/* ── Logout Confirmation Modal ─────────────────────────── */}
      <Modal
        visible={logoutModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => { if (!isLoggingOut) setLogoutModalVisible(false); }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => { if (!isLoggingOut) setLogoutModalVisible(false); }}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.surface, paddingBottom: Platform.OS === 'ios' ? 48 : 28 }]}>
            {/* Icon */}
            <View style={{ alignItems:'center', marginBottom:18 }}>
              <LinearGradient colors={isDark ? ['#3D1A1A', '#2D1A1A'] : ['#fee2e2','#fecaca']} style={{ width:72, height:72, borderRadius:36, alignItems:'center', justifyContent:'center', marginBottom:14 }}>
                <Ionicons name="log-out-outline" size={32} color={isDark ? '#F87171' : "#dc2626"} />
              </LinearGradient>
              <Text style={{ fontFamily:'Sora_800ExtraBold', fontSize:20, color: theme.textPrimary, textAlign:'center', marginBottom:8 }}>Logging out?</Text>
              <Text style={{ fontFamily:'Sora_400Regular', fontSize:13, color: theme.textSecondary, textAlign:'center', lineHeight:20, paddingHorizontal:12 }}>
                {`Hey ${user?.username?.split(' ')[0] || 'Farmer'}, your soil data and crop history are safe.\nCome back anytime! 🌾`}
              </Text>
            </View>

            {/* User info strip */}
            <View style={{ flexDirection:'row', alignItems:'center', gap:10, backgroundColor: theme.background, borderRadius:14, padding:13, marginBottom:22, borderWidth:1, borderColor: theme.borderLight }}>
              <View style={{ width:40, height:40, borderRadius:20, backgroundColor: theme.primary, alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontFamily:'Sora_700Bold', fontSize:16, color:'#fff' }}>{getInitials(user)}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontFamily:'Sora_700Bold', fontSize:13, color: theme.textPrimary }}>{user?.username || 'Kisan'}</Text>
                <Text style={{ fontFamily:'Sora_400Regular', fontSize:11, color: theme.textMuted }}>{user?.email || ''}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={theme.success} />
            </View>

            {/* Buttons */}
            <Pressable onPress={doLogout} disabled={isLoggingOut}
              style={{ borderRadius:14, overflow:'hidden', marginBottom:10, opacity: isLoggingOut ? 0.7 : 1 }}>
              <LinearGradient colors={['#dc2626','#ef4444']} start={{x:0,y:0}} end={{x:1,y:0}}
                style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:15, borderRadius:14 }}>
                {isLoggingOut
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Ionicons name="log-out-outline" size={18} color="#fff" /><Text style={{ fontFamily:'Sora_700Bold', fontSize:15, color:'#fff' }}>Yes, Log Out</Text></>}
              </LinearGradient>
            </Pressable>

            <Pressable onPress={() => setLogoutModalVisible(false)} disabled={isLoggingOut}
              style={{ paddingVertical:14, borderRadius:14, alignItems:'center', borderWidth:1.5, borderColor: theme.borderLight, backgroundColor: theme.surface }}>
              <Text style={{ fontFamily:'Sora_700Bold', fontSize:15, color: theme.primary }}>Stay Logged In</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Change Password Modal ─────────────────────────────── */}
      <Modal
        visible={pwdModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => { if (!pwdLoading) setPwdModalVisible(false); }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => { if (!pwdLoading) setPwdModalVisible(false); }}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.surface, paddingBottom: Platform.OS === 'ios' ? 48 : 28 }]}>

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#3b82f618', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="lock-closed-outline" size={17} color="#3b82f6" />
                </View>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Change Password</Text>
              </View>
              <Pressable onPress={() => { if (!pwdLoading) setPwdModalVisible(false); }} style={[styles.closeBtn, { backgroundColor: theme.surfaceAlt }]}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">

              {/* ── IDLE: Intro step ── */}
              {pwdStep === 'idle' && (
                <View style={{ alignItems: 'center', paddingVertical: 24, gap: 16 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#3b82f618', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="mail-outline" size={30} color="#3b82f6" />
                  </View>
                  <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 17, color: theme.textPrimary, textAlign: 'center' }}>Verify Your Identity</Text>
                  <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 13, color: theme.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                    We'll send a 6-digit OTP to{' '}
                    <Text style={{ fontFamily: 'Sora_700Bold', color: theme.textPrimary }}>{user?.email}</Text>
                    {' '}to confirm it's you.
                  </Text>
                  {pwdError ? <Text style={styles.pwdError}>{pwdError}</Text> : null}
                  <Pressable
                    style={[styles.pwdBtn, pwdLoading && { opacity: 0.6 }]}
                    onPress={handleSendPwdOtp}
                    disabled={pwdLoading}
                  >
                    {pwdLoading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.pwdBtnText}>Send OTP to Email →</Text>}
                  </Pressable>
                </View>
              )}

              {/* ── OTP + NEW PASSWORD step ── */}
              {pwdStep === 'otp' && (
                <View style={{ paddingVertical: 8, gap: 4 }}>
                  <View style={{ backgroundColor: isDark ? '#1A4D2E' : '#f0fdf4', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
                    <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: theme.primary, flex: 1 }}>
                      OTP sent to <Text style={{ fontFamily: 'Sora_700Bold' }}>{user?.email}</Text>
                    </Text>
                  </View>
                  <View style={{ backgroundColor: isDark ? '#5F4D1E' : '#fffbeb', borderRadius: 10, padding: 10, marginBottom: 16, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <Ionicons name="warning-outline" size={14} color={isDark ? '#FCD34D' : "#f59e0b"} style={{ marginTop: 1 }} />
                    <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 11, color: isDark ? '#FCD34D' : '#92400e', flex: 1, lineHeight: 16 }}>
                      {'Didn\'t receive it? Check your '}
                      <Text style={{ fontFamily: 'Sora_700Bold' }}>Spam / Junk folder</Text>
                      {'. OTP expires in 10 minutes.'}
                    </Text>
                  </View>

                  <Text style={[styles.pwdLabel, { color: theme.textSecondary }]}>6-DIGIT OTP FROM EMAIL</Text>
                  <TextInput
                    style={[styles.pwdInput, { backgroundColor: theme.background, borderColor: theme.borderLight, color: theme.textPrimary }]}
                    value={pwdOtp}
                    onChangeText={t => { setPwdOtp(t.replace(/[^0-9]/g, '')); setPwdError(''); }}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                  />

                  <Text style={[styles.pwdLabel, { color: theme.textSecondary, marginTop: 8 }]}>NEW PASSWORD</Text>
                  <View style={[styles.pwdInputRow, { backgroundColor: theme.background, borderColor: theme.borderLight }]}>
                    <TextInput
                      style={[styles.pwdInput, { backgroundColor: 'transparent', borderWidth: 0, flex: 1, marginBottom: 0, color: theme.textPrimary }]}
                      value={pwdNew}
                      onChangeText={t => { setPwdNew(t); setPwdError(''); }}
                      placeholder="Min 8 characters"
                      placeholderTextColor={theme.textMuted}
                      secureTextEntry={!pwdShowNew}
                    />
                    <Pressable onPress={() => setPwdShowNew(v => !v)} style={styles.eyeBtn}>
                      <Ionicons name={pwdShowNew ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
                    </Pressable>
                  </View>

                  <Text style={[styles.pwdLabel, { color: theme.textSecondary, marginTop: 8 }]}>CONFIRM PASSWORD</Text>
                  <View style={[styles.pwdInputRow, { backgroundColor: theme.background, borderColor: theme.borderLight }]}>
                    <TextInput
                      style={[styles.pwdInput, { backgroundColor: 'transparent', borderWidth: 0, flex: 1, marginBottom: 0, color: theme.textPrimary }]}
                      value={pwdConfirm}
                      onChangeText={t => { setPwdConfirm(t); setPwdError(''); }}
                      placeholder="Repeat new password"
                      placeholderTextColor={theme.textMuted}
                      secureTextEntry={!pwdShowConfirm}
                    />
                    <Pressable onPress={() => setPwdShowConfirm(v => !v)} style={styles.eyeBtn}>
                      <Ionicons name={pwdShowConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
                    </Pressable>
                  </View>

                  {/* strength hint */}
                  {pwdNew.length > 0 && (
                    <View style={{ flexDirection: 'row', gap: 4, marginTop: 4, marginBottom: 4 }}>
                      {[1,2,3,4].map(i => (
                        <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor:
                          pwdNew.length >= i * 3 ? (pwdNew.length >= 10 ? theme.primary : '#f59e0b') : theme.borderLight
                        }} />
                      ))}
                    </View>
                  )}

                  {pwdError ? <Text style={styles.pwdError}>{pwdError}</Text> : null}

                  <Pressable
                    style={[styles.pwdBtn, { marginTop: 12 }, pwdLoading && { opacity: 0.6 }]}
                    onPress={handleVerifyAndChange}
                    disabled={pwdLoading}
                  >
                    {pwdLoading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.pwdBtnText}>Change Password ✓</Text>}
                  </Pressable>

                  <Pressable onPress={handleSendPwdOtp} style={{ alignSelf: 'center', marginTop: 12 }} disabled={pwdLoading}>
                    <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 12, color: theme.primary }}>Resend OTP</Text>
                  </Pressable>
                </View>
              )}

              {/* ── SUCCESS ── */}
              {pwdStep === 'done' && (
                <View style={{ alignItems: 'center', paddingVertical: 32, gap: 16 }}>
                  <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: isDark ? '#1A4D2E' : '#f0fdf4', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="checkmark-circle" size={44} color={theme.primary} />
                  </View>
                  <Text style={{ fontFamily: 'Sora_800ExtraBold', fontSize: 20, color: theme.textPrimary }}>Password Changed!</Text>
                  <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 13, color: theme.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                    Your password has been updated successfully. Use your new password next time you log in.
                  </Text>
                  <Pressable
                    style={[styles.pwdBtn, { backgroundColor: theme.primary }]}
                    onPress={() => setPwdModalVisible(false)}
                  >
                    <Text style={styles.pwdBtnText}>Done ✓</Text>
                  </Pressable>
                </View>
              )}

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Privacy Settings Modal ─────────────────────────────── */}
      <Modal
        visible={isPrivacyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPrivacyModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Privacy & Data Settings</Text>
              <Pressable onPress={() => setPrivacyModalVisible(false)} style={[styles.closeBtn, { backgroundColor: theme.surfaceAlt }]}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <ToggleRow
                label="Profile Visibility"
                description="Allow other farmers to see your profile."
                value={privacySettings.profileVisibility}
                onToggle={(val) => handlePrivacyToggle('profileVisibility', val)}
                theme={theme}
              />
              <ToggleRow
                label="Data Sharing"
                description="Share anonymized crop data to improve local models."
                value={privacySettings.dataSharing}
                onToggle={(val) => handlePrivacyToggle('dataSharing', val)}
                theme={theme}
              />
              <ToggleRow
                label="Analytics Tracking"
                description="Help us improve by sending app usage data."
                value={privacySettings.analytics}
                onToggle={(val) => handlePrivacyToggle('analytics', val)}
                theme={theme}
              />
              <ToggleRow
                label="Email Notifications"
                description="Receive important account updates."
                value={privacySettings.emailNotifications}
                onToggle={(val) => handlePrivacyToggle('emailNotifications', val)}
                theme={theme}
              />
              <ToggleRow
                label="Marketing Emails"
                description="Receive offers and news from Saathi AI."
                value={privacySettings.marketingEmails}
                onToggle={(val) => handlePrivacyToggle('marketingEmails', val)}
                theme={theme}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Hero
  heroWrapper: {
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
    zIndex: 10,
  },
  hero: {
    paddingTop: Platform.OS === 'ios' ? 52 : 32,
    paddingBottom: 20,
    marginTop: 2,
    paddingHorizontal: 20,
    overflow: 'hidden',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  heroBubble1: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#ffffff09', top: -50, right: -30,
  },
  heroBubble2: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#ffffff07', bottom: -20, left: 10,
  },
  heroContent: { alignItems: 'center' },

  avatarRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 2.5, borderColor: '#ffffff44',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarImg: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontFamily: 'Sora_800ExtraBold', fontSize: 24, color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#4ade80',
    borderWidth: 2, borderColor: '#1A6B3C',
  },

  heroName: { 
    fontFamily: 'Sora_800ExtraBold', 
    fontSize: 20, 
    color: '#fff', 
    marginBottom: 2, 
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroEmail: { 
    fontFamily: 'Sora_400Regular', 
    fontSize: 12, 
    color: '#ffffffcc', 
    marginBottom: 12, 
    textAlign: 'center' 
  },
  heroBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroBadgeText: { fontFamily: 'Sora_600SemiBold', fontSize: 10, color: '#fff' },

  // Scroll body
  scroll: { paddingHorizontal: 16, paddingTop: 20 },

  // Cards
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardIconBg: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: 'Sora_700Bold', fontSize: 15 },

  // Fields
  fieldRow: { marginBottom: 6 },
  fieldLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 10, marginBottom: 5, letterSpacing: 0.3 },
  fieldInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1.5,
  },
  fieldInput: { 
    flex: 1, 
    fontFamily: 'Sora_400Regular', 
    fontSize: 14, 
    paddingVertical: Platform.OS === 'ios' ? 0 : 2,
  },

  // Unsaved banner
  unsavedBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10,
    padding: 10, marginBottom: 12, gap: 8,
  },
  unsavedText: { fontFamily: 'Sora_400Regular', fontSize: 12, flex: 1 },
  discardText: { fontFamily: 'Sora_700Bold', fontSize: 12 },

  // Save button
  saveBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  saveBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 8,
  },
  saveBtnText: { fontFamily: 'Sora_700Bold', fontSize: 14, color: '#fff' },

  // Toggles
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  toggleLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 14, marginBottom: 2 },
  toggleDesc: { fontFamily: 'Sora_400Regular', fontSize: 12, lineHeight: 18 },

  // Action rows
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 12,
    borderTopWidth: 1,
  },
  actionIconBg: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 14 },
  actionSublabel: { fontFamily: 'Sora_400Regular', fontSize: 11, marginTop: 1 },
  actionBadge: {
    backgroundColor: '#f59e0b20', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1, borderColor: '#f59e0b40',
  },
  actionBadgeText: { fontFamily: 'Sora_700Bold', fontSize: 10, color: '#f59e0b' },

  // Footer
  footer: { alignItems: 'center', paddingVertical: 16, gap: 4 },
  footerText: { fontFamily: 'Sora_600SemiBold', fontSize: 12 },
  footerSub: { fontFamily: 'Sora_400Regular', fontSize: 10 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 18,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },

  // Change Password modal
  pwdLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  pwdInput: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    marginBottom: 4,
  },
  pwdInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    marginBottom: 4,
    paddingRight: 4,
  },
  eyeBtn: {
    padding: 10,
  },
  pwdBtn: {
    height: 52,
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  pwdBtnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 15,
    color: '#fff',
  },
  pwdError: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
