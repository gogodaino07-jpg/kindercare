// 문제 생성기
// 레벨/연습 종류(kind)에 맞춰 랜덤 문제를 만들어 준다.
// 모든 문제는 "그림(사물 개수)"으로도 표현되도록 visual 정보를 함께 담는다.
import { QuestionKind } from '../constants/levels';

export type ShapeKey = 'circle' | 'square' | 'triangle' | 'star' | 'heart';

export const SHAPES: { key: ShapeKey; name: string; emoji: string }[] = [
  { key: 'circle', name: '동그라미', emoji: '🔵' },
  { key: 'square', name: '네모', emoji: '🟥' },
  { key: 'triangle', name: '세모', emoji: '🔺' },
  { key: 'star', name: '별', emoji: '⭐' },
  { key: 'heart', name: '하트', emoji: '💛' },
];

const OBJECTS = ['🍎', '🍌', '🐥', '🐟', '🍪', '🎈', '🌼', '🐝', '🍓', '🚗'];

/** 문제 화면 가운데에 그려지는 시각 자료 */
export type Visual =
  | { type: 'objects'; emoji: string; count: number }
  | { type: 'number'; value: number }
  | { type: 'operation'; emoji: string; left: number; right: number; op: '+' }
  | { type: 'takeaway'; emoji: string; total: number; remove: number }
  | { type: 'none' };

/** 정답 카드에 그려지는 내용 */
export type ChoiceView =
  | { type: 'text'; text: string }
  | { type: 'objects'; emoji: string; count: number }
  | { type: 'shape'; emoji: string };

export interface Question {
  id: string;
  kind: QuestionKind;
  prompt: string;
  visual: Visual;
  choices: ChoiceView[];
  answerIndex: number;
  hint: string;
}

const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T,>(arr: readonly T[]): T => arr[randInt(0, arr.length - 1)];

/** 정답 주변 값으로 오답 보기를 만든다 (중복 없이, 0 미만 제외) */
function numberChoices(answer: number, count: number, max = 20): number[] {
  const set = new Set<number>([answer]);
  let guard = 0;
  while (set.size < count && guard < 100) {
    guard += 1;
    const delta = pick([-3, -2, -1, 1, 2, 3]);
    const candidate = answer + delta;
    if (candidate >= 0 && candidate <= max) set.add(candidate);
  }
  // 그래도 모자라면 순서대로 채운다
  let fill = 0;
  while (set.size < count && fill <= max) {
    set.add(fill);
    fill += 1;
  }
  return shuffle([...set]).slice(0, count);
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

let seq = 0;
const nextId = () => {
  seq += 1;
  return `q-${Date.now().toString(36)}-${seq}`;
};

// 1단계: 사물 개수 세기
function makeCount(): Question {
  const emoji = pick(OBJECTS);
  const answer = randInt(1, 10);
  const options = numberChoices(answer, 4, 10);
  return {
    id: nextId(),
    kind: 'count',
    prompt: '모두 몇 개일까요?',
    visual: { type: 'objects', emoji, count: answer },
    choices: options.map((n) => ({ type: 'text', text: String(n) })),
    answerIndex: options.indexOf(answer),
    hint: '하나씩 콕콕 짚으면서 같이 세어볼까요?',
  };
}

// 1단계: 숫자 - 사물 매칭 (숫자를 보고 같은 개수의 그림 고르기)
function makeMatch(): Question {
  const emoji = pick(OBJECTS);
  const answer = randInt(1, 10);
  const options = numberChoices(answer, 3, 10);
  return {
    id: nextId(),
    kind: 'match',
    prompt: '숫자와 개수가 같은 그림을 골라요',
    visual: { type: 'number', value: answer },
    choices: options.map((n) => ({ type: 'objects', emoji, count: n })),
    answerIndex: options.indexOf(answer),
    hint: `${answer}개인 그림을 찾아요. 하나씩 세어보면 쉬워요!`,
  };
}

// 2단계: 숫자 비교 (많다/적다, 크다/작다)
function makeCompare(): Question {
  const useObjects = Math.random() < 0.5;
  let a = randInt(1, 9);
  let b = randInt(1, 9);
  while (a === b) b = randInt(1, 9);
  const askBigger = Math.random() < 0.5;
  const answerValue = askBigger ? Math.max(a, b) : Math.min(a, b);

  if (useObjects) {
    const emoji = pick(OBJECTS);
    const options = shuffle([a, b]);
    return {
      id: nextId(),
      kind: 'compare',
      prompt: askBigger ? '어느 쪽이 더 많을까요?' : '어느 쪽이 더 적을까요?',
      visual: { type: 'none' },
      choices: options.map((n) => ({ type: 'objects', emoji, count: n })),
      answerIndex: options.indexOf(answerValue),
      hint: askBigger
        ? '양쪽을 세어보고 더 많은 쪽을 골라요.'
        : '양쪽을 세어보고 더 적은 쪽을 골라요.',
    };
  }

  const options = shuffle([a, b]);
  return {
    id: nextId(),
    kind: 'compare',
    prompt: askBigger ? '어느 숫자가 더 클까요?' : '어느 숫자가 더 작을까요?',
    visual: { type: 'none' },
    choices: options.map((n) => ({ type: 'text', text: String(n) })),
    answerIndex: options.indexOf(answerValue),
    hint: `${Math.max(a, b)}가 ${Math.min(a, b)}보다 커요.`,
  };
}

// 3단계: 덧셈 기초
function makeAdd(): Question {
  const emoji = pick(OBJECTS);
  const left = randInt(1, 5);
  const right = randInt(1, 5);
  const answer = left + right;
  const options = numberChoices(answer, 4, 12);
  return {
    id: nextId(),
    kind: 'add',
    prompt: `${left} + ${right} 은 얼마일까요?`,
    visual: { type: 'operation', emoji, left, right, op: '+' },
    choices: options.map((n) => ({ type: 'text', text: String(n) })),
    answerIndex: options.indexOf(answer),
    hint: `${left}개에서 ${right}개를 더 세어봐요.`,
  };
}

// 4단계: 뺄셈 기초
function makeSub(): Question {
  const emoji = pick(OBJECTS);
  const total = randInt(3, 9);
  const remove = randInt(1, total - 1);
  const answer = total - remove;
  const options = numberChoices(answer, 4, 12);
  return {
    id: nextId(),
    kind: 'sub',
    prompt: `${total} - ${remove} 은 얼마일까요?`,
    visual: { type: 'takeaway', emoji, total, remove },
    choices: options.map((n) => ({ type: 'text', text: String(n) })),
    answerIndex: options.indexOf(answer),
    hint: `${total}개 중에서 ${remove}개가 빠졌어요. 남은 것을 세어봐요.`,
  };
}

// 도형 놀이
function makeShape(): Question {
  const options = shuffle(SHAPES).slice(0, 4);
  const answer = options[randInt(0, options.length - 1)];
  return {
    id: nextId(),
    kind: 'shape',
    prompt: `${answer.name}를 찾아봐요`,
    visual: { type: 'none' },
    choices: options.map((s) => ({ type: 'shape', emoji: s.emoji })),
    answerIndex: options.indexOf(answer),
    hint: `${answer.name} 모양을 떠올려 보세요.`,
  };
}

export function makeQuestion(kind: QuestionKind): Question {
  switch (kind) {
    case 'count':
      return makeCount();
    case 'match':
      return makeMatch();
    case 'compare':
      return makeCompare();
    case 'add':
      return makeAdd();
    case 'sub':
      return makeSub();
    case 'shape':
      return makeShape();
    case 'mixed':
    default:
      return Math.random() < 0.5 ? makeAdd() : makeSub();
  }
}

/** 한 스테이지(또는 연습 한 판) 분량의 문제 목록 */
export function makeQuestionSet(kinds: QuestionKind[], count: number): Question[] {
  return Array.from({ length: count }, (_, i) => makeQuestion(kinds[i % kinds.length]));
}
