import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ThemeColors } from '@/constants/Colors';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  isDarkMode: boolean;
  theme: ThemeColors;
  darkModeTheme: ThemeColors;
  homeTheme: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@agni_theme_mode';
const THEME_OVERRIDE_KEY = '@agni_theme_manual_override';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const systemColorScheme = colorScheme ?? Appearance.getColorScheme() ?? 'light';
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const [savedMode, hasManualOverride] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(THEME_OVERRIDE_KEY),
        ]);
        const isValidMode = savedMode === 'light' || savedMode === 'dark' || savedMode === 'system';

        if (hasManualOverride === 'true' && isValidMode) {
          setModeState(savedMode);
        } else {
          setModeState('system');
          if (savedMode && savedMode !== 'system') {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, 'system');
          }
        }
      } catch (e) {
        console.error('Failed to load theme mode', e);
      }
    };
    loadTheme();
  }, []);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      if (newMode === 'system') {
        await AsyncStorage.multiSet([
          [THEME_STORAGE_KEY, 'system'],
          [THEME_OVERRIDE_KEY, 'false'],
        ]);
      } else {
        await AsyncStorage.multiSet([
          [THEME_STORAGE_KEY, newMode],
          [THEME_OVERRIDE_KEY, 'true'],
        ]);
      }
    } catch (e) {
      console.error('Failed to save theme mode', e);
    }
  }, []);

  const isDarkMode = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
  const darkModeTheme = isDarkMode ? Colors.dark : Colors.light;
  const homeTheme = darkModeTheme;
  const theme = Colors.light;
  const isDark = false;

  const toggleTheme = useCallback(() => {
    setMode(isDarkMode ? 'light' : 'dark');
  }, [isDarkMode, setMode]);

  return (
    <ThemeContext.Provider value={{ mode, isDark, isDarkMode, theme, darkModeTheme, homeTheme, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useHomeTheme() {
  return useDarkModeTheme();
}

export function useDarkModeTheme() {
  const context = useTheme();
  return {
    ...context,
    theme: context.darkModeTheme,
    isDark: context.isDarkMode,
  };
}
