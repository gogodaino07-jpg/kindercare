import { useTheme } from '../../context/ThemeContext';

/** AI 스캔/확인·수정 화면 전용 팔레트 — 기준 디자인(App.jsx, 스크린샷)이 앱 공통 ThemeColors와
 *  별개인 단일 바이올렛 톤이라 분리해서 관리한다. `surface`/`border`는 원래 이 화면 곳곳에서
 *  카드 배경에 `white`를, 테두리에 하드코딩된 반투명 검정을 그대로 썼던 것을 다크모드 대응을
 *  위해 뽑아낸 키 — `white`는 컬러 버튼 위에 얹는 흰 텍스트/아이콘용으로 라이트·다크 공통 고정값. */
export const SCAN_COLORS = {
  violet600: '#7C3AED',
  violet700: '#6D28D9',
  indigo600: '#4F46E5',
  violet50: '#F5F3FF',
  violet100: '#EDE9FE',
  violet200: '#DDD6FE',
  violet900: '#4C1D95',
  violet950: '#2E1065',
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  white: '#FFFFFF',
  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber200: '#FDE68A',
  amber600: '#D97706',
  amber700: '#B45309',
  amber800: '#92400E',
  emerald50: '#ECFDF5',
  emerald100: '#D1FAE5',
  emerald700: '#047857',
  emerald800: '#065F46',
  rose100: '#FFE4E6',
  rose600: '#E11D48',
  rose700: '#BE123C',
  blue100: '#DBEAFE',
  blue700: '#1D4ED8',
  appBg: '#F8FAF9',
  surface: '#FFFFFF',
  border: 'rgba(0,0,0,0.045)',
  /** 원본 미리보기 패널·저장 버튼처럼 라이트/다크 상관없이 항상 짙게 유지해야 하는
   *  배경(흰 텍스트를 얹는 고정 다크 칩). slate900을 이 용도로 같이 쓰면, slate900이
   *  본문 텍스트로도 쓰이느라 다크모드에서 흰색으로 뒤집힐 때 흰 배경+흰 글씨가 돼버림. */
  ink: '#0F172A',
} as const;

export const SCAN_COLORS_DARK = {
  violet600: '#A78BFA',
  violet700: '#8B5CF6',
  indigo600: '#818CF8',
  violet50: '#241B3D',
  violet100: '#2E2350',
  violet200: '#3D2E63',
  violet900: '#DDD6FE',
  violet950: '#EDE9FE',
  slate900: '#F1F5F9',
  slate800: '#E2E8F0',
  slate700: '#CBD5E1',
  slate600: '#94A3B8',
  slate500: '#94A3B8',
  slate400: '#64748B',
  slate200: '#334155',
  slate300: '#3F4C5F',
  slate100: '#1C2733',
  slate50: '#141B24',
  white: '#FFFFFF',
  amber50: '#2C1D0D',
  amber100: '#3A2814',
  amber200: '#4A3319',
  amber600: '#F59E0B',
  amber700: '#FBBF24',
  amber800: '#FCD34D',
  emerald50: '#0F2A1E',
  emerald100: '#12332A',
  emerald700: '#34D399',
  emerald800: '#6EE7B7',
  rose100: '#3A1E24',
  rose600: '#FB7185',
  rose700: '#FDA4AF',
  blue100: '#1E3A5F',
  blue700: '#60A5FA',
  appBg: '#0F1720',
  surface: '#1B242E',
  border: '#2A3744',
  ink: '#0F172A',
} as const;

export type ScanColors = { [K in keyof typeof SCAN_COLORS]: string };

/** 현재 앱 테마(라이트/다크)에 맞는 AI 스캔 화면 전용 팔레트를 반환한다. */
export function useScanColors(): ScanColors {
  const { resolvedScheme } = useTheme();
  return resolvedScheme === 'dark' ? SCAN_COLORS_DARK : SCAN_COLORS;
}
