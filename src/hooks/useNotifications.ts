import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { 
  registerForPushNotifications, 
  syncPushToken, 
  handleNotificationResponse 
} from '../services/notifications';
import { useAuthStore } from '../store/authStore';

export function useNotifications() {
  const notificationListener = useRef<Notifications.Subscription>(undefined);
  const responseListener = useRef<Notifications.Subscription>(undefined);
  const { user, token: authTokens } = useAuthStore();

  useEffect(() => {
    // Only register if user is logged in
    if (!user || !authTokens) return;

    // 1. Register for push notifications
    const setupNotifications = async () => {
      const token = await registerForPushNotifications();
      if (token) {
        await syncPushToken(token);
      }
    };

    setupNotifications();

    // 2. Handle foreground notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // You can add logic here to update UI state, 
      // like showing an in-app toast or updating a counter
      console.log('[Notifications] Received in foreground:', notification.request.content.title);
    });

    // 3. Handle notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      handleNotificationResponse(response);
    });

    // 4. Check for initial notification (if app was killed)
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        handleNotificationResponse(response);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user, authTokens]);

  return null;
}
