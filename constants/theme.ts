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
  statusGreen: string;
  // New UI Palette
  gray50: string;
  gray100: string;
  gray400: string;
  gray500: string;
  gray600: string;
  gray800: string;
  gray900: string;
  blue500: string;
  blue100: string;
  lightBlueBg: string;
  green50: string;
  green500: string;
  orange500: string;
  orangeLight1: string;
  orangeLight2: string;
  orangeBorder: string;
  pinkBg: string;
  pinkText: string;
  // Dot-grid screen background overlay
  dotColor: string;
  // Purple accent (AI scan CTA gradient)
  purple500: string;
  purpleDeep: string;
  purpleBg: string;
  // Vivid pastel card colors (Bag section / timeline)
  pastelPink: string;
  pastelPinkAccent: string;
  pastelBlue: string;
  pastelBlueAccent: string;
  pastelOrange: string;
  pastelOrangeAccent: string;
}

export const LIGHT_COLORS: ThemeColors = {
  skyBackground: '#FFFFFF',
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
  creamBeige: '#FFFFFF',
  creamBeigeCard: '#FFFBF5',
  peachOrange: '#FFAB76',
  peachOrangeDeep: '#FF9A5A',
  coralPink: '#FF6F61',
  statusGreen: '#4CAF6D',
  // New UI Palette
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray800: '#1F2937',
  gray900: '#111827',
  blue500: '#3B82F6',
  blue100: '#DBEAFE',
  lightBlueBg: '#F0F5FF',
  green50: '#F0FDF4',
  green500: '#22C55E',
  orange500: '#F97316',
  orangeLight1: '#FFF6ED',
  orangeLight2: '#FFF1E5',
  orangeBorder: '#FFEDD5',
  pinkBg: '#FFE4E6',
  pinkText: '#E11D48',
  dotColor: 'rgba(15, 23, 42, 0.06)',
  purple500: '#8B5CF6',
  purpleDeep: '#6D28D9',
  purpleBg: '#F3E8FF',
  pastelPink: '#FFC2D9',
  pastelPinkAccent: '#EC4899',
  pastelBlue: '#AAD4FF',
  pastelBlueAccent: '#3B82F6',
  pastelOrange: '#FFD9A0',
  pastelOrangeAccent: '#F97316',
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
  creamBeige: '#FFFFFF',
  creamBeigeCard: '#2C2419',
  peachOrange: '#E69968', // Slightly desaturated for dark mode
  peachOrangeDeep: '#CC7B48',
  coralPink: '#E66458',
  statusGreen: '#45A862',
  // Fallback for dark mode — 400→900는 라이트 모드와 반대로 "숫자가 클수록 밝아짐"으로
  // 반전해야 어두운 배경 위에서 읽힘(800/900은 원래 반전돼 있었는데 400~600만 빠져서,
  // 배경과 거의 구분 안 되는 어두운 회색이라 아이콘·보조 텍스트가 안 보이던 버그가 있었음).
  gray50: '#1C2733',
  gray100: '#2A3744',
  gray400: '#718096',
  gray500: '#8B9DB0',
  gray600: '#AEBBC9',
  gray800: '#EDF2F7',
  gray900: '#FFFFFF',
  blue500: '#4299E1',
  blue100: '#2C5282',
  lightBlueBg: '#1A2D42',
  green50: '#1A2D24',
  green500: '#48BB78',
  orange500: '#ED8936',
  orangeLight1: '#2C1D15',
  orangeLight2: '#3A2519',
  orangeBorder: '#4A3224',
  pinkBg: '#3A211E',
  pinkText: '#FF7A6E',
  dotColor: 'rgba(255, 255, 255, 0.05)',
  purple500: '#A78BFA',
  purpleDeep: '#7C3AED',
  purpleBg: '#2E1F45',
  pastelPink: '#4A2436',
  pastelPinkAccent: '#F472B6',
  pastelBlue: '#1E3A5F',
  pastelBlueAccent: '#4299E1',
  pastelOrange: '#4A3319',
  pastelOrangeAccent: '#ED8936',
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
