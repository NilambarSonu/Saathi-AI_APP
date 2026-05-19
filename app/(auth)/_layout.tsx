import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { useDarkModeTheme } from '@/context/ThemeContext';

export default function AuthLayout() {
  const { theme, isDark } = useDarkModeTheme();

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setVisibilityAsync('visible').catch(() => {});
    NavigationBar.setBackgroundColorAsync(theme.surface).catch(() => {});
    NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark').catch(() => {});
  }, [isDark, theme.surface]);

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} />;
}


