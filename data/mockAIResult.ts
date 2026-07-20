import { Child, Event } from '../types/models';
import { toISODate } from '../utils/date';

function daysFromToday(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return toISODate(date);
}

/**
 * Stand-in for a real Claude API call. Returns a plausible set of extracted
 * events for the single child the upload is being analyzed for — scoped to
 * one child only so a mock run never surfaces a sibling's schedule.
 */
export function generateMockAIEvents(child: Child | undefined): Omit<Event, 'id'>[] {
  if (!child) return [];

  return [
    {
      date: daysFromToday(8),
      title: '가을 소풍',
      note: '돗자리, 도시락, 물통',
      childId: child.id,
      source: 'ai',
      icon: '🚌',
    },
    {
      date: daysFromToday(8),
      title: '재롱잔치 연습',
      note: '편한 복장으로 등원',
      childId: child.id,
      source: 'ai',
      icon: '🎭',
      needsReview: true,
      reviewReason: '문서에 대상 학년 표시가 없어 전체 공지로 추정했어요',
    },
    {
      date: daysFromToday(10),
      title: '미술 준비물 안내',
      note: '크레파스, 색종이, 딱풀',
      childId: child.id,
      source: 'ai',
      icon: '🎨',
    },
    {
      date: daysFromToday(15),
      title: '여름방학 안내',
      note: '방학식 날짜 확인 필요',
      childId: child.id,
      source: 'ai',
      icon: '☀️',
      needsReview: true,
      reviewReason: '방학 시작일 표기가 흐릿해서 확인이 필요해요',
    },
  ];
}

export function isSimilarEvent(
  a: { date: string; title: string },
  b: { date: string; title: string }
): boolean {
  if (a.date !== b.date) return false;
  const normalize = (s: string) => s.replace(/\s/g, '');
  const at = normalize(a.title);
  const bt = normalize(b.title);
  return at === bt || at.includes(bt) || bt.includes(at);
}
