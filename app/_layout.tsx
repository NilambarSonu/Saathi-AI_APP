import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, router, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as WebBrowser from 'expo-web-browser';
import { useFonts } from 'expo-font';
import {
  Sora_300Light,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import ErrorBoundary from '@/components/ErrorBoundary';
import { SoilMarkersProvider } from '@/context/SoilMarkersContext';
import { useAuthStore } from '@/store/authStore';
import { checkAuthStatus } from '@/features/auth/services/auth';
import { getStoredAccessToken } from '@/services/api';

SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const navigationRouter = useRouter();
  const [fontsLoaded] = useFonts({
    Sora_300Light,
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    Pacifico_400Regular,
  });

  useEffect(() => {
    async function initializeApp() {
      try {
        const user = await checkAuthStatus();
        if (user) {
          const token = await getStoredAccessToken();
          useAuthStore.setState({
            user,
            token: token || null,
            isAuthenticated: true,
            isLoading: false,
          });

          try {
            if (Constants.appOwnership !== 'expo') {
              const { registerDevice } = await import('../src/features/auth/services/auth');
              const expoToken = (await Notifications.getExpoPushTokenAsync()).data;
              await registerDevice({
                expo_push_token: expoToken,
                device_type: Platform.OS === 'ios' ? 'ios' : 'android',
                device_name: Platform.OS === 'ios' ? 'iPhone' : 'Android Device',
              });
            }
          } catch (error) {
            console.warn('[Push Register Error]', error);
          }
        } else {
          useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
        }
      } catch (error) {
        console.error('[App Init]', error);
        useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
      } finally {
        useAuthStore.setState({ isLoading: false });
        if (fontsLoaded) {
          SplashScreen.hideAsync().catch(() => {});
        }
      }
    }

    if (fontsLoaded) {
      initializeApp();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state, prevState) => {
      if (prevState.isAuthenticated && !state.isAuthenticated && !state.isLoading) {
        router.replace('/(auth)/login');
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen;
      if (screen) {
        navigationRouter.push(`/(app)/${screen}`);
      }
    });

    return () => subscription.remove();
  }, [navigationRouter]);

  return (
    <ErrorBoundary>
      <SoilMarkersProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(onboarding)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(app)" options={{ animation: 'fade' }} />
          </Stack>
        </GestureHandlerRootView>
      </SoilMarkersProvider>
    </ErrorBoundary>
  );
}


