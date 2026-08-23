export const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** Parses an ISO "YYYY-MM-DD" string as a local-time Date (avoids UTC day-shift). */
export function parseISODate(isoDate: string): Date {
  if (!isoDate || typeof isoDate !== 'string') return new Date();
  const parts = isoDate.split('-');
  if (parts.length !== 3) return new Date();

  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date();

  return new Date(year, month - 1, day);
}

/** "YYYY-MM-DD" for a local Date, matching Event.date's format. */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Formats an ISO date string as "M/D(요일)", e.g. "7/20(월)". */
export function formatMD(isoDate: string): string {
  const date = parseISODate(isoDate);
  const weekday = WEEKDAY_KO[date.getDay()];
  return `${date.getMonth() + 1}/${date.getDate()}(${weekday})`;
}

/** Formats an ISO date string as "M월 D일", e.g. "8월 23일". */
export function formatMonthDayKo(isoDate: string): string {
  const date = parseISODate(isoDate);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(isoDateA: string, isoDateB: string): boolean {
  return isoDateA === isoDateB;
}

export function isTomorrow(isoDate: string, today: Date = new Date()): boolean {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isoDate === toISODate(tomorrow);
}

export function isPast(isoDate: string, today: Date = new Date()): boolean {
  return parseISODate(isoDate).getTime() < startOfDay(today).getTime();
}

/** Calendar age from a birthdate (Current Year - Birth Year - 1) to match kindergarten class standards (만 N세반). */
export function ageFromBirthdate(birthdate: Date): 3 | 4 | 5 | 6 | 7 {
  const today = new Date();
  // Using academic class age (만 N세반) as requested.
  // Formula: (Current Year - Birth Year) - 1
  const age = today.getFullYear() - birthdate.getFullYear() - 1;
  return Math.min(7, Math.max(3, age)) as 3 | 4 | 5 | 6 | 7;
}

/** birthdate(YYYY-MM-DD)의 월-일이 오늘과 같으면 생일. */
export function isBirthdayToday(birthdate?: string): boolean {
  if (!birthdate) return false;
  const monthDay = birthdate.slice(5); // "MM-DD"
  const todayMonthDay = toISODate(new Date()).slice(5);
  return monthDay === todayMonthDay;
}

