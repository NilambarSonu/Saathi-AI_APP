import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Spacing } from '../constants/Spacing';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';

export default function SettingsScreen() {
  const router = useRouter();
  const { clearUser } = useAuthStore();
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [notifsEnabled, setNotifsEnabled] = useState(true);
  const [autoUpdate, setAutoUpdate] = useState(true);

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you absolutely sure? This action cannot be undone and will erase all your soil data.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete My Account", 
          style: "destructive",
          onPress: () => {
            // Mock delete
            clearUser();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert("Cache Cleared", "Local temporary files have been removed.");
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const ToggleItem = ({ icon, title, value, onValueChange }: any) => (
    <View style={styles.itemRow}>
      <View style={styles.itemLeft}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={20} color={Colors.primary} />
        </View>
        <Text style={styles.itemTitle}>{title}</Text>
      </View>
      <Switch 
        value={value} 
        onValueChange={onValueChange} 
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor="#FFF"
      />
    </View>
  );

  const ActionItem = ({ icon, title, subtitle, onPress, destructive }: any) => (
    <Pressable style={styles.itemRow} onPress={onPress}>
      <View style={styles.itemLeft}>
        <View style={[styles.iconBox, destructive && { backgroundColor: '#FFEBEE' }]}>
          <Ionicons name={icon} size={20} color={destructive ? Colors.error : Colors.primary} />
        </View>
        <View>
          <Text style={[styles.itemTitle, destructive && { color: Colors.error }]}>{title}</Text>
          {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Appearance" />
        <View style={styles.card}>
          <ToggleItem icon="moon-outline" title="Dark Mode" value={isDarkMode} onValueChange={setIsDarkMode} />
          <View style={styles.divider} />
          <ToggleItem icon="list-outline" title="Compact Layout" value={isCompact} onValueChange={setIsCompact} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Preferences" />
        <View style={styles.card}>
          <ActionItem icon="language-outline" title="Language" subtitle="English (US)" />
          <View style={styles.divider} />
          <ActionItem icon="globe-outline" title="Region & Units" subtitle="India (Metric)" />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Data & Notifications" />
        <View style={styles.card}>
          <ToggleItem icon="cloud-upload-outline" title="Background Sync" value={syncEnabled} onValueChange={setSyncEnabled} />
          <View style={styles.divider} />
          <ToggleItem icon="notifications-outline" title="Push Notifications" value={notifsEnabled} onValueChange={setNotifsEnabled} />
          <View style={styles.divider} />
          <ToggleItem icon="download-outline" title="Auto-download Updates" value={autoUpdate} onValueChange={setAutoUpdate} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Storage" />
        <View style={styles.card}>
          <ActionItem icon="trash-outline" title="Clear Cache" subtitle="24.5 MB used" onPress={handleClearCache} />
        </View>
      </View>

      <View style={[styles.section, { marginBottom: 60 }]}>
        <SectionHeader title="Danger Zone" />
        <View style={styles.card}>
          <ActionItem 
            icon="warning-outline" 
            title="Delete Account" 
            subtitle="Permanently remove all data" 
            destructive 
            onPress={handleDeleteAccount} 
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingTop: 60, paddingHorizontal: Spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl
  },
  backBtn: { padding: 10, marginLeft: -10 },
  title: { fontFamily: 'Sora_800ExtraBold', fontSize: 24, color: Colors.textPrimary },
  
  section: { marginBottom: Spacing.xl },
  sectionHeader: { fontFamily: 'Sora_700Bold', fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.md, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.xl,
    paddingHorizontal: Spacing.lg,
    ...Spacing.shadows.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md
  },
  itemTitle: { fontFamily: 'Sora_600SemiBold', fontSize: 15, color: Colors.textPrimary },
  itemSubtitle: { fontFamily: 'Sora_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  
  divider: { height: 1, backgroundColor: Colors.borderLight }
});
