import { Platform } from 'react-native';

export const COLORS = {
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
} as const;

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
