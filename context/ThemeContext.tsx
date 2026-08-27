import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { DARK_COLORS, LIGHT_COLORS, ThemeColors } from '../constants/theme';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedScheme = 'light' | 'dark';

const STORAGE_KEY = 'kindercare_theme_mode';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedScheme: ResolvedScheme;
  colors: ThemeColors;
  loaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  // 앱 안에서 고른 다크모드가 안드로이드 시스템 설정과 다르면(예: 시스템은
  // 라이트인데 앱에서만 다크를 골랐을 때), 화면 전환 애니메이션 중 잠깐 보이는
  // 네이티브 창 배경(android:windowBackground)은 여전히 시스템 설정을 따라가서
  // JS로 그린 다크 화면이 뜨기 직전에 흰색이 번쩍였다. Appearance.setColorScheme로
  // 안드로이드가 인식하는 uiMode 자체를 앱의 선택에 맞춰 강제로 바꿔주면
  // values-night 네이티브 리소스가 앱의 실제 테마와 일치하게 된다.
  useEffect(() => {
    Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  }, [mode]);

  const resolvedScheme: ResolvedScheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const colors = resolvedScheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, setMode, resolvedScheme, colors, loaded }),
    [mode, resolvedScheme, colors, loaded]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

/** Convenience hook for screens that only need the resolved color palette. */
export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  system: '시스템 설정',
  light: '라이트 모드',
  dark: '다크 모드',
};
