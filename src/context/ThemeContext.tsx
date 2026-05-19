import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ThemeColors } from '@/constants/Colors';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  isDarkMode: boolean;
  theme: ThemeColors;
  homeTheme: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@agni_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  // Default to light so the existing UI remains unchanged until the user opts in.
  // Once the user manually selects a theme it gets saved to AsyncStorage and restored here.
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode) {
          setModeState(savedMode as ThemeMode);
        }
        // If nothing is saved we keep light mode (set above in useState).
      } catch (e) {
        console.error('Failed to load theme mode', e);
      }
    };
    loadTheme();
  }, []);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (e) {
      console.error('Failed to save theme mode', e);
    }
  }, []);

  const isDarkMode = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
  const homeTheme = isDarkMode ? Colors.dark : Colors.light;
  const theme = Colors.light;
  const isDark = false;

  const toggleTheme = useCallback(() => {
    setMode(isDarkMode ? 'light' : 'dark');
  }, [isDarkMode, setMode]);

  return (
    <ThemeContext.Provider value={{ mode, isDark, isDarkMode, theme, homeTheme, setMode, toggleTheme }}>
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
    theme: context.homeTheme,
    isDark: context.isDarkMode,
  };
}
