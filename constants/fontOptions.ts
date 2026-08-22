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
  /** 목록 카드 뱃지에 보여줄 한 줄 느낌 태그, 예: "손글씨", "귀여움". */
  vibe: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'default', label: '기본 돋움체', vibe: '기본' },
  { id: 'Gaegu', label: 'Gaegu', fontFamily: 'Gaegu_400Regular', vibe: '손글씨' },
  { id: 'GamjaFlower', label: 'Gamja Flower', fontFamily: 'GamjaFlower_400Regular', vibe: '귀여움' },
  { id: 'HiMelody', label: 'Hi Melody', fontFamily: 'HiMelody_400Regular', vibe: '아기자기' },
  { id: 'PoorStory', label: 'Poor Story', fontFamily: 'PoorStory_400Regular', vibe: '자연스러운' },
  { id: 'Jua', label: 'Jua', fontFamily: 'Jua_400Regular', vibe: '동글동글' },
  { id: 'Dongle', label: 'Dongle', fontFamily: 'Dongle_400Regular', vibe: '발랄함' },
  { id: 'YeonSung', label: 'Yeon Sung', fontFamily: 'YeonSung_400Regular', vibe: '단정함' },
  { id: 'Sunflower', label: 'Sunflower', fontFamily: 'Sunflower_500Medium', vibe: '깔끔함' },
  { id: 'EastSeaDokdo', label: 'East Sea Dokdo', fontFamily: 'EastSeaDokdo_400Regular', vibe: '개성있는' },
  { id: 'system', label: '시스템 폰트', vibe: '심플' },
];

export const DEFAULT_FONT_ID: FontChoiceId = 'default';

export type FontSizeChoice = 'xs' | 's' | 'm' | 'l' | 'xl';

export interface FontSizeOption {
  id: FontSizeChoice;
  label: string;
  /** Multiplier applied to the chalkboard modal's base font sizes. */
  scale: number;
}

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  { id: 'xs', label: '아주 작게', scale: 0.85 },
  { id: 's', label: '작게', scale: 0.95 },
  { id: 'm', label: '보통', scale: 1 },
  { id: 'l', label: '크게', scale: 1.2 },
  { id: 'xl', label: '아주 크게', scale: 1.45 },
];

export const DEFAULT_FONT_SIZE: FontSizeChoice = 'm';
