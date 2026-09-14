export type FontChoiceId =
  | 'default'
  | 'Gaegu'
  | 'GamjaFlower'
  | 'HiMelody'
  | 'PoorStory'
  | 'Jua'
  | 'Dongle'
  | 'Sunflower';

export interface FontOption {
  id: FontChoiceId;
  label: string;
  /** Registered font family name to load with useFonts, or undefined to fall back to the OS/app default. */
  fontFamily?: string;
  /**
   * 이 폰트의 글자가 시스템 기본 폰트보다 작게 그려지는 정도를 보정하는 배율.
   * 구글 폰트 손글씨체들은 대부분 글자 뼈대(x-height) 자체가 작게 디자인돼 있어
   * 같은 fontSize여도 기본 폰트보다 훨씬 작아 보여서, 체감 크기를 맞추기 위해 곱해준다.
   */
  sizeBoost?: number;
  /** 목록 카드 뱃지에 보여줄 한 줄 느낌 태그, 예: "손글씨", "귀여움". */
  vibe: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'default', label: '기본', vibe: '기본' },
  { id: 'Gaegu', label: 'Gaegu', fontFamily: 'Gaegu_400Regular', sizeBoost: 1.25, vibe: '손글씨' },
  { id: 'GamjaFlower', label: 'Gamja Flower', fontFamily: 'GamjaFlower_400Regular', sizeBoost: 1.2, vibe: '귀여움' },
  { id: 'HiMelody', label: 'Hi Melody', fontFamily: 'HiMelody_400Regular', sizeBoost: 1.15, vibe: '아기자기' },
  { id: 'PoorStory', label: 'Poor Story', fontFamily: 'PoorStory_400Regular', sizeBoost: 1.15, vibe: '자연스러운' },
  { id: 'Jua', label: 'Jua', fontFamily: 'Jua_400Regular', sizeBoost: 1.1, vibe: '동글동글' },
  { id: 'Dongle', label: 'Dongle', fontFamily: 'Dongle_400Regular', sizeBoost: 1.3, vibe: '발랄함' },
  { id: 'Sunflower', label: 'Sunflower', fontFamily: 'Sunflower_500Medium', sizeBoost: 1.05, vibe: '깔끔함' },
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
