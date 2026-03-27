import { useEffect } from 'react';
import { Stack, router, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { SoilMarkersProvider } from '../context/SoilMarkersContext';
import * as Linking from 'expo-linking';
import { useFonts } from 'expo-font';
import { 
  Sora_300Light, 
  Sora_400Regular, 
  Sora_500Medium, 
  Sora_600SemiBold, 
  Sora_700Bold, 
  Sora_800ExtraBold 
} from '@expo-google-fonts/sora';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../store/authStore';
import { checkAuthStatus } from '../services/auth';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Keep native splash visible until we're ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setUser, clearUser, setLoading } = useAuthStore();
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
        // Check if user has a valid saved session
        const user = await checkAuthStatus();
        
        if (user) {
          setUser(user);
          
          // Register device for push notifications (skip on Expo Go)
          try {
            if (Constants.appOwnership !== 'expo') {
              const { registerDevice } = await import('../services/auth');
              const expoToken = (await Notifications.getExpoPushTokenAsync()).data;
              await registerDevice({
                expo_push_token: expoToken,
                device_type: Platform.OS === 'ios' ? 'ios' : 'android',
                device_name: Platform.OS === 'ios' ? 'iPhone' : 'Android Device'
              });
            } else {
              console.log('[Push Register] Skipping token registration on Expo Go.');
            }
          } catch (err) {
            console.warn('[Push Register Error]', err);
          }
          // Intentionally omitting router.replace() here
          // The visual splash screen handles actual screen redirection.
        } else {
          clearUser();
        }
      } catch (err) {
        console.error('[App Init]', err);
        clearUser();
      } finally {
        if (fontsLoaded) {
          SplashScreen.hideAsync();
        }
      }
    }

    if (fontsLoaded) {
      initializeApp();
    }
  }, [fontsLoaded]);

  // Handle Social Auth Callback (Step 1.10)
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const { url } = event;
      if (url.includes('saathiai://auth/callback')) {
        const { queryParams } = Linking.parse(url);
        const token = queryParams.token as string;
        const refreshToken = queryParams.refreshToken as string;

        if (token && refreshToken) {
          try {
            const { saveAuthTokens } = await import('../services/api');
            const { checkAuthStatus: verifyAuth } = await import('../services/auth');
            await saveAuthTokens(token, refreshToken);
            const user = await verifyAuth();
            if (user) {
              setUser(user);
              router.replace('/(app)');
            }
          } catch (err) {
            console.error('[Deep Link Auth Error]', err);
          }
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  // Global Session Expiration Listener (Step 2.10)
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state, prevState) => {
      if (prevState.isAuthenticated && !state.isAuthenticated && !state.isLoading) {
        router.replace('/(auth)/login');
      }
    });
    return unsubscribe;
  }, []);

  // Push notification tap listener
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const screen = response.notification.request.content.data?.screen;
      if (screen) {
        navigationRouter.push(`/(app)/${screen}`);
      }
    });
    return () => subscription.remove();
  }, [navigationRouter]);

  // Render the stack immediately to let Expo Router match the path, 
  // relying on SplashScreen.preventAutoHideAsync() to hide the view until fonts load.

  return (
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
  );
}
