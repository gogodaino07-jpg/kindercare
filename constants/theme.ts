import { Platform } from 'react-native';

export interface ThemeColors {
  skyBackground: string;
  cloud: string;
  cardWhite: string;
  textPrimary: string;
  textSecondary: string;
  tomorrowRed: string;
  tomorrowRedBg: string;
  chalkboardFrame: string;
  chalkboardSage: string;
  chalkboardText: string;
  accent: string;
  border: string;
  creamBeige: string;
  creamBeigeCard: string;
  peachOrange: string;
  peachOrangeDeep: string;
  coralPink: string;
}

export const LIGHT_COLORS: ThemeColors = {
  skyBackground: '#EAF4FB',
  cloud: '#FFFFFF',
  cardWhite: '#FFFFFF',
  textPrimary: '#2B3A45',
  textSecondary: '#6B7C89',
  tomorrowRed: '#E4574C',
  tomorrowRedBg: '#FDECEA',
  chalkboardFrame: '#C9A87C',
  chalkboardSage: '#5C7A6E',
  chalkboardText: '#F5F1E6',
  accent: '#4A90D9',
  border: '#DCE8F0',
  // Onboarding-chain palette (splash + onboarding/family/verify/child-setup screens)
  creamBeige: '#F7EFE3',
  creamBeigeCard: '#FFFBF5',
  peachOrange: '#FFAB76',
  peachOrangeDeep: '#FF9A5A',
  coralPink: '#FF6F61',
};

export const DARK_COLORS: ThemeColors = {
  skyBackground: '#0F1720',
  cloud: '#1C2733',
  cardWhite: '#1B242E',
  textPrimary: '#EDF2F7',
  textSecondary: '#93A4B3',
  tomorrowRed: '#FF7A6E',
  tomorrowRedBg: '#3A211E',
  chalkboardFrame: '#8A6F4F',
  chalkboardSage: '#4A6259',
  chalkboardText: '#F5F1E6',
  accent: '#5B9EE6',
  border: '#2A3744',
  creamBeige: '#241D15',
  creamBeigeCard: '#2C2419',
  peachOrange: '#FFAB76',
  peachOrangeDeep: '#FF9A5A',
  coralPink: '#FF6F61',
};

/** @deprecated Prefer `useThemeColors()` from context/ThemeContext for theme-reactive colors. Kept as the static light-mode fallback for screens not yet wired to the theme context. */
export const COLORS = LIGHT_COLORS;

export const SHADOW = Platform.select({
  ios: {
    shadowColor: '#8FA9BC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  android: {
    elevation: 4,
  },
  default: {
    shadowColor: '#8FA9BC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
});

export const FONT_FAMILY = {
  handwriting: 'PoorStory_400Regular',
} as const;
