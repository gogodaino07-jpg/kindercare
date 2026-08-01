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
const GEMINI_MODEL = 'gemini-3-flash-preview';
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
  return `당신은 유치원/어린이집 가정통신문 전문 분석가입니다.
제공된 이미지에서 학부모가 캘린더에 등록하고 관리해야 할 모든 일정과 정보를 추출하세요.

[대상 아이 정보]
- 이름: ${child.name ?? '아이'}
- 연령: ${child.age}세
- 소속 반: ${child.className ?? '반 정보 없음'} (이 반에 해당하거나 전체 대상인 일정만 추출하세요)

[현재 기준 날짜]
- 오늘: ${todayISO}

[추출 규칙]
1. 날짜 처리:
   - "YYYY-MM-DD" 형식으로 작성하세요.
   - 연도 정보가 없으면 ${todayISO}의 연도를 따릅니다.
   - "이번 주 목요일" 같은 표현은 기준 날짜로부터 계산하세요.
   - 기간 일정(예: 10일~12일)은 시작일과 종료일을 각각 개별 일정으로 분리하거나, 가장 중요한 날(행사 당일)을 기준으로 하나만 추출하세요.

2. 필터링:
   - 아이의 '소속 반' 정보가 통신문에 언급되어 있다면, 다른 반의 일정은 제외하고 이 아이와 관련된 일정만 추출하세요.
   - 단순 안내 사항보다는 '행사', '준비물', '제출물', '휴원일' 등 행동이 필요한 항목 위주로 추출하세요.

3. 필드 작성:
   - title: 15자 이내 (예: "여름 소풍", "생일 파티")
   - note: 반드시 챙겨야 할 준비물 (없으면 생략)
   - memo: 시간(예: 9시까지 등원), 장소, 복장, 혹은 주의사항을 요약 (없으면 생략)
   - icon: 성격에 맞는 이모지 1개

4. 신뢰도:
   - 확실하지 않은 날짜나 내용은 'needsReview: true'로 표시하고 이유를 'reviewReason'에 적으세요.
   - 절대 없는 내용을 지어내지 마세요.`;
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
    let message = `문서 분석에 실패했어요 (HTTP ${response.status})`;
    try {
      const errJson = await response.json();
      console.error('Gemini API Error Detail:', JSON.stringify(errJson, null, 2));
      if (errJson?.error?.message) {
        message = `Gemini 오류: ${errJson.error.message}`;
      }
    } catch (e) {
      console.error('Failed to parse Gemini error JSON', e);
    }
    throw new GeminiAnalysisError(message);
  }

  const json = await response.json();
  console.log('Gemini API Success Response:', JSON.stringify(json, null, 2));
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
