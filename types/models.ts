export type ChildAge = 3 | 4 | 5 | 6 | 7;

export interface Child {
  id: string;
  name?: string;
  age: ChildAge;
  className?: string;
  photoUri?: string;
}

export interface Event {
  id: string;
  /** ISO date string, e.g. "2026-07-21" */
  date: string;
  title: string;
  /** 준비물 — also used as the Coupang shopping-search keyword. */
  note?: string;
  /** 메모 — free-form notes, kept separate from 준비물. */
  memo?: string;
  /** 등원 전날 저녁 알림 수신 여부 — defaults to true when unset. */
  notifyDayBefore?: boolean;
  childId: string;
  /** 'ai' = 가정통신문 업로드 → AI 확인 화면에서 저장된 일정, 'manual' = 캘린더에서 직접 추가 */
  source: 'ai' | 'manual';
  icon?: string;
  needsReview?: boolean;
  reviewReason?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  isOwner: boolean;
  phone?: string;
}

export interface TimeOfDay {
  period: 'AM' | 'PM';
  hour: number;
  minute: number;
}

export interface NotificationSettings {
  enabled: boolean;
  dayBeforeTime: TimeOfDay;
  sameDayEnabled: boolean;
  sameDayTime: TimeOfDay;
}

export interface UploadedDoc {
  id: string;
  uri: string;
  kind: 'image' | 'file';
  name?: string;
}

export interface GoogleAccount {
  email: string;
  name: string;
}
