// 학습 단계(레벨) 정의
// 각 레벨은 여러 스테이지로 구성되고, 스테이지 하나당 문제 수는 QUESTIONS_PER_STAGE.
// 이전 레벨의 모든 스테이지를 클리어해야 다음 레벨이 열린다.
export type QuestionKind = 'count' | 'match' | 'compare' | 'add' | 'sub' | 'mixed' | 'shape';

export interface LevelDef {
  id: number;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  kinds: QuestionKind[];
  stages: number;
  /** 레벨 클리어 시 받는 스티커 */
  sticker: { id: string; emoji: string; name: string };
}

export const QUESTIONS_PER_STAGE = 5;

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    title: '숫자 세기',
    subtitle: '1부터 10까지 세어봐요',
    emoji: '🍎',
    color: '#FF9F43',
    kinds: ['count', 'match'],
    stages: 3,
    sticker: { id: 'sticker-count', emoji: '🐣', name: '병아리' },
  },
  {
    id: 2,
    title: '숫자 비교',
    subtitle: '많다·적다, 크다·작다',
    emoji: '⚖️',
    color: '#4DA6FF',
    kinds: ['compare'],
    stages: 3,
    sticker: { id: 'sticker-compare', emoji: '🐰', name: '토끼' },
  },
  {
    id: 3,
    title: '덧셈 기초',
    subtitle: '그림으로 더해봐요',
    emoji: '➕',
    color: '#5FD068',
    kinds: ['add'],
    stages: 3,
    sticker: { id: 'sticker-add', emoji: '🦊', name: '여우' },
  },
  {
    id: 4,
    title: '뺄셈 기초',
    subtitle: '그림으로 빼봐요',
    emoji: '➖',
    color: '#FF8FB1',
    kinds: ['sub'],
    stages: 3,
    sticker: { id: 'sticker-sub', emoji: '🐬', name: '돌고래' },
  },
  {
    id: 5,
    title: '덧셈뺄셈 퀴즈',
    subtitle: '섞어서 풀어봐요',
    emoji: '🎯',
    color: '#A98BFF',
    kinds: ['mixed'],
    stages: 4,
    sticker: { id: 'sticker-mixed', emoji: '🦁', name: '사자' },
  },
];

export const getLevel = (id: number): LevelDef | undefined => LEVELS.find((l) => l.id === id);

/** 사이드바 자유 놀이 메뉴 (레벨 진행과 무관하게 언제든 연습) */
export interface PracticeDef {
  key: string;
  title: string;
  emoji: string;
  color: string;
  kind: QuestionKind;
}

export const PRACTICES: PracticeDef[] = [
  { key: 'number', title: '숫자 인식', emoji: '🔢', color: '#4DA6FF', kind: 'match' },
  { key: 'shape', title: '도형 놀이', emoji: '🔷', color: '#A98BFF', kind: 'shape' },
];
