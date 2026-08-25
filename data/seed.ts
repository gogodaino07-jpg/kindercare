import { Child, Event, FamilyMember, NotificationSettings } from '../types/models';

export const seedChildren: Child[] = [];

export const seedEvents: Event[] = [];

export const seedFamilyMembers: FamilyMember[] = [
  { id: 'member-1', name: '나', isOwner: true },
];

export const seedNotificationSettings: NotificationSettings = {
  enabled: true,
  dayBeforeTime: { period: 'PM', hour: 6, minute: 0 },
  sameDayEnabled: false,
  sameDayTime: { period: 'AM', hour: 8, minute: 0 },
};

/**
 * 숫자 8자리 — 조부모 등도 전화로 쉽게 불러주고 받아 적을 수 있도록 영문 없이 숫자만 사용.
 * (6자리(백만 가지)는 무차별 대입에 취약해 8자리(1억 가지)로 늘림 — 여전히 네 자리씩 두 묶음으로
 * 불러줄 수 있는 길이라 사용성은 유지된다.)
 */
export function generateFamilyKey(): string {
  let key = '';
  for (let i = 0; i < 8; i++) {
    key += Math.floor(Math.random() * 10).toString();
  }
  return key;
}
