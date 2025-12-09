import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { lightColors, darkColors, ThemeColors } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'auto' | 'system';

export interface ThemeContextValue {
  theme: ThemeMode;
  mode: ThemeMode;  // Alias for theme
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (theme: ThemeMode) => void;
  setMode: (mode: ThemeMode) => void;  // Alias for setTheme
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = '@voicefit_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('auto');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    async function loadTheme() {
      try {
        const saved = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        if (saved && ['light', 'dark', 'auto'].includes(saved)) {
          setThemeState(saved as ThemeMode);
        }
      } catch (error) {
        console.log('Failed to load theme preference');
      }
      setIsLoaded(true);
    }
    loadTheme();
  }, []);

  // Calculate if dark mode (both 'auto' and 'system' follow system preference)
  const isDark = (theme === 'auto' || theme === 'system')
    ? systemColorScheme === 'dark'
    : theme === 'dark';

  // Get colors based on mode
  const colors = isDark ? darkColors : lightColors;

  // Set theme and persist
  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.log('Failed to save theme preference');
    }
  };

  // Don't render until theme is loaded
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, mode: theme, isDark, colors, setTheme, setMode: setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
