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

function levenshteinDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/**
 * 같은 문서를 다시 스캔했을 때 AI가 제목을 살짝 다르게 뽑아내도(예: "가을 소풍" ↔
 * "가을 소풍 안내") 같은 일정으로 잡아내도록, 완전 포함 관계뿐 아니라 편집 거리
 * 기반 유사도(50% 이상)까지 함께 확인한다. 날짜는 정확히 같아야만 후보로 본다.
 */
export function isSimilarEvent(
  a: { date: string; title: string },
  b: { date: string; title: string }
): boolean {
  if (a.date !== b.date) return false;
  const normalize = (s: string) => s.replace(/[\s.,·\-()[\]~!?:;'"]/g, '');
  const at = normalize(a.title);
  const bt = normalize(b.title);
  if (!at || !bt) return false;
  if (at === bt || at.includes(bt) || bt.includes(at)) return true;

  const distance = levenshteinDistance(at, bt);
  const similarity = 1 - distance / Math.max(at.length, bt.length);
  return similarity >= 0.5;
}
