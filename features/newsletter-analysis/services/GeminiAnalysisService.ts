import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';
import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Child, Event, MealPlan, UploadedDoc } from '../../../types/models';
import { toISODate } from '../../../utils/date';
import { getVertexAIModel } from './firebaseAI';

// "8월 20일" 같은 월/일 표기 (연도 없음)
const MONTH_DAY_RE = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/;
// "2026.8.20" / "2026-08-20" / "2026/8/20" 같은 연-월-일 표기
const FULL_DATE_RE = /(\d{4})\s*[.\-\/]\s*(\d{1,2})\s*[.\-\/]\s*(\d{1,2})/;

function toDateISO(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/** 줄 텍스트에서 날짜를 찾아 ISO 문자열로 변환. 연도가 없으면 오늘 날짜 기준으로 보정. */
function extractDateFromLine(line: string, todayISO: string): { date: string; matchedText: string } | null {
  const fullMatch = line.match(FULL_DATE_RE);
  if (fullMatch) {
    const date = toDateISO(Number(fullMatch[1]), Number(fullMatch[2]), Number(fullMatch[3]));
    if (date) return { date, matchedText: fullMatch[0] };
  }

  const monthDayMatch = line.match(MONTH_DAY_RE);
  if (monthDayMatch) {
    const todayYear = Number(todayISO.slice(0, 4));
    const month = Number(monthDayMatch[1]);
    const day = Number(monthDayMatch[2]);
    let date = toDateISO(todayYear, month, day);
    if (date) {
      // 오늘보다 두 달 이상 과거면 연도가 넘어간 공지일 가능성이 높아 다음 해로 보정
      if (date < todayISO && todayISO.slice(0, 10) > `${todayYear}-${String(Math.max(month, 1)).padStart(2, '0')}-01`) {
        const monthsBehind = (new Date(todayISO).getFullYear() - todayYear) * 12
          + (new Date(todayISO).getMonth() + 1 - month);
        if (monthsBehind >= 2) {
          date = toDateISO(todayYear + 1, month, day);
        }
      }
      if (date) return { date, matchedText: monthDayMatch[0] };
    }
  }

  return null;
}

/** OCR로 뽑아낸 줄 목록에서 날짜가 포함된 줄을 찾아 일정으로 변환 (온디바이스 규칙 기반 — Gemini 대비 정확도가 낮음). */
function buildEventsFromLines(lines: string[], todayISO: string, childId: string): Omit<Event, 'id'>[] {
  const events: Omit<Event, 'id'>[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const found = extractDateFromLine(line, todayISO);
    if (!found) continue;

    let title = line.replace(found.matchedText, '').trim().replace(/^[:\-–,.\s]+/, '');
    if (title.length < 2 && lines[i + 1]?.trim()) {
      title = lines[i + 1].trim();
    }
    if (!title) title = '일정 확인 필요';

    events.push({
      date: found.date,
      title: title.length > 30 ? `${title.slice(0, 30)}…` : title,
      childId,
      source: 'ai' as const,
      icon: '📌',
      needsReview: true,
      reviewReason: '온디바이스 텍스트 인식 결과예요. 날짜/내용을 꼭 확인해주세요.',
    });
  }

  return events;
}

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

interface GeminiExtractedMealPlan {
  date?: string;
  menu?: string[];
}

export interface GeminiAnalysisResult {
  events: Omit<Event, 'id'>[];
  mealPlans: Omit<MealPlan, 'id'>[];
}

function extractMealPlans(
  raw: GeminiExtractedMealPlan[] | undefined,
  childId: string
): Omit<MealPlan, 'id'>[] {
  return (raw ?? [])
    .filter((m): m is Required<Pick<GeminiExtractedMealPlan, 'date'>> & GeminiExtractedMealPlan =>
      !!m.date && Array.isArray(m.menu) && m.menu.length > 0
    )
    .map((m) => ({
      date: m.date,
      menu: (m.menu ?? []).map((item) => item.trim()).filter(Boolean),
      childId,
    }));
}

export const GeminiAnalysisService = {
  /** 서버 호출 없이 기기 안에서만 OCR + 규칙 기반으로 일정을 추출. Gemini API는 전혀 호출하지 않음. */
  async analyze(docs: UploadedDoc[], child: Child): Promise<GeminiAnalysisResult> {
    const imageDocs = docs.filter((d) => d.kind === 'image');
    if (imageDocs.length === 0) {
      throw new GeminiAnalysisError('온디바이스 분석은 사진만 지원해요. PDF 대신 사진으로 올려주세요.');
    }

    const todayISO = toISODate(new Date());
    const allLines: string[] = [];

    for (const doc of imageDocs) {
      try {
        const result = await TextRecognition.recognize(doc.uri, TextRecognitionScript.KOREAN);
        for (const block of result.blocks) {
          for (const line of block.lines) {
            allLines.push(line.text);
          }
        }
      } catch (e) {
        console.warn('[OnDeviceOCR] Failed to recognize text for doc:', doc.uri, e);
      }
    }

    const events = buildEventsFromLines(allLines, todayISO, child.id);
    if (events.length === 0) {
      throw new GeminiAnalysisError(
        '사진에서 날짜가 포함된 일정을 찾지 못했어요. 더 선명한 사진으로 다시 시도하거나 직접 입력해주세요.'
      );
    }

    // 온디바이스 규칙 기반 파서는 표 형태의 식단표까지 구조화하지 못해 급식표는 추출하지 않음.
    return { events, mealPlans: [] };
  },

  async analyzeWithVertexAI(docs: UploadedDoc[], child: Child): Promise<GeminiAnalysisResult> {
    try {
      const model = getVertexAIModel();
      const todayISO = toISODate(new Date());
      const prompt = this.buildPrompt(todayISO, child);

      const parts = await Promise.all(docs.map(async (doc) => {
        const { base64, mimeType } = await this.getOptimizedBase64(doc);
        return {
          inlineData: {
            mimeType,
            data: base64,
          }
        };
      }));

      const result = await model.generateContent([prompt, ...parts]);
      const response = await result.response;
      const text = response.text();

      const parsed: { events?: GeminiExtractedEvent[]; mealPlan?: GeminiExtractedMealPlan[] } = JSON.parse(text);
      const extracted = (parsed.events ?? []).filter(
        (e): e is Required<Pick<GeminiExtractedEvent, 'date' | 'title'>> & GeminiExtractedEvent =>
          !!e.date && !!e.title
      );

      if (extracted.length === 0) {
        throw new GeminiAnalysisError('문서에서 일정을 찾지 못했어요.');
      }

      return {
        events: extracted.map((e) => ({
          date: e.date,
          title: e.title.trim(),
          note: e.note?.trim() || undefined,
          memo: e.memo?.trim() || undefined,
          childId: child.id,
          source: 'ai' as const,
          icon: e.icon?.trim() || '📌',
          needsReview: e.needsReview || undefined,
          reviewReason: e.reviewReason?.trim() || undefined,
        })),
        mealPlans: extractMealPlans(parsed.mealPlan, child.id),
      };
    } catch (err: any) {
      console.error('[VertexAI] Error:', err);
      let message = err.message || '프로덕션 분석 엔진 오류가 발생했습니다.';
      if (message.includes('429') || message.toLowerCase().includes('quota')) {
        message = '현재 분석 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
      }
      throw new GeminiAnalysisError(message);
    }
  },

  async getOptimizedBase64(doc: UploadedDoc): Promise<{ base64: string; mimeType: string }> {
    let uri = doc.uri;
    const mimeType = this.guessMimeType(doc);

    // Optimize images before sending to AI (Resize for faster OCR and less token usage)
    if (doc.kind === 'image' && !uri.endsWith('.pdf')) {
      try {
        const result = await manipulateAsync(
          uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.6, format: SaveFormat.JPEG } // Further compressed
        );
        uri = result.uri;
      } catch (e) {
        console.warn('Failed to optimize image for AI:', e);
      }
    }

    const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
    return { base64, mimeType };
  },

  guessMimeType(doc: UploadedDoc): string {
    const lower = (doc.name ?? doc.uri).toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.pdf')) return 'application/pdf';
    return doc.kind === 'image' ? 'image/jpeg' : 'application/pdf';
  },

  buildPrompt(todayISO: string, child: Child): string {
    return `당신은 유치원/어린이집 가정통신문 전문 분석가입니다.
제공된 이미지에서 학부모가 캘린더에 등록하고 관리해야 할 모든 일정과 정보를 추출하세요.

[분석 제 1원칙: 대상 아이 맞춤 분석]
- 추출하는 모든 정보의 최우선 순위는 아래 [대상 아이 정보]와 일치하는 항목입니다.
- 통신문에 여러 연령(예: 5세, 6세, 7세)이나 여러 반(예: 햇살반, 하늘반)의 정보가 섞여 있다면, 반드시 해당 아이와 관련된 내용만 선별하여 추출하세요. 다른 연령/반의 정보는 절대 포함하지 마십시오.

[나이 및 반 판별 규칙]
- 한국 유치원/어린이집의 나이 표기 방식을 이해하고 적용하세요.
- "일상 나이(한국 나이)"와 "만 나이"가 혼용될 경우, 괄호 안이나 문맥상 명시된 일상 나이를 기준으로 반을 판별합니다.
- 예시 A: "만 4세(6세) 해바라기반" ➡️ 6세 아이(4세반 아님)를 위한 정보로 간주.
- 예시 B: "4세반, 5세반 친구들" ➡️ 4세반과 5세반 모두 포함.
- 예시 C: "7세 형님반을 제외한 모든 유아(5, 6세)" ➡️ 5세, 6세 대상 정보로 간주.

[대상 아이 정보]
- 이름: ${child.name ?? '아이'}
- 연령: ${child.age}세 (이 연령에 해당하는 정보만 추출)
- 소속 반: ${child.className ?? '반 정보 없음'} (이 반에 명시적으로 해당하거나, '전체' 대상인 일정만 추출)

[현재 기준 날짜]
- 오늘: ${todayISO}

[추출 규칙]
1. 날짜 처리:
   - "YYYY-MM-DD" 형식으로 작성하세요.
   - 연도 정보가 없으면 ${todayISO}의 연도를 따릅니다.
   - "이번 주 목요일" 같은 표현은 기준 날짜로부터 계산하세요.

2. 필터링 및 우선순위:
   - 아이의 '연령'이나 '소속 반'이 언급된 항목을 최우선으로 찾으세요.
   - 단순 공지 사항보다는 '행사', '준비물', '제출물', '휴원일' 등 부모의 행동이 필요한 항목 위주로 추출하세요.

3. 필드 작성:
   - title: 15자 이내 (예: "여름 소풍", "6세 현장학습")
   - note: 반드시 챙겨야 할 '물건' 이름만 담으세요. 쇼핑 검색이 용이하도록 "금액"이나 "포장 조건" 등은 제외하고 핵심 물건 명칭만 적으세요. (예: "물통\\n도시락\\n운동화")
   - memo: 금액, 장소, 시간, 복장, 혹은 "3,000원 이내", "개별 포장" 같은 구체적인 조건을 요약하세요.
   - 구매 판별 중요: '독서통장', '원복', '교재' 등 유치원에서 지급되어 가져가기만 하면 되는 항목이나 '제출'이 들어가는 항목은 구매가 불필요하므로 가급적 note가 아닌 memo에 포함시키거나, note에 넣더라도 명확히 표기하세요.
   - icon: 성격에 맞는 이모지 1개

4. 출력 및 신뢰도:
   - 반드시 정해진 JSON 형식으로만 결괏값을 출력하세요. 불필요한 서술이나 설명은 절대 포함하지 마세요.
   - 확실하지 않은 날짜나 내용은 'needsReview: true'로 표시하고 이유를 'reviewReason'에 적으세요.

[급식 식단표 추출]
- 가정통신문에 주간 또는 월간 식단표(요일별/날짜별 급식 메뉴가 나열된 표)가 포함되어 있다면, "mealPlan" 배열로 별도 추출하세요.
- 각 항목은 날짜(date, "YYYY-MM-DD")와 그날의 메뉴 목록(menu, 문자열 배열 — 예: ["흰쌀밥", "미역국", "제육볶음", "배추김치"])으로 구성하세요.
- 요일만 적혀 있고 날짜가 명시되지 않았다면, [현재 기준 날짜]를 기준으로 그 주(월~금)의 실제 날짜로 환산하세요.
- 식단표가 아예 없으면 "mealPlan"은 빈 배열([])로 반환하세요. 이는 오류가 아니라 정상적인 결과입니다.`;
  }
};
