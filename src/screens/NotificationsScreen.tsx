import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { Shadows } from '@/constants/Shadows';
import { Type } from '@/constants/Typography';
import { getNotifications, AppNotification, markNotificationRead, markAllNotificationsRead, NotificationType } from '@/services/notifications';
import Animated, { FadeInUp, FadeInRight, Layout } from 'react-native-reanimated';

const getNotifIcon = (type: NotificationType, theme: any) => {
  switch (type) {
    case 'alert': return { name: 'alert-circle', color: theme.error };
    case 'insight': return { name: 'brain', color: theme.primary };
    case 'reminder': return { name: 'calendar', color: theme.amber };
    case 'battery': return { name: 'battery-alert', color: theme.error };
    case 'sync': return { name: 'sync', color: theme.success };
    default: return { name: 'bell', color: theme.primary };
  }
};

export default function NotificationsScreen() {
  const { theme, isDark } = useTheme();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handlePress = async (item: AppNotification) => {
    if (!item.isRead) {
      try {
        await markNotificationRead(item.id);
        setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
      } catch (e) { }
    }

    // Handle navigation logic
    const { screen, params } = item.data || {};
    if (screen) {
      const path = screen.startsWith('/') ? screen : `/(app)/${screen}`;
      router.push({ pathname: path as any, params });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error('Error marking all as read:', e);
    }
  };

  const renderItem = ({ item, index }: { item: AppNotification; index: number }) => {
    const icon = getNotifIcon(item.type, theme);

    return (
      <Animated.View
        entering={FadeInRight.delay(index * 100).duration(400)}
        layout={Layout.springify()}
      >
        <TouchableOpacity
          style={[
            styles.notifItem, 
            { backgroundColor: theme.surface, borderColor: theme.sep2 },
            !item.isRead && [styles.unreadItem, { backgroundColor: isDark ? theme.fillGreen : '#F0FDF4', borderColor: isDark ? theme.primary : '#DCFCE7' }]
          ]}
          onPress={() => handlePress(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: icon.color + '15' }]}>
            <MaterialCommunityIcons name={icon.name as any} size={22} color={icon.color} />
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.row}>
              <Text style={[styles.title, { color: theme.label1 }, !item.isRead && [styles.unreadText, { color: theme.primary }]]}>{item.title}</Text>
              {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
            </View>
            <Text style={[styles.message, { color: theme.label2 }]} numberOfLines={2}>{item.message}</Text>
            <Text style={[styles.time, { color: theme.label3 }]}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg0 }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg0 }]}>
      <LinearGradient colors={[theme.bg0, theme.bg1]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint={isDark ? "dark" : "light"} style={[styles.header, { borderBottomColor: theme.sep1 }]}>
        <View style={styles.headerInner}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.sep2 }]}>
            <Ionicons name="chevron-back" size={24} color={theme.label1} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.label1 }]}>Notifications</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerAction} onPress={handleMarkAllRead}>
              <MaterialCommunityIcons name="playlist-check" size={22} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerAction} onPress={fetchNotifications}>
              <Feather name="refresh-cw" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchNotifications();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.surface, borderColor: theme.sep1 }]}>
              <Feather name="bell-off" size={48} color={theme.label3} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.label1 }]}>All caught up!</Text>
            <Text style={[styles.emptyText, { color: theme.label3 }]}>You don't have any notifications at the moment.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg0 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg0 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sep1,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: { ...Type.title3, color: Colors.label1, fontFamily: 'Sora_700Bold' },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.sep2 },
  headerAction: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  listContent: { padding: 20, paddingBottom: 100 },
  notifItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.sep2,
    ...Shadows.sm,
  },
  unreadItem: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contentContainer: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { ...Type.headline, color: Colors.label1, fontSize: 15 },
  unreadText: { color: Colors.primary, fontFamily: 'Sora_700Bold' },
  message: { ...Type.subheadline, color: Colors.label2, fontSize: 13, lineHeight: 18 },
  time: { ...Type.caption2, color: Colors.label3, marginTop: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.sep1
  },
  emptyTitle: { ...Type.title3, color: Colors.label1, marginBottom: 8, textAlign: 'center' },
  emptyText: { ...Type.body, color: Colors.label3, textAlign: 'center', lineHeight: 22 },
});
