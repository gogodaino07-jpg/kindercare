export const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** Parses an ISO "YYYY-MM-DD" string as a local-time Date (avoids UTC day-shift). */
export function parseISODate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
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
