import { useEffect } from 'react';
import { Tabs, Redirect, useRouter, usePathname, Slot } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { View, Platform, StyleSheet } from 'react-native';
import LiquidGlassTabBar from '../../components/navigation/LiquidGlassTabBar';
import { registerForPushNotifications } from '../../services/notifications';
import { registerDevice } from '../../services/auth';

export const TAB_BAR_BOTTOM_PADDING = 96;

const getActiveTab = (pathname: string): string => {
  if (pathname.includes('dashboard')) return 'dashboard';
  if (pathname.includes('live-connect')) return 'live-connect';
  if (pathname.includes('ai-chat')) return 'ai-chat';
  if (pathname.includes('history')) return 'history';
  if (pathname.includes('account')) return 'account';
  return 'dashboard';
};

export default function AppLayout() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  const pathname = usePathname();
  const router = useRouter();

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

  const activeTab = getActiveTab(pathname);

  const handleTabPress = (tabKey: string) => {
    const routes: Record<string, string> = {
      dashboard: '/(app)/dashboard',
      'live-connect': '/(app)/live-connect',
      'ai-chat': '/(app)/ai-chat',
      history: '/(app)/history',
      account: '/(app)/account',
    };
    router.push(routes[tabKey] as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg1 }}>
      <Slot />
      <LiquidGlassTabBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({});
