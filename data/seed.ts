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

export function generateFamilyKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = '';
  for (let i = 0; i < 8; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3) key += '-';
  }
  return key;
}
