import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { apiCall } from './api';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type NotificationType = 'alert' | 'insight' | 'reminder' | 'system' | 'sync' | 'battery';

export interface NotificationData {
  screen?: string;
  params?: Record<string, any>;
  url?: string;
  type?: NotificationType;
  id?: string;
  [key: string]: any;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  type: NotificationType;
  data?: NotificationData;
  createdAt: string;
}

/**
 * Register for push notifications and return the token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[Notifications] Must use physical device for Push Notifications');
    return null;
  }

  // Expo Go workaround
  if (Constants.appOwnership === 'expo') {
    console.log('[Notifications] Skipping push token registration on Expo Go.');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted for push notifications');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    
    if (!projectId) {
      console.warn('[Notifications] EAS Project ID not found in config');
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    // Set up Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1A7B3C',
      });

      await Notifications.setNotificationChannelAsync('alerts', {
        name: 'Soil Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF3B30',
      });
    }

    return token;
  } catch (error) {
    console.error('[Notifications] Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Sync the push token with the backend
 */
export async function syncPushToken(token: string): Promise<void> {
  try {
    await apiCall('/auth/register-device', {
      method: 'POST',
      body: JSON.stringify({
        expo_push_token: token,
        device_type: Platform.OS,
        device_name: Device.modelName || 'Unknown Device',
      }),
    });
    console.log('[Notifications] Push token synced with backend');
  } catch (error) {
    console.error('[Notifications] Failed to sync push token:', error);
  }
}

/**
 * Handle notification tap/response
 */
export async function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as NotificationData;
  const { screen, params, url, id } = data;

  // Mark as read if ID exists
  if (id) {
    markNotificationRead(id).catch(() => {});
  }

  if (url) {
    Linking.openURL(url).catch(() => {});
    return;
  }

  if (screen) {
    const path = screen.startsWith('/') ? screen : `/(app)/${screen}`;
    if (params) {
      router.push({ pathname: path as any, params });
    } else {
      router.push(path as any);
    }
  }
}

/**
 * Schedule a local notification
 */
export async function notifyUser(
  title: string,
  body: string,
  data: NotificationData = {},
  trigger: Notifications.NotificationTriggerInput = null
) {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger,
  });
}

// Domain specific helpers
export const alerts = {
  soil: (fieldId: string, message: string) => 
    notifyUser('Soil Parameter Alert 🔴', message, { screen: 'history', fieldId, type: 'alert' }),
  
  sync: (count: number) => 
    notifyUser('Sync Complete ✅', `${count} soil tests synced from Agni device`, { screen: 'history', type: 'sync' }),
  
  battery: () => 
    notifyUser('Agni Battery Low 🔋', 'Battery low (15%). Please charge soon.', { screen: 'connect', type: 'battery' }),
  
  insight: (message: string) => 
    notifyUser('AI Insight 🧠', message, { screen: 'ai-chat', type: 'insight' }),
};

/**
 * Fetch past notifications
 */
export async function getNotifications(): Promise<AppNotification[]> {
  try {
    return await apiCall<AppNotification[]>('/notifications');
  } catch (error) {
    console.error('[Notifications] Error fetching notifications:', error);
    return [];
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(id: string): Promise<void> {
  return apiCall<void>(`/notifications/${id}/read`, { method: 'POST' });
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsRead(): Promise<void> {
  return apiCall<void>('/notifications/read-all', { method: 'POST' });
}



