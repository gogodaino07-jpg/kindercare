export type FontChoiceId =
  | 'default'
  | 'system'
  | 'Gaegu'
  | 'GamjaFlower'
  | 'HiMelody'
  | 'PoorStory'
  | 'Jua'
  | 'Dongle'
  | 'YeonSung'
  | 'Sunflower'
  | 'EastSeaDokdo';

export interface FontOption {
  id: FontChoiceId;
  label: string;
  /** Registered font family name to load with useFonts, or undefined to fall back to the OS/app default. */
  fontFamily?: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'default', label: '기본 돋움체' },
  { id: 'Gaegu', label: 'Gaegu', fontFamily: 'Gaegu_400Regular' },
  { id: 'GamjaFlower', label: 'Gamja Flower', fontFamily: 'GamjaFlower_400Regular' },
  { id: 'HiMelody', label: 'Hi Melody', fontFamily: 'HiMelody_400Regular' },
  { id: 'PoorStory', label: 'Poor Story', fontFamily: 'PoorStory_400Regular' },
  { id: 'Jua', label: 'Jua', fontFamily: 'Jua_400Regular' },
  { id: 'Dongle', label: 'Dongle', fontFamily: 'Dongle_400Regular' },
  { id: 'YeonSung', label: 'Yeon Sung', fontFamily: 'YeonSung_400Regular' },
  { id: 'Sunflower', label: 'Sunflower', fontFamily: 'Sunflower_500Medium' },
  { id: 'EastSeaDokdo', label: 'East Sea Dokdo', fontFamily: 'EastSeaDokdo_400Regular' },
  { id: 'system', label: '시스템 폰트' },
];

export const DEFAULT_FONT_ID: FontChoiceId = 'default';

export type FontSizeChoice = 'small' | 'medium' | 'large';

export interface FontSizeOption {
  id: FontSizeChoice;
  label: string;
  /** Multiplier applied to the chalkboard modal's base font sizes. */
  scale: number;
}

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  { id: 'small', label: '작게', scale: 0.9 },
  { id: 'medium', label: '보통', scale: 1 },
  { id: 'large', label: '크게', scale: 1.15 },
];

export const DEFAULT_FONT_SIZE: FontSizeChoice = 'medium';
