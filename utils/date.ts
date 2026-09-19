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
export function ageFromBirthdate(birthdate: Date): 2 | 3 | 4 | 5 | 6 | 7 {
  const today = new Date();
  // Using academic class age (만 N세반) as requested.
  // Formula: (Current Year - Birth Year) - 1
  const age = today.getFullYear() - birthdate.getFullYear() - 1;
  return Math.min(7, Math.max(2, age)) as 2 | 3 | 4 | 5 | 6 | 7;
}

/** birthdate(YYYY-MM-DD)의 월-일이 오늘과 같으면 생일. */
export function isBirthdayToday(birthdate?: string): boolean {
  if (!birthdate) return false;
  const monthDay = birthdate.slice(5); // "MM-DD"
  const todayMonthDay = toISODate(new Date()).slice(5);
  return monthDay === todayMonthDay;
}

/** 생일 당일을 "생후 1일째"로 세는 방식(자정 기준 날짜 차이 + 1). */
export function daysSinceBirth(birthdate?: string, on: Date = new Date()): number | undefined {
  if (!birthdate) return undefined;
  const birth = parseISODate(birthdate);
  birth.setHours(0, 0, 0, 0);
  const day = new Date(on);
  day.setHours(0, 0, 0, 0);
  return Math.floor((day.getTime() - birth.getTime()) / 86400000) + 1;
}

/** 생후 일수가 100의 배수(100일, 200일, 300일…)인 날인지 — 무한정 계속 적용된다. */
export function isBirthMilestoneToday(birthdate?: string): boolean {
  const days = daysSinceBirth(birthdate);
  return !!days && days > 0 && days % 100 === 0;
}

/** birthdate 기준으로 from 이후(오늘 자체가 기념일이면 그다음 것) 가장 가까운 생후
 *  100일 단위 기념일의 날짜를 반환한다 — 알림 예약용. 100/200/300…으로 무한정 이어진다. */
export function nextBirthMilestoneDate(birthdate?: string, from: Date = new Date()): Date | undefined {
  const daysSoFar = daysSinceBirth(birthdate, from);
  if (daysSoFar === undefined || daysSoFar < 1) return undefined;
  const nextMultiple = daysSoFar % 100 === 0 ? daysSoFar + 100 : Math.ceil(daysSoFar / 100) * 100;
  const birth = parseISODate(birthdate!);
  birth.setHours(0, 0, 0, 0);
  const target = new Date(birth);
  target.setDate(target.getDate() + (nextMultiple - 1));
  return target;
}

