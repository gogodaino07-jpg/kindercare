/**
 * 캘린더 화면 전용 팔레트. 앱 공통 테마(constants/theme.ts)와 별개로,
 * 이 화면에 한해 앰버/슬레이트/에메랄드/로즈 + 보조 바이올렛 톤을 쓴다.
 * 배경/카드/테두리/텍스트/회색조만 다크모드에 맞춰 바뀌고, 포인트 색상
 * (amber/emerald/rose/violet/sky)은 라이트·다크 공통으로 그대로 유지한다
 * — useCalendarTheme()으로 현재 앱 테마에 맞는 값을 가져다 쓸 것.
 */
export interface CalendarTheme {
  bg: string;
  cardWhite: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  amber: string;
  amberDeep: string;
  amberBg: string;
  amberBgSoft: string;
  slate: string;
  emerald: string;
  emeraldBg: string;
  emeraldDeep: string;
  rose: string;
  roseBg: string;
  violet: string;
  violetDeep: string;
  violetBg: string;
  sky: string;
  skyBg: string;
  gray50: string;
  gray100: string;
  gray200: string;
  gray400: string;
}

export const calendarTheme: CalendarTheme = {
  bg: '#F8FAFC',
  cardWhite: '#FFFFFF',
  border: '#E2E8F0',

  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',

  amber: '#F59E0B',
  amberDeep: '#D97706',
  amberBg: '#FEF3C7',
  amberBgSoft: '#FFFBEB',

  slate: '#1E293B',

  emerald: '#10B981',
  emeraldBg: '#D1FAE5',
  emeraldDeep: '#047857',

  rose: '#F43F5E',
  roseBg: '#FFE4E6',

  violet: '#8B5CF6',
  violetDeep: '#7C3AED',
  violetBg: '#EDE9FE',

  sky: '#0284C7',
  skyBg: '#E0F2FE',

  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
};

export const calendarThemeDark: CalendarTheme = {
  ...calendarTheme,
  bg: '#0F1720',
  cardWhite: '#1B242E',
  border: '#2A3744',

  textPrimary: '#EDF2F7',
  textSecondary: '#AEBBC9',
  textMuted: '#8B9DB0',

  slate: '#EDF2F7',

  amberBg: '#3A2F14',
  amberBgSoft: '#241D0D',
  emeraldBg: '#12332A',
  roseBg: '#3A1E24',
  violetBg: '#2A2145',
  skyBg: '#132A3D',

  gray50: '#1C2733',
  gray100: '#2A3744',
  gray200: '#334155',
  gray400: '#718096',
};
