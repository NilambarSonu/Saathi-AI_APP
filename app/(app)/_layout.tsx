import React, { useEffect } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { tokenCache } from '@/utils/tokenCache';
import { registerForPushNotifications } from '@/services/notifications';
import { registerDevice } from '@/features/auth/services/auth';
import { useTheme } from '@/context/ThemeContext';

// expo-navigation-bar setVisibilityAsync is safe with edge-to-edge.
// The unsupported APIs (setPositionAsync, setBehaviorAsync) have been removed.
import * as NavigationBar from 'expo-navigation-bar';

export default function AppLayout() {
  const { theme } = useTheme();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  const user = useAuthStore(s => s.user);

  // ── Register the auth-failure handler once.
  // When axiosConfig fails to refresh a token (both access + refresh expired),
  // it calls tokenCache.triggerAuthFailure() which runs this callback.
  // This clears the Zustand store without creating a circular import:
  //   axiosConfig → tokenCache → authStore (via callback, not import)
  useEffect(() => {
    tokenCache.onAuthFailure(() => {
      useAuthStore.getState().clearUser();
    });
  }, []);

  // Hide the Android system navigation bar once.
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

  // ── Wait for Zustand to finish rehydrating from AsyncStorage before
  // deciding whether to redirect.  Without this guard, the layout briefly sees
  // isAuthenticated=false (the store's default) and redirects to login even
  // though the persisted session is valid.
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

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
      <Stack.Screen name="history" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
