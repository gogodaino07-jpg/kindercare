export type StampBoardThemeId = 'blue' | 'pink' | 'classic';

export interface StampBoardTheme {
  id: StampBoardThemeId;
  label: string;
  emoji: string;
  /** 화면 배경 그라데이션 (위->아래) */
  bgGradient: [string, string, string];
  /** 아이 아바타 원형 배경 그라데이션 */
  avatarGradient: [string, string];
  avatarBorder: string;
  /** 반 뱃지 배경/텍스트 */
  classBg: string;
  classText: string;
  /** 소원 카드 상단 뱃지 그라데이션 */
  wishBadgeGradient: [string, string];
  /** 진행률 카드의 스파클 아이콘 박스 */
  progressIconBg: string;
  progressIconColor: string;
  /** 도장판 카드 테두리 */
  boardBorder: string;
  /** 하단 "오늘의 도장 쾅" 버튼 그라데이션 */
  stampButtonGradient: [string, string, string];
  /** 소리(진동) 토글 아이콘 색 */
  accentIconColor: string;
  /** 이 테마에서 고를 수 있는 스탬프 이모지 목록 */
  stickers: string[];
}

export const STAMP_BOARD_THEMES: Record<StampBoardThemeId, StampBoardTheme> = {
  blue: {
    id: 'blue',
    label: '파랑',
    emoji: '💙',
    bgGradient: ['#E0F2FE', '#F0F9FF', '#EEF2FF'],
    avatarGradient: ['#BAE6FD', '#DBEAFE'],
    avatarBorder: '#7DD3FC',
    classBg: '#BAE6FD',
    classText: '#0C4A6E',
    wishBadgeGradient: ['#0EA5E9', '#6366F1'],
    progressIconBg: '#E0F2FE',
    progressIconColor: '#0284C7',
    boardBorder: '#E0F2FE',
    stampButtonGradient: ['#0EA5E9', '#6366F1', '#2563EB'],
    accentIconColor: '#0EA5E9',
    stickers: ['🌈', '🚀', '🦕', '⭐', '🎈', '⚽'],
  },
  pink: {
    id: 'pink',
    label: '핑크',
    emoji: '🩷',
    bgGradient: ['#FCE7F3', '#FDF2F8', '#FAF5FF'],
    avatarGradient: ['#FBCFE8', '#FFE4E6'],
    avatarBorder: '#F9A8D4',
    classBg: '#FBCFE8',
    classText: '#831843',
    wishBadgeGradient: ['#EC4899', '#A855F7'],
    progressIconBg: '#FCE7F3',
    progressIconColor: '#DB2777',
    boardBorder: '#FCE7F3',
    stampButtonGradient: ['#EC4899', '#D946EF', '#9333EA'],
    accentIconColor: '#EC4899',
    stickers: ['🌈', '🦄', '🪄', '👑', '🍓', '🌸'],
  },
  classic: {
    id: 'classic',
    label: '밝은',
    emoji: '🌈',
    bgGradient: ['#FEF3C7', '#FAF5FF', '#F0F9FF'],
    avatarGradient: ['#FDE68A', '#FEF9C3'],
    avatarBorder: '#FCD34D',
    classBg: '#FDE68A',
    classText: '#78350F',
    wishBadgeGradient: ['#F59E0B', '#EC4899'],
    progressIconBg: '#FAF5FF',
    progressIconColor: '#9333EA',
    boardBorder: '#FAF5FF',
    stampButtonGradient: ['#F59E0B', '#EC4899', '#9333EA'],
    accentIconColor: '#A855F7',
    stickers: ['🌈', '⭐', '🎈', '🎁', '🐣', '🍭'],
  },
};

export const RAINBOW_PROGRESS_GRADIENT: [string, string, string, string, string] = [
  '#FF8A8A',
  '#FACC15',
  '#4ADE80',
  '#38BDF8',
  '#C084FC',
];

export const WISH_PRESETS = [
  '🧸 도장 모아서 장난감 선물 받기!',
  '🍦 달콤한 아이스크림 먹기!',
  '🎠 신나는 키즈카페 놀러 가기!',
  '🍕 맛있는 치킨&피자 파티!',
  '⏰ 만화 1시간 마음껏 보기!',
];
