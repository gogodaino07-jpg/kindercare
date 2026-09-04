// 아기 수학 앱 공통 디자인 토큰 (태블릿 가로모드 기준)
export const colors = {
  // 배경
  bg: '#FFF7E6',
  bgDeep: '#FFE9C7',
  card: '#FFFFFF',
  cardShadow: '#E7C89A',

  // 텍스트
  text: '#3B2A1A',
  textSub: '#8A7761',
  textOnPrimary: '#FFFFFF',

  // 포인트 컬러
  primary: '#FF9F43',
  primaryDeep: '#F07C1E',
  blue: '#4DA6FF',
  blueDeep: '#2B7FD4',
  green: '#5FD068',
  greenDeep: '#3FAF4A',
  greenGlow: '#D9F7DB',
  pink: '#FF8FB1',
  pinkDeep: '#EA6491',
  purple: '#A98BFF',
  purpleDeep: '#7C5CE6',
  yellow: '#FFD54A',

  // 상태
  locked: '#D9D2C7',
  lockedText: '#A79C8C',
  wrong: '#FF7A7A',
  border: '#F0E2CC',
} as const;

export const radius = {
  sm: 12,
  md: 20,
  lg: 28,
  xl: 36,
  pill: 999,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const shadow = {
  card: {
    shadowColor: '#B98A4B',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  float: {
    shadowColor: '#B98A4B',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;

// 화면 전환 시간(ms) - 라우터 트랜지션과 인터랙션에서 공용으로 사용
export const TRANSITION_MS = 300;
