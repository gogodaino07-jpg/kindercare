import { useTheme } from '../../context/ThemeContext';
import { calendarTheme, calendarThemeDark, type CalendarTheme } from './calendarTheme';

/** 캘린더 화면 전용 팔레트를 현재 앱 테마(라이트/다크)에 맞게 반환한다. */
export function useCalendarTheme(): CalendarTheme {
  const { resolvedScheme } = useTheme();
  return resolvedScheme === 'dark' ? calendarThemeDark : calendarTheme;
}
