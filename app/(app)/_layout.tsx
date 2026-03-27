import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Dimensions } from 'react-native';
import { Tabs, Redirect, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { registerForPushNotifications } from '../../services/notifications';
import { registerDevice } from '../../services/auth';
import { tabBarY } from '../../constants/Animations';
import * as NavigationBar from 'expo-navigation-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

function TabIcon({ name, color, active }: { name: string; color: string; active?: boolean }) {
  const iconMap: Record<string, any> = {
    index: { icon: 'home-outline', lib: Ionicons },
    connect: { icon: 'hubspot', lib: MaterialCommunityIcons },
    chat: { icon: 'sparkles', lib: Ionicons },
    history: { icon: 'history', lib: MaterialCommunityIcons },
    profile: { icon: 'person-outline', lib: Ionicons },
  };
  const { icon, lib: IconLib } = iconMap[name] || { icon: 'circle', lib: Feather };

  return (
    <View style={{ position: 'relative' }}>
      <IconLib name={icon} size={24} color={color} />
      {active && (
        <View style={{
          position: 'absolute', top: -2, right: -2,
          width: 6, height: 6, borderRadius: 3,
          backgroundColor: '#69e417ff', // Golden Yellow Dot from right image
          borderWidth: 1, borderColor: '#111'
        }} />
      )}
    </View>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: any) {
  const currentRouteName = state.routes[state.index].name;
  if (currentRouteName === 'chat') return null;

  return (
    <Animated.View style={[styles.tabContainer, { transform: [{ translateY: tabBarY }] }]}>
      <BlurView intensity={90} tint="light" style={styles.tabPill}>
        {state.routes.map((route: any, index: number) => {
          if (['about', 'buy-agni', 'chat-history', 'settings'].includes(route.name)) return null;

          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              // Using navigate safely to avoid double-navigation crashes
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={styles.tabItem} activeOpacity={0.8}>
              <View style={[styles.iconBox, isFocused && styles.activeIconBox]}>
                <TabIcon name={route.name} color={isFocused ? '#1A5C35' : '#8A9E8E'} active={isFocused} />
              </View>
              <Text style={[styles.tabLabel, { color: isFocused ? '#1A5C35' : '#8A9E8E' }]}>
                {label === 'index' ? 'HOME' : label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    position: 'absolute',
    bottom: 35, // slightly increased height from bottom as requested
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  tabPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(240, 253, 244, 0.6)', // Pure Liquid Glass (Light Green Tint)
    borderRadius: 35, // reduced from 40 for more compact look
    paddingHorizontal: 8,
    paddingVertical: 4, // reduced from 10
    width: '100%',
    justifyContent: 'space-around',
    borderWidth: 1.5,
    borderColor: 'rgba(167, 243, 208, 0.3)',
    overflow: 'hidden',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconBox: {
    width: 40, // reduced from 48
    height: 40, // reduced from 48
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0, // reduced from 4
    overflow: 'hidden', // Ensures highlight is perfectly round
  },
  activeIconBox: {
    backgroundColor: 'transparent', // removed hover circle/square
    transform: [{ scale: 1.15 }],
  },
  tabLabel: {
    fontSize: 9,
    fontFamily: 'Sora_700Bold',
    letterSpacing: 0.5,
  },
});

export default function AppLayout() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setPositionAsync('absolute');
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('inset-touch');
    }
  }, []);

  useEffect(() => {
    async function setupPushNotifications() {
      if (!user) return;
      try {
        const token = await registerForPushNotifications();
        if (token) {
          await registerDevice({
            expo_push_token: token,
            device_type: Platform.OS as 'ios' | 'android',
            device_name: `${Platform.OS} Device`,
          });
        }
      } catch (err) {
        console.warn('[Push Setup]', err);
      }
    }
    setupPushNotifications();
  }, [user?.id]);

  useEffect(() => {
    async function restorePendingBLEIntent() {
      const hasIntent = await AsyncStorage.getItem('saathi_ble_connect_intent');
      if (hasIntent === '1') {
        router.replace('/(app)/connect');
      }
    }
    restorePendingBLEIntent();
  }, [router]);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          tabBarLabel: 'Connect',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarLabel: 'AI Chat',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarLabel: 'History',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Profile',
        }}
      />

      {/* Hide screens that shouldn't appear in the bottom tab bar */}
      <Tabs.Screen name="about" options={{ href: null }} />
      <Tabs.Screen name="buy-agni" options={{ href: null }} />
      <Tabs.Screen name="chat-history" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
