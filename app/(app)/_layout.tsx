import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { registerForPushNotifications } from '../../src/core/services/notifications';
import { registerDevice } from '../../src/features/auth/services/auth';

// expo-navigation-bar setVisibilityAsync is safe with edge-to-edge.
// The unsupported APIs (setPositionAsync, setBehaviorAsync) have been removed.
import * as NavigationBar from 'expo-navigation-bar';

export default function AppLayout() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);

  // Hide the Android system navigation bar once.
  // setVisibilityAsync is the only NavigationBar call that works in
  // edge-to-edge mode. setPositionAsync / setBehaviorAsync throw WARNs there.
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
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

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="connect" />
      <Stack.Screen name="ai-chat" />
      <Stack.Screen name="about" />
      <Stack.Screen name="buy-agni" />
      <Stack.Screen name="chat-history" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
