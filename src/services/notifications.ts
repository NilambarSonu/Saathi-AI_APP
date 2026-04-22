import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  let token = null;

  // Expo Go no longer supports remote push tokens in SDK 53+.
  // In that environment, safely skip registration to prevent runtime errors.
  if (Constants.appOwnership === 'expo') {
    console.log('[Notifications] Skipping push token registration on Expo Go.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A7B3C',
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    'ca28ed31-83c5-4a7b-91e2-11b1794b319c';

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function scheduleSoilAlert(fieldId: string, alertMessage: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Soil Parameter Alert 🔴',
      body: alertMessage,
      data: { screen: 'history', fieldId },
    },
    trigger: null, // Send immediately
  });
}

export async function scheduleMonthlyTestReminder() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time for a soil test! 🌱',
      body: 'It\'s been 30 days since your last scan.',
      data: { screen: 'connect' },
    },
    trigger: { 
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, 
      seconds: 30 * 24 * 60 * 60, 
      repeats: true 
    },
  });
}

export async function scheduleSmartInsight(insightMessage: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'AI Insight 🧠',
      body: insightMessage,
      data: { screen: 'ai-chat' },
    },
    trigger: null,
  });
}

export async function scheduleBatteryAlert() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Agni Battery Low 🔋',
      body: 'Agni device battery low (15%). Please charge before your next scan.',
      data: { screen: 'connect' },
    },
    trigger: null,
  });
}

export async function scheduleSyncCompleteAlert(count: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Sync Complete ✅',
      body: `${count} soil tests synced from Agni device`,
      data: { screen: 'history' },
    },
    trigger: null,
  });
}

import { apiCall } from './api';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  createdAt: string;
}

/**
 * Fetch the current user's notifications from the database
 */
export async function getNotifications(): Promise<AppNotification[]> {
  return apiCall<AppNotification[]>('/notifications');
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(id: string): Promise<void> {
  return apiCall<void>(`/notifications/${id}/read`, { method: 'POST' });
}


