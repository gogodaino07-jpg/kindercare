/**
 * 캘린더 화면 전용 고정 팔레트. 앱 공통 테마(constants/theme.ts)와 별개로,
 * 이 화면에 한해 앰버/슬레이트/에메랄드/로즈 + 보조 바이올렛 톤을 쓴다.
 * 다크모드는 대응하지 않고 항상 이 라이트 톤으로 고정.
 */
export const calendarTheme = {
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
} as const;

export type CalendarTheme = typeof calendarTheme;
