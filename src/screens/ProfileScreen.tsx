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
import { logout, sendPasswordChangeOtp } from '@/features/auth/services/auth';
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
  if (!provider || provider === 'local') return { label: 'Email', color: Colors.primary, icon: 'mail-outline' };
  if (provider === 'google') return { label: 'Google', color: '#DB4437', icon: 'logo-google' };
  if (provider === 'facebook') return { label: 'Facebook', color: '#1877F2', icon: 'logo-facebook' };
  return { label: provider, color: Colors.textSecondary, icon: 'person-outline' };
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
function SectionCard({ title, icon, color, children }: {
  title: string; icon: string; color: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <LinearGradient colors={[color + '30', color + '10']} style={styles.cardIconBg}>
          <Ionicons name={icon as any} size={17} color={color} />
        </LinearGradient>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Field Row ────────────────────────────────────────────────────────────────
function FieldRow({ label, value, onChangeText, readOnly, placeholder, icon }: {
  label: string; value: string; onChangeText?: (v: string) => void;
  readOnly?: boolean; placeholder?: string; icon?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldInputWrap, focused && styles.fieldInputFocused, readOnly && styles.fieldInputReadOnlyWrap]}>
        {icon && <Ionicons name={icon as any} size={15} color={readOnly ? Colors.textMuted : Colors.textSecondary} style={{ marginRight: 8 }} />}
        <TextInput
          style={[styles.fieldInput, readOnly && styles.fieldInputReadOnly]}
          value={value}
          onChangeText={onChangeText}
          editable={!readOnly}
          placeholder={placeholder || label}
          placeholderTextColor={Colors.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {readOnly && <Ionicons name="lock-closed-outline" size={13} color={Colors.textMuted} />}
      </View>
    </View>
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────
function ToggleRow({ label, description, value, onToggle, loading }: {
  label: string; description: string; value: boolean;
  onToggle: (v: boolean) => void; loading?: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{description}</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={Colors.primary} />
      ) : (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: Colors.borderLight, true: Colors.primary + '80' }}
          thumbColor={value ? Colors.primary : '#ccc'}
        />
      )}
    </View>
  );
}

// ─── Action Row ───────────────────────────────────────────────────────────────
function ActionRow({ label, sublabel, icon, onPress, danger, badge }: {
  label: string; sublabel?: string; icon: string; onPress: () => void; danger?: boolean; badge?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable style={styles.actionRow} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={[styles.actionIconBg, danger && { backgroundColor: Colors.error + '18' }]}>
          <Ionicons name={icon as any} size={17} color={danger ? Colors.error : Colors.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionLabel, danger && { color: Colors.error }]}>{label}</Text>
          {sublabel && <Text style={styles.actionSublabel}>{sublabel}</Text>}
        </View>
        {badge && (
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>{badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={15} color={danger ? Colors.error + '80' : Colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { user, setUser, clearUser } = useAuthStore();

  const [name, setName] = useState(user?.name || user?.username || '');
  const [location, setLocation] = useState(user?.location || '');
  const [originalName, setOriginalName] = useState(user?.name || user?.username || '');
  const [originalLocation, setOriginalLocation] = useState(user?.location || '');

  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
        setUser(next);
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
      setUser(mergeUser(user, updated || { name, username: name, location }));
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
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive', onPress: async () => {
          setIsLoggingOut(true);
          try { await logout(); } catch { }
          clearUser();
          router.replace('/(auth)/login');
        }
      },
    ]);
  };

  const handleChangePassword = () => {
    if (isOAuthUser) {
      Alert.alert('Not Available', `Password change is not available for ${provider.label} accounts.`);
      return;
    }
    Alert.alert('Change Password', 'An OTP will be sent to your email to start the reset process.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send OTP', onPress: async () => {
          try {
            await sendPasswordChangeOtp();
            Alert.alert('📧 OTP Sent', 'Check your inbox. Use the Forgot Password screen to complete the change.');
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to send OTP.');
          }
        }
      },
    ]);
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
    <View style={styles.root}>

      {/* ── Hero Header ───────────────────────────────────────── */}
      <View style={styles.heroWrapper}>
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
            <Text style={styles.heroName} numberOfLines={1}>{user?.name || user?.username || 'Kisan'}</Text>
            <Text style={styles.heroEmail} numberOfLines={1}>{user?.email || ''}</Text>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <Ionicons name={provider.icon as any} size={10} color="#fff" />
                <Text style={styles.heroBadgeText}>{provider.label}</Text>
              </View>
              <View style={styles.heroBadge}>
                <Ionicons name="time-outline" size={10} color="#fff" />
                <Text style={styles.heroBadgeText}>{getAccountAge(user?.created_at)}</Text>
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
        <SectionCard title="Account Settings" icon="person-outline" color={Colors.primary}>
          <FieldRow label="Full Name" value={name} onChangeText={setName} placeholder="Enter your full name" icon="person-outline" />
          <FieldRow label="Email Address" value={user?.email || ''} readOnly icon="mail-outline" />
          <FieldRow label="Phone Number" value={user?.phone || 'Not provided'} readOnly icon="call-outline" />
          <FieldRow label="Village / City" value={location} onChangeText={setLocation} placeholder="e.g. Balasore, Odisha" icon="location-outline" />

          <ActionRow
            label="Language Preferences"
            sublabel={user?.preferredLanguage || 'English'}
            icon="language-outline"
            onPress={() => Alert.alert('Language', 'Language selection coming soon!')}
          />

          {hasChanges && (
            <View style={styles.unsavedBanner}>
              <Ionicons name="alert-circle-outline" size={15} color="#92400e" />
              <Text style={styles.unsavedText}>Unsaved changes</Text>
              <Pressable onPress={() => { setName(originalName); setLocation(originalLocation); }}>
                <Text style={styles.discardText}>Discard</Text>
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
        <SectionCard title="Security" icon="lock-closed-outline" color="#3b82f6">
          <ActionRow
            label="Change Password"
            sublabel={isOAuthUser ? `Managed by ${provider.label}` : 'Send reset link to your email'}
            icon="key-outline"
            onPress={handleChangePassword}
          />
        </SectionCard>

        {/* AI Settings */}
        <SectionCard title="AI Settings" icon="sparkles-outline" color="#a855f7">
          <ToggleRow
            label="AI Pipeline Control"
            description="Enable automated AI analysis when syncing data from your Agni soil sensor."
            value={aiPricingEnabled}
            onToggle={handleAiPricingToggle}
            loading={aiPricingLoading}
          />
        </SectionCard>

        {/* Privacy & Data Settings */}
        <SectionCard title="Privacy & Data Settings" icon="shield-checkmark-outline" color="#10b981">
          <ActionRow
            label="Manage Privacy & Data"
            sublabel="Visibility, sharing, analytics, and emails"
            icon="options-outline"
            onPress={() => setPrivacyModalVisible(true)}
          />
        </SectionCard>

        {/* Data Management */}
        <SectionCard title="Data Management" icon="folder-open-outline" color="#8b5cf6">
          <ActionRow
            label="Export Historical Data"
            sublabel="Download your soil tests as JSON or CSV"
            icon="download-outline"
            onPress={handleExportData}
          />
        </SectionCard>

        {/* Quick Links */}
        <SectionCard title="Quick Links" icon="apps-outline" color="#f59e0b">
          <ActionRow label="App Settings" sublabel="Notifications, language, theme" icon="settings-outline" onPress={() => router.push('/(app)/settings')} />
          <ActionRow label="Chat History" sublabel="View past AI conversations" icon="chatbubbles-outline" onPress={() => router.push('/(app)/chat-history')} />
          <ActionRow label="Buy Agni Device" sublabel="Get your soil sensor" icon="cart-outline" onPress={() => router.push('/(app)/buy-agni')} badge="New" />
          <ActionRow label="About Saathi AI" sublabel="Version & legal info" icon="information-circle-outline" onPress={() => router.push('/(app)/about')} />
        </SectionCard>

        {/* Danger zone */}
        <SectionCard title="Account Actions" icon="warning-outline" color={Colors.error}>
          <ActionRow
            label="Log Out"
            sublabel="You can log back in anytime"
            icon="log-out-outline"
            onPress={handleLogout}
            danger
          />
        </SectionCard>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Saathi AI·Farmer First Technology</Text>
          <Text style={styles.footerSub}>
            ID: {user?.id ? String(user.id).slice(0, 8) + '...' : 'N/A'}  ·  Joined{' '}
            {user?.created_at
              ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
              : 'N/A'}
          </Text>
        </View>

        <View style={{ height: 85 }} />
      </ScrollView>

      {/* Privacy Settings Modal */}
      <Modal
        visible={isPrivacyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPrivacyModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privacy & Data Settings</Text>
              <Pressable onPress={() => setPrivacyModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <ToggleRow
                label="Profile Visibility"
                description="Allow other farmers to see your profile."
                value={privacySettings.profileVisibility}
                onToggle={(val) => handlePrivacyToggle('profileVisibility', val)}
              />
              <ToggleRow
                label="Data Sharing"
                description="Share anonymized crop data to improve local models."
                value={privacySettings.dataSharing}
                onToggle={(val) => handlePrivacyToggle('dataSharing', val)}
              />
              <ToggleRow
                label="Analytics Tracking"
                description="Help us improve by sending app usage data."
                value={privacySettings.analytics}
                onToggle={(val) => handlePrivacyToggle('analytics', val)}
              />
              <ToggleRow
                label="Email Notifications"
                description="Receive important account updates."
                value={privacySettings.emailNotifications}
                onToggle={(val) => handlePrivacyToggle('emailNotifications', val)}
              />
              <ToggleRow
                label="Marketing Emails"
                description="Receive offers and news from Saathi AI."
                value={privacySettings.marketingEmails}
                onToggle={(val) => handlePrivacyToggle('marketingEmails', val)}
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
  root: { flex: 1, backgroundColor: Colors.background },

  // Hero
  heroWrapper: {
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#1A6B3C',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
    backgroundColor: '#fff',
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
    backgroundColor: 'rgba(0, 0, 0, 0.35)', // Dark overlay for text legibility
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
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardIconBg: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: Colors.textPrimary },

  // Fields
  fieldRow: { marginBottom: 6 },
  fieldLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 10, color: Colors.textSecondary, marginBottom: 5, letterSpacing: 0.3 },
  fieldInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1.5, borderColor: Colors.borderLight,
  },
  fieldInputFocused: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  fieldInputReadOnlyWrap: { backgroundColor: Colors.surfaceAlt, borderColor: 'transparent' },
  fieldInput: { 
    flex: 1, 
    fontFamily: 'Sora_400Regular', 
    fontSize: 14, 
    color: Colors.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 0 : 2,
  },
  fieldInputReadOnly: { color: Colors.textMuted },

  // Unsaved banner
  unsavedBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEF3C7', borderRadius: 10,
    padding: 10, marginBottom: 12, gap: 8,
  },
  unsavedText: { fontFamily: 'Sora_400Regular', fontSize: 12, color: '#92400e', flex: 1 },
  discardText: { fontFamily: 'Sora_700Bold', fontSize: 12, color: '#b45309' },

  // Save button
  saveBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  saveBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 8,
  },
  saveBtnText: { fontFamily: 'Sora_700Bold', fontSize: 14, color: '#fff' },

  // Toggles
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  toggleLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: Colors.textPrimary, marginBottom: 2 },
  toggleDesc: { fontFamily: 'Sora_400Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  // Action rows
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 12,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  actionIconBg: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: Colors.textPrimary },
  actionSublabel: { fontFamily: 'Sora_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  actionBadge: {
    backgroundColor: '#f59e0b20', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1, borderColor: '#f59e0b40',
  },
  actionBadgeText: { fontFamily: 'Sora_700Bold', fontSize: 10, color: '#f59e0b' },

  // Footer
  footer: { alignItems: 'center', paddingVertical: 16, gap: 4 },
  footerText: { fontFamily: 'Sora_600SemiBold', fontSize: 12, color: Colors.textMuted },
  footerSub: { fontFamily: 'Sora_400Regular', fontSize: 10, color: Colors.textMuted + '99' },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
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
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 20,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
});
