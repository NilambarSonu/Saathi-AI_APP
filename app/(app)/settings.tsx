import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Switch, Alert, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/context/ThemeContext';
import apiClient from '@/api/axiosConfig';
import { getUserData } from '@/features/auth/services/user';
import { logout } from '@/features/auth/services/auth';
import * as Sharing from 'expo-sharing';

const SETTINGS_KEY = 'saathi_settings';

const LANGUAGES = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'hi', label: '🇮🇳 हिंदी (Hindi)' },
  { code: 'mr', label: '🇮🇳 मराठी (Marathi)' },
  { code: 'te', label: '🇮🇳 తెలుగు (Telugu)' },
  { code: 'ta', label: '🇮🇳 தமிழ் (Tamil)' },
  { code: 'kn', label: '🇮🇳 ಕನ್ನಡ (Kannada)' },
  { code: 'od', label: '🏳️ ଓଡ଼ିଆ (Odia)' },
];

interface SettingsState {
  language: string;
  autoSync: boolean;
}

function SectionCard({ title, icon, color, children, theme }: {
  title: string; icon: string; color: string; children: React.ReactNode; theme: any;
}) {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconBg, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ToggleRow({ label, description, value, onToggle, theme }: {
  label: string; description?: string; value: boolean; onToggle: (v: boolean) => void; theme: any;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>{label}</Text>
        {description ? <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.border, true: theme.primary + '70' }}
        thumbColor={value ? theme.primary : '#f4f3f4'}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { clearUser } = useAuthStore();
  const { setMode, isDarkMode } = useTheme();
  const theme = Colors.light;
  const isDark = false;
  
  const [settings, setSettings] = useState<SettingsState>({
    language: 'en',
    autoSync: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then(val => {
      if (val) {
        try { 
          const parsed = JSON.parse(val);
          setSettings({
            language: parsed.language || 'en',
            autoSync: parsed.autoSync !== undefined ? parsed.autoSync : true,
          });
        } catch {}
      }
    });
  }, []);

  const saveSettings = (newSettings: SettingsState) => {
    setSettings(newSettings);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  };

  const handleToggle = (key: keyof SettingsState, value: boolean) => {
    saveSettings({ ...settings, [key]: value });
  };

  const handleLanguageChange = (code: string) => {
    saveSettings({ ...settings, language: code });
    setShowLangPicker(false);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await getUserData('json');
      const jsonString = JSON.stringify(data, null, 2);
      if (await Sharing.isAvailableAsync()) {
        Alert.alert(
          'Data Ready',
          `Your data export has ${Object.keys(data).length} records. Sharing now...`
        );
      } else {
        Alert.alert(
          'Export Data',
          `Records: ${jsonString.length > 200 ? jsonString.substring(0, 200) + '...' : jsonString}\n\nVisit saathiai.org/account to download your full data export.`
        );
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e.message || 'Failed to export data. Try visiting saathiai.org/account to download your data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account?',
      'This will permanently delete your account, all soil tests, AI recommendations, and chat history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete My Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await apiClient.delete('/users/me');
              await logout();
              clearUser();
              router.replace('/(auth)/login');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete account.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const selectedLang = LANGUAGES.find(l => l.code === settings.language);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Settings</Text>
        <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Customize your Saathi AI experience</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Appearance */}
        <SectionCard title="Appearance" icon="moon-outline" color={theme.purple} theme={theme}>
          <ToggleRow
            label="Dark Mode"
            description="Switch to dark theme for better low-light visibility"
            value={isDarkMode}
            onToggle={(v) => setMode(v ? 'dark' : 'light')}
            theme={theme}
          />
        </SectionCard>

        {/* Language */}
        <SectionCard title="Language & Region" icon="globe-outline" color={theme.blue} theme={theme}>
          <View style={styles.langSection}>
            <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>Interface Language</Text>
            <Pressable style={[styles.langSelector, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => setShowLangPicker(!showLangPicker)}>
              <Text style={[styles.langSelected, { color: theme.textPrimary }]}>{selectedLang?.label || '🇬🇧 English'}</Text>
              <Ionicons name={showLangPicker ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
            </Pressable>
            {showLangPicker && (
              <View style={[styles.langList, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
                {LANGUAGES.map(lang => (
                  <Pressable
                    key={lang.code}
                    style={[styles.langOption, settings.language === lang.code && [styles.langOptionActive, { backgroundColor: theme.surfaceAlt }]]}
                    onPress={() => handleLanguageChange(lang.code)}
                  >
                    <Text style={[styles.langOptionText, { color: theme.textSecondary }, settings.language === lang.code && [styles.langOptionTextActive, { color: theme.primary }]]}>
                      {lang.label}
                    </Text>
                    {settings.language === lang.code && (
                      <Ionicons name="checkmark" size={16} color={theme.primary} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </SectionCard>

        {/* Sync & Storage */}
        <SectionCard title="Sync & Storage" icon="phone-portrait-outline" color={theme.primary} theme={theme}>
          <ToggleRow
            label="Auto Sync"
            description="Automatically sync soil test data when connected to the internet"
            value={settings.autoSync}
            onToggle={(v) => handleToggle('autoSync', v)}
            theme={theme}
          />
        </SectionCard>

        {/* Data Management */}
        <SectionCard title="Data Management" icon="server-outline" color={theme.amber} theme={theme}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: theme.background, borderColor: theme.border }, isExporting && { opacity: 0.6 }]}
            onPress={handleExportData}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={theme.blue} />
            ) : (
              <Ionicons name="download-outline" size={18} color={theme.blue} />
            )}
            <Text style={[styles.actionBtnText, { color: theme.blue }]}>
              {isExporting ? 'Exporting...' : 'Export All Data (JSON)'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </Pressable>
          <Text style={[styles.actionNote, { color: theme.textMuted }]}>Downloads all your soil tests and AI recommendations as a JSON file.</Text>
        </SectionCard>

        {/* Danger Zone */}
        <View style={[styles.card, styles.dangerCard, { backgroundColor: isDark ? '#2D1A1A' : '#FFF5F5', borderColor: theme.error + '40' }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBg, { backgroundColor: theme.error + '20' }]}>
              <Ionicons name="warning-outline" size={18} color={theme.error} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.error }]}>Danger Zone</Text>
          </View>
          <Text style={[styles.dangerNote, { color: theme.error + 'AA' }]}>Irreversible actions — proceed with caution</Text>
          <View style={styles.dangerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: theme.error }]}>Delete Account</Text>
              <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>Permanently delete your account and all data</Text>
            </View>
            <Pressable
              style={[styles.deleteBtn, { backgroundColor: theme.error }, isDeleting && { opacity: 0.6 }]}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="trash-outline" size={16} color="#fff" />
              )}
              <Text style={styles.deleteBtnText}>{isDeleting ? 'Deleting...' : 'Delete'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 26 },
  headerSub: { fontFamily: 'Sora_400Regular', fontSize: 13, marginTop: 4 },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },

  card: {
    borderRadius: Spacing.radius.xl,
    padding: Spacing.lg,
    ...Spacing.shadows.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.md },
  cardIconBg: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: 'Sora_700Bold', fontSize: 15 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  toggleLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 14, marginBottom: 2 },
  toggleDesc: { fontFamily: 'Sora_400Regular', fontSize: 12, lineHeight: 18 },

  langSection: { gap: 8 },
  langSelector: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: Spacing.radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  langSelected: { fontFamily: 'Sora_600SemiBold', fontSize: 14 },
  langList: {
    borderRadius: Spacing.radius.md,
    borderWidth: 1,
    marginTop: 4, overflow: 'hidden',
  },
  langOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  langOptionActive: {},
  langOptionText: { fontFamily: 'Sora_400Regular', fontSize: 14 },
  langOptionTextActive: { fontFamily: 'Sora_600SemiBold' },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: Spacing.radius.md,
    paddingHorizontal: 12, paddingVertical: 12,
    borderWidth: 1,
  },
  actionBtnText: { flex: 1, fontFamily: 'Sora_600SemiBold', fontSize: 14 },
  actionNote: { fontFamily: 'Sora_400Regular', fontSize: 11, marginTop: 8, paddingLeft: 4 },

  dangerCard: { borderWidth: 1 },
  dangerNote: { fontFamily: 'Sora_400Regular', fontSize: 12, marginBottom: Spacing.md },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: Spacing.radius.md,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  deleteBtnText: { fontFamily: 'Sora_700Bold', fontSize: 13, color: '#fff' },
});
