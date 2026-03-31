import React, { useEffect, useState } from 'react';
import { View, Platform, AppState, AppStateStatus } from 'react-native';
import { Stack, Redirect, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { registerForPushNotifications } from '../../src/core/services/notifications';
import { registerDevice } from '../../src/features/auth/services/auth';
import * as NavigationBar from 'expo-navigation-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AppLayout() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  const router = useRouter();

  // Task 3: Immersive Navigation Bar hiding safely
  useEffect(() => {
    if (Platform.OS === 'android') {
      const hideNavigationBar = async () => {
        try {
          await NavigationBar.setPositionAsync('absolute');
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('overlay-swipe');
        } catch (e) {
          // Ignore
        }
      };

      hideNavigationBar();

      const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          hideNavigationBar();
        }
      });

      const interval = setInterval(hideNavigationBar, 4000); // Polling backup

      return () => {
        subscription.remove();
        clearInterval(interval);
      };
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
      <Stack.Screen name="about" />
      <Stack.Screen name="buy-agni" />
      <Stack.Screen name="chat-history" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
