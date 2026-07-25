import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';
import { Child, Event, UploadedDoc } from '../types/models';
import { toISODate } from './date';

/**
 * Real Gemini Vision analysis of uploaded 가정통신문 photos/PDFs. The API key
 * is read from EXPO_PUBLIC_GEMINI_API_KEY (set in a git-ignored .env file) —
 * note this ships inside the client bundle since this app has no backend, so
 * it's only appropriate for personal/testing use, not a public release.
 */
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export class GeminiAnalysisError extends Error {}

interface GeminiExtractedEvent {
  date?: string;
  title?: string;
  note?: string;
  memo?: string;
  icon?: string;
  needsReview?: boolean;
  reviewReason?: string;
}

function guessMimeType(doc: UploadedDoc): string {
  const lower = (doc.name ?? doc.uri).toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return doc.kind === 'image' ? 'image/jpeg' : 'application/pdf';
}

async function docToInlinePart(doc: UploadedDoc) {
  const base64 = await readAsStringAsync(doc.uri, { encoding: EncodingType.Base64 });
  return { inline_data: { mime_type: guessMimeType(doc), data: base64 } };
}

function buildPrompt(todayISO: string, child: Child): string {
  return `당신은 유치원/어린이집에서 발행한 가정통신문을 분석하는 도우미입니다.
첨부된 이미지/문서는 하나 이상의 가정통신문입니다. 문서 안에서 학부모가 챙겨야 할 일정(행사, 준비물, 제출 마감일 등)을 모두 찾아 JSON으로 추출해주세요.

오늘 날짜: ${todayISO}
대상 아이: ${child.name ?? '아이'} (${child.age}세, ${child.className ?? '반 정보 없음'})

규칙:
- date는 반드시 "YYYY-MM-DD" 형식의 절대 날짜로 변환하세요. "이번주 금요일", "다음달 초"처럼 상대적인 표현이 있으면 오늘 날짜를 기준으로 계산하세요. 연도 표기가 없으면 오늘 날짜의 연도를 사용하세요.
- title은 15자 이내의 간결한 일정 제목으로 작성하세요.
- note에는 준비물이 있다면 쉼표로 구분해 적어주세요. 없으면 생략하세요.
- memo에는 유의사항이나 추가 설명이 있다면 적어주세요. 없으면 생략하세요.
- icon은 일정 성격에 어울리는 이모지 1개를 추천하세요 (예: 소풍=🚌, 준비물=🎒, 병원=🏥, 사진=📷, 생일=🎂).
- 날짜나 내용이 불명확하거나 문서 화질 때문에 추정한 경우 needsReview를 true로 하고 reviewReason에 이유를 짧게 한국어로 적어주세요.
- 문서에서 일정을 찾을 수 없으면 events를 빈 배열로 반환하세요.
- 절대 문서에 없는 내용을 지어내지 마세요.`;
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    events: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING' },
          title: { type: 'STRING' },
          note: { type: 'STRING' },
          memo: { type: 'STRING' },
          icon: { type: 'STRING' },
          needsReview: { type: 'BOOLEAN' },
          reviewReason: { type: 'STRING' },
        },
        required: ['date', 'title'],
      },
    },
  },
  required: ['events'],
};

/** Analyzes the given documents with Gemini and returns extracted calendar events for `child`. */
export async function analyzeDocumentsWithGemini(
  docs: UploadedDoc[],
  child: Child | undefined
): Promise<Omit<Event, 'id'>[]> {
  if (!GEMINI_API_KEY) {
    throw new GeminiAnalysisError(
      'Gemini API 키가 설정되지 않았어요. .env의 EXPO_PUBLIC_GEMINI_API_KEY를 확인해주세요.'
    );
  }
  if (!child) {
    throw new GeminiAnalysisError('먼저 아이 프로필을 선택해주세요.');
  }
  if (docs.length === 0) {
    throw new GeminiAnalysisError('분석할 문서가 없어요.');
  }

  const todayISO = toISODate(new Date());
  const parts = await Promise.all(docs.map(docToInlinePart));

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: buildPrompt(todayISO, child) }, ...parts],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  let response: Response;
  try {
    response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new GeminiAnalysisError('네트워크 연결을 확인해주세요.');
  }

  if (!response.ok) {
    let message = `문서 분석에 실패했어요 (${response.status}).`;
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) message = `문서 분석에 실패했어요: ${errJson.error.message}`;
    } catch {
      // Keep the generic status-code message above.
    }
    throw new GeminiAnalysisError(message);
  }

  const json = await response.json();
  const rawText: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new GeminiAnalysisError('분석 결과를 읽지 못했어요. 다시 시도해주세요.');
  }

  let parsed: { events?: GeminiExtractedEvent[] };
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new GeminiAnalysisError('분석 결과 형식이 올바르지 않아요.');
  }

  const extracted = (parsed.events ?? []).filter(
    (e): e is Required<Pick<GeminiExtractedEvent, 'date' | 'title'>> & GeminiExtractedEvent =>
      !!e.date && !!e.title
  );

  if (extracted.length === 0) {
    throw new GeminiAnalysisError('문서에서 일정을 찾지 못했어요. 더 선명한 사진으로 다시 시도해주세요.');
  }

  return extracted.map((e) => ({
    date: e.date,
    title: e.title.trim(),
    note: e.note?.trim() || undefined,
    memo: e.memo?.trim() || undefined,
    childId: child.id,
    source: 'ai' as const,
    icon: e.icon?.trim() || '📌',
    needsReview: e.needsReview || undefined,
    reviewReason: e.reviewReason?.trim() || undefined,
  }));
}
