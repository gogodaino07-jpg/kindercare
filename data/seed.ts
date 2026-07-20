import { Child, Event, FamilyMember, NotificationSettings } from '../types/models';
import { toISODate } from '../utils/date';

export const seedChildren: Child[] = [
  { id: 'child-1', name: '하은', age: 5, className: '병아리반' },
  { id: 'child-2', name: '도윤', age: 3, className: '새싹반' },
];

function daysFromToday(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return toISODate(date);
}

export const seedEvents: Event[] = [
  {
    id: 'event-1',
    date: daysFromToday(1),
    title: '현장학습',
    note: '물통, 편한 신발, 여벌 옷',
    childId: 'child-1',
    source: 'ai',
    icon: '🚌',
  },
  {
    id: 'event-2',
    date: daysFromToday(1),
    title: '도서 대출',
    note: '빌린 책 반납하기',
    childId: 'child-1',
    source: 'ai',
    icon: '📚',
  },
  {
    id: 'event-3',
    date: daysFromToday(4),
    title: '물놀이',
    note: '수영복, 여벌 옷, 큰 수건',
    childId: 'child-2',
    source: 'ai',
    icon: '🐟',
  },
  {
    id: 'event-4',
    date: daysFromToday(6),
    title: '급식 사진 촬영',
    note: undefined,
    childId: 'child-1',
    source: 'ai',
    icon: '🍽️',
  },
  {
    id: 'event-5',
    date: daysFromToday(6),
    title: '생일파티',
    note: '축하 카드 준비',
    childId: 'child-1',
    source: 'ai',
    icon: '🎂',
  },
  {
    id: 'event-6',
    date: daysFromToday(11),
    title: '학부모 상담',
    note: '상담 시간표 확인',
    childId: 'child-2',
    source: 'ai',
    icon: '💬',
  },
  {
    id: 'event-7',
    date: daysFromToday(-3),
    title: '병원 예약',
    note: '독감 예방접종',
    childId: 'child-1',
    source: 'manual',
    icon: '🏥',
  },
  {
    id: 'event-8',
    date: daysFromToday(-20),
    title: '가족 사진 촬영',
    note: '단정한 옷차림으로',
    childId: 'child-2',
    source: 'ai',
    icon: '📷',
  },
];

export const seedFamilyMembers: FamilyMember[] = [
  { id: 'member-1', name: '나', isOwner: true },
  { id: 'member-2', name: '엄마', isOwner: false },
  { id: 'member-3', name: '아빠', isOwner: false },
];

export const seedNotificationSettings: NotificationSettings = {
  enabled: true,
  dayBeforeTime: { period: 'AM', hour: 6, minute: 0 },
  sameDayEnabled: false,
  sameDayTime: { period: 'AM', hour: 8, minute: 0 },
};

export function generateFamilyKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = '';
  for (let i = 0; i < 8; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3) key += '-';
  }
  return key;
}
