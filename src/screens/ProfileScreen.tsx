import React, { useState, useEffect } from 'react';
import { hideTabBar, showTabBar } from '@/constants/Animations';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Alert, ActivityIndicator, Switch, Platform, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuthStore } from '@/store/authStore';
import { apiCall } from '@/services/api';
import { logout } from '@/features/auth/services/auth';
import { getUserProfile } from '@/features/auth/services/user';


// ─── Helpers ────────────────────────────────────────────────
function getProviderLabel(provider?: string) {
  if (!provider || provider === 'local') return { label: 'Email', color: Colors.primary };
  if (provider === 'google') return { label: 'Google', color: '#DB4437' };
  if (provider === 'facebook') return { label: 'Facebook', color: '#1877F2' };
  return { label: provider, color: Colors.textSecondary };
}

function getAccountAge(createdAt?: string) {
  if (!createdAt) return 'N/A';
  const diff = Math.ceil(Math.abs(Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (diff < 30) return `${diff} day${diff !== 1 ? 's' : ''}`;
  if (diff < 365) return `${Math.floor(diff / 30)} month${Math.floor(diff / 30) !== 1 ? 's' : ''}`;
  return `${Math.floor(diff / 365)} year${Math.floor(diff / 365) !== 1 ? 's' : ''}`;
}

// ─── Section Card ────────────────────────────────────────────
function SectionCard({ title, icon, color, children }: {
  title: string; icon: string; color: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconBg, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Field Row ───────────────────────────────────────────────
const getFirstName = (user: any): string => {
  const raw = user?.name || user?.username || user?.email?.split('@')[0] || 'Farmer';
  const n = raw.split(/[\s_]+/)[0];
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
};

const getUserAvatar = (u: any): string | null => {
  return u?.avatar_url || u?.profile_image || u?.profile_picture || null;
};

const mergeUser = (base: any, patch: any) => {
  const merged = { ...(base || {}), ...(patch || {}) };
  const fullName = merged?.name || merged?.full_name || merged?.displayName || merged?.username || base?.name || base?.username || '';
  const email = merged?.email || merged?.emailAddress || base?.email || '';
  return {
    ...merged,
    name: fullName,
    username: merged?.username || fullName,
    email,
    avatar_url: merged?.avatar_url || merged?.profile_image || merged?.profile_picture || merged?.picture || null,
    profile_image: merged?.profile_image || merged?.avatar_url || merged?.profile_picture || merged?.picture || null,
    profile_picture: merged?.profile_picture || merged?.avatar_url || merged?.profile_image || merged?.picture || null,
  };
};

function FieldRow({ label, value, onChangeText, readOnly, placeholder }: {
  label: string; value: string; onChangeText?: (v: string) => void;
  readOnly?: boolean; placeholder?: string;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, readOnly && styles.fieldInputReadOnly]}
        value={value}
        onChangeText={onChangeText}
        editable={!readOnly}
        placeholder={placeholder || label}
        placeholderTextColor={Colors.textMuted}
      />
    </View>
  );
}

// ─── Toggle Row ──────────────────────────────────────────────
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
          trackColor={{ false: Colors.borderLight, true: Colors.primary + '70' }}
          thumbColor={value ? Colors.primary : Colors.textMuted}
        />
      )}
    </View>
  );
}

// ─── Action Row ──────────────────────────────────────────────
function ActionRow({ label, icon, onPress, danger }: {
  label: string; icon: string; onPress: () => void; danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={18} color={danger ? Colors.error : Colors.textSecondary} />
      <Text style={[styles.actionLabel, danger && { color: Colors.error }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={danger ? Colors.error : Colors.textMuted} />
    </Pressable>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function AccountScreen() {
  const router = useRouter();
  const { user, setUser, clearUser } = useAuthStore();

  const [name, setName] = useState(user?.name || user?.username || '');
  const [location, setLocation] = useState(user?.location || '');
  const [originalName, setOriginalName] = useState(user?.name || user?.username || '');
  const [originalLocation, setOriginalLocation] = useState(user?.location || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [aiPricingEnabled, setAiPricingEnabled] = useState(false);
  const [aiPricingLoading, setAiPricingLoading] = useState(false);

  const hasChanges = name !== originalName || location !== originalLocation;
  const provider = getProviderLabel(user?.provider);
  const isOAuthUser = user?.provider && user.provider !== 'local';

  useEffect(() => {
    // Fetch User Profile Data
    getUserProfile().then(data => {
      // Safely fold the data into our local state if it exists
      if (data) {
        const nextUser = mergeUser(user, data);
        setUser(nextUser);
        setName(nextUser.name || nextUser.username || '');
        setOriginalName(nextUser.name || nextUser.username || '');
        setLocation(nextUser.location || '');
        setOriginalLocation(nextUser.location || '');
      }
    }).catch(() => {});

    // Fetch AI setting
    apiCall<{ aiPricingEnabled: boolean }>('/settings')
      .then(data => setAiPricingEnabled(data.aiPricingEnabled))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    try {
      // Backend contract: PUT /api/user — update profile fields
      const result = await apiCall<{ user: any }>('/user', {
        method: 'PUT',
        body: JSON.stringify({ name, username: name, location }),
      });
      setUser(mergeUser(user, result?.user || { name, username: name, location }));
      setOriginalName(name);
      setOriginalLocation(location);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiPricingToggle = async (val: boolean) => {
    setAiPricingLoading(true);
    try {
      await apiCall('/settings', {
        method: 'POST',
        body: JSON.stringify({ aiPricingEnabled: val }),
      });
      setAiPricingEnabled(val);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update setting.');
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
          try { await logout(); } catch {}
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
    Alert.alert('Change Password', 'A password reset link will be sent to your email.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send Email', onPress: async () => {
          try {
            await apiCall('/auth/forgot-password', {
              method: 'POST',
              body: JSON.stringify({ email: user?.email }),
            });
            Alert.alert('Email Sent', 'Check your email for the password reset link.');
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to send reset email.');
          }
        }
      },
    ]);
  };

  return (

      <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Account</Text>
        <Text style={styles.headerSub}>Manage your profile and preferences</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={hideTabBar}
        onScrollEndDrag={showTabBar}
        onMomentumScrollBegin={hideTabBar}
        onMomentumScrollEnd={showTabBar}
        scrollEventThrottle={16}
      >

        {/* Profile Avatar Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {getUserAvatar(user) ? (
                <Image source={{ uri: getUserAvatar(user) as string }} style={{ width: 64, height: 64, borderRadius: 32 }} />
              ) : (
                <Image source={{ uri: 'https://ui-avatars.com/api/?background=1A5C35&color=fff&name=' + encodeURIComponent(getFirstName(user)) }} style={{ width: 64, height: 64, borderRadius: 32 }} />
              )}
            </View>
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName}>{user?.name || user?.username || 'User'}</Text>
              <View style={[styles.providerBadge, { backgroundColor: provider.color + '20' }]}>
                <Text style={[styles.providerText, { color: provider.color }]}>{provider.label}</Text>
              </View>
            </View>
            <Text style={styles.profileEmail} numberOfLines={1} ellipsizeMode="tail">{user?.email || 'No email'}</Text>
            {user?.location ? (
              <Text style={styles.profileLocation}>📍 {user.location}</Text>
            ) : null}
          </View>
          <View style={styles.memberBadge}>
            <View style={styles.memberActive}>
              <Text style={styles.memberActiveText}>● Active</Text>
            </View>
            <Text style={styles.memberAge}>Member {getAccountAge(user?.created_at)}</Text>
          </View>
        </View>

        {/* Profile Info */}
        <SectionCard title="Profile Information" icon="person-outline" color={Colors.primary}>
          <FieldRow label="Full Name" value={name} onChangeText={setName} placeholder="Enter your full name" />
          <FieldRow label="Email" value={user?.email || ''} readOnly />
          <FieldRow label="Phone" value={user?.phone || 'Not provided'} readOnly />
          <FieldRow label="Location / City" value={location} onChangeText={setLocation} placeholder="e.g. Balasore, Odisha" />

          {hasChanges && (
            <View style={styles.unsavedBanner}>
              <Ionicons name="alert-circle-outline" size={16} color="#92400e" />
              <Text style={styles.unsavedText}>You have unsaved changes</Text>
              <Pressable onPress={() => { setName(originalName); setLocation(originalLocation); }}>
                <Text style={styles.discardText}>Discard</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={[styles.saveBtn, (!hasChanges || isSaving) && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </Pressable>
        </SectionCard>

        {/* Security */}
        <SectionCard title="Security" icon="lock-closed-outline" color={Colors.blue}>
          <ActionRow
            label="Change Password"
            icon="key-outline"
            onPress={handleChangePassword}
          />
          {isOAuthUser && (
            <Text style={styles.oauthNote}>
              ℹ️ Password change unavailable for {provider.label} accounts.
            </Text>
          )}
        </SectionCard>

        {/* AI Settings */}
        <SectionCard title="AI Settings" icon="sparkles-outline" color={Colors.purple}>
          <ToggleRow
            label="AI Pipeline Control"
            description="Enable or disable automated AI analysis when syncing data from the Agni device."
            value={aiPricingEnabled}
            onToggle={handleAiPricingToggle}
            loading={aiPricingLoading}
          />
        </SectionCard>

        {/* Quick Links */}
        <SectionCard title="Quick Links" icon="apps-outline" color={Colors.amber}>
          <ActionRow label="App Settings" icon="settings-outline" onPress={() => router.push('/(app)/settings')} />
          <ActionRow label="Chat History" icon="chatbubbles-outline" onPress={() => router.push('/(app)/chat-history')} />
          <ActionRow label="Buy Agni Device" icon="cart-outline" onPress={() => router.push('/(app)/buy-agni')} />
          <ActionRow label="About Saathi AI" icon="information-circle-outline" onPress={() => router.push('/(app)/about')} />
        </SectionCard>

        {/* Danger */}
        <SectionCard title="Account Actions" icon="warning-outline" color={Colors.error}>
          <ActionRow label="Log Out" icon="log-out-outline" onPress={handleLogout} danger />
        </SectionCard>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Account ID: {user?.id || 'N/A'}  ·  Joined{' '}
            {user?.created_at
              ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
              : 'N/A'}
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  headerTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 26, color: Colors.textPrimary },
  headerSub: { fontFamily: 'Sora_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 4 },

  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },

  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.xl,
    padding: Spacing.lg,
    ...Spacing.shadows.md,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Sora_800ExtraBold', fontSize: 26, color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#4ade80',
    borderWidth: 2, borderColor: Colors.surface,
  },
  profileInfo: { flex: 1 },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  profileName: { fontFamily: 'Sora_700Bold', fontSize: 17, color: Colors.textPrimary },
  providerBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  providerText: { fontFamily: 'Sora_600SemiBold', fontSize: 10 },
  profileEmail: { fontFamily: 'Sora_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  profileLocation: { fontFamily: 'Sora_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  memberBadge: { alignItems: 'flex-end' },
  memberActive: { backgroundColor: Colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  memberActiveText: { fontFamily: 'Sora_600SemiBold', fontSize: 10, color: Colors.primary },
  memberAge: { fontFamily: 'Sora_400Regular', fontSize: 10, color: Colors.textMuted, marginTop: 4 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.xl,
    padding: Spacing.lg,
    ...Spacing.shadows.sm,
    marginBottom: Spacing.lg,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.md },
  cardIconBg: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: Colors.textPrimary },

  fieldRow: { marginBottom: Spacing.md },
  fieldLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  fieldInput: {
    backgroundColor: Colors.background,
    borderRadius: Spacing.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  fieldInputReadOnly: {
    backgroundColor: Colors.surfaceAlt,
    color: Colors.textMuted,
  },

  unsavedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: Spacing.radius.md,
    padding: 10,
    marginBottom: Spacing.md,
    gap: 8,
  },
  unsavedText: { fontFamily: 'Sora_400Regular', fontSize: 12, color: '#92400e', flex: 1 },
  discardText: { fontFamily: 'Sora_600SemiBold', fontSize: 12, color: '#92400e' },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Spacing.radius.lg,
    paddingVertical: 12,
    gap: 8,
  },
  saveBtnText: { fontFamily: 'Sora_700Bold', fontSize: 14, color: '#fff' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  toggleLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: Colors.textPrimary, marginBottom: 2 },
  toggleDesc: { fontFamily: 'Sora_400Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 10,
  },
  actionLabel: { flex: 1, fontFamily: 'Sora_600SemiBold', fontSize: 14, color: Colors.textSecondary },

  oauthNote: { fontFamily: 'Sora_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 4, marginLeft: 4 },

  footer: { alignItems: 'center', paddingVertical: Spacing.md },
  footerText: { fontFamily: 'Sora_400Regular', fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
});


