import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Child, Event, EventItem, MealPlan, UploadedDoc } from '../../../types/models';
import { toISODate } from '../../../utils/date';
import { getFunctions } from '../../../utils/firebase';

export class GeminiAnalysisError extends Error {}

interface GeminiExtractedItem {
  name?: string;
  needsReview?: boolean;
  reviewReason?: string;
}

interface GeminiExtractedEvent {
  date?: string;
  title?: string;
  memo?: string;
  items?: GeminiExtractedItem[];
  category?: string;
  location?: string;
  time?: string;
  noticeText?: string;
  icon?: string;
  needsReview?: boolean;
  reviewReason?: string;
}

interface GeminiExtractedMealPlan {
  date?: string;
  menu?: string[];
  mainMenu?: string;
}

export interface GeminiAnalysisResult {
  events: Omit<Event, 'id'>[];
  mealPlans: Omit<MealPlan, 'id'>[];
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          title: { type: 'string' },
          memo: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                needsReview: { type: 'boolean' },
                reviewReason: { type: 'string' },
              },
              required: ['name'],
            },
          },
          category: { type: 'string' },
          location: { type: 'string' },
          time: { type: 'string' },
          noticeText: { type: 'string' },
          icon: { type: 'string' },
          needsReview: { type: 'boolean' },
          reviewReason: { type: 'string' },
        },
        required: ['date', 'title'],
      },
    },
    mealPlan: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          menu: { type: 'array', items: { type: 'string' } },
          mainMenu: { type: 'string' },
        },
        required: ['date', 'menu'],
      },
    },
  },
  required: ['events'],
};

let itemIdCounter = 0;
function buildEventItems(raw: GeminiExtractedItem[] | undefined): EventItem[] | undefined {
  const items = (raw ?? [])
    .map((i) => ({ name: i.name?.trim() ?? '', needsReview: i.needsReview, reviewReason: i.reviewReason?.trim() }))
    .filter((i) => i.name.length > 0);
  if (items.length === 0) return undefined;
  return items.map(({ name, needsReview, reviewReason }) => ({
    id: `ai-${Date.now()}-${itemIdCounter++}`,
    name,
    needsReview: needsReview || undefined,
    reviewReason: needsReview ? reviewReason : undefined,
  }));
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
      mainMenu: m.mainMenu?.trim() || undefined,
      childId,
    }));
}

function formatReferenceEvents(events: Omit<Event, 'id'>[]): string {
  if (events.length === 0) return '(참고할 기존 일정 없음)';
  return events
    .map((e) => {
      const itemNames = (e.items ?? []).map((i) => i.name).filter(Boolean);
      const itemsPart = itemNames.length > 0 ? itemNames.join(', ') : '없음';
      return `- ${e.date} ${e.title}${e.category ? ` [${e.category}]` : ''} — 준비물: ${itemsPart}`;
    })
    .join('\n');
}

export const GeminiAnalysisService = {
  /**
   * Gemini 키는 앱에 절대 내려주지 않는다 — Cloud Functions(analyzeNewsletter)가
   * 서버에서 키를 붙여 Gemini를 대신 호출해주는 프록시 역할을 하고, 앱은 로그인된
   * 사용자로서 그 함수만 호출한다(프롬프트 조립·이미지 압축·결과 파싱은 그대로 앱에서 함).
   */
  async analyze(
    docs: UploadedDoc[],
    child: Child,
    existingEvents: Omit<Event, 'id'>[] = [],
    usageType: 'newsletter' | 'meal' = 'newsletter'
  ): Promise<GeminiAnalysisResult> {
    const todayISO = toISODate(new Date());
    const parts = await Promise.all(docs.map(async (doc) => {
      const { base64, mimeType } = await this.getOptimizedBase64(doc);
      return {
        inline_data: {
          mime_type: mimeType,
          data: base64
        }
      };
    }));

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: this.buildPrompt(todayISO, child, existingEvents) }, ...parts],
        },
      ],
      generation_config: {
        response_mime_type: 'application/json',
        response_schema: RESPONSE_SCHEMA,
      },
    };

    let json: any;
    try {
      const result = await getFunctions().httpsCallable('analyzeNewsletter')({ body, usageType });
      json = result.data;
    } catch (err: any) {
      console.error('[Gemini Proxy Error]:', err);
      const code = String(err?.code ?? '');
      if (code.includes('resource-exhausted')) {
        throw new GeminiAnalysisError('AI 분석 요청이 너무 많습니다. 1분만 기다렸다가 다시 시도해 주세요.');
      }
      if (code.includes('unauthenticated')) {
        throw new GeminiAnalysisError('로그인이 필요해요. 다시 로그인해주세요.');
      }
      if (code.includes('unavailable') || code.includes('deadline-exceeded')) {
        throw new GeminiAnalysisError('네트워크 연결을 확인해주세요.');
      }
      throw new GeminiAnalysisError(err?.message || '문서 분석에 실패했어요. 잠시 후 다시 시도해주세요.');
    }

    const rawText: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new GeminiAnalysisError('분석 결과를 읽지 못했어요. 다시 시도해주세요.');
    }

    let parsed: { events?: GeminiExtractedEvent[]; mealPlan?: GeminiExtractedMealPlan[] };
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

    return {
      events: extracted.map((e) => {
        const items = buildEventItems(e.items);
        return {
          date: e.date,
          title: e.title.trim(),
          note: items ? items.map((i) => i.name).join('\n') : undefined,
          memo: e.memo?.trim() || undefined,
          items,
          category: e.category?.trim() || undefined,
          location: e.location?.trim() || undefined,
          time: e.time?.trim() || undefined,
          noticeText: e.noticeText?.trim() || undefined,
          childId: child.id,
          source: 'ai' as const,
          icon: e.icon?.trim() || '📌',
          needsReview: e.needsReview || undefined,
          reviewReason: e.reviewReason?.trim() || undefined,
        };
      }),
      mealPlans: extractMealPlans(parsed.mealPlan, child.id),
    };
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

  buildPrompt(todayISO: string, child: Child, existingEvents: Omit<Event, 'id'>[] = []): string {
    const referenceEventsBlock = formatReferenceEvents(existingEvents);
    return `당신은 유치원/어린이집 가정통신문 전문 분석가입니다.
제공된 이미지에서 학부모가 캘린더에 등록하고 관리해야 할 모든 일정과 정보를 추출하세요.

유치원/어린이집마다 통신문 형식이 매우 다양합니다 (주간교육계획안 표, 월간 행사표, 텍스트 위주 가정통신문 등). 특정 문구나 표 형식에 얽매이지 말고, 아래 원칙과 패턴을 유연하게 적용하세요.

[분석 제 1원칙: 대상 아이 맞춤 분석]
- 추출하는 모든 정보의 최우선 순위는 아래 [대상 아이 정보]와 일치하는 항목입니다.
- 통신문에 여러 연령(예: 5세, 6세, 7세)이나 여러 반(예: 햇살반, 하늘반)의 정보가 섞여 있다면, 반드시 해당 아이와 관련된 내용만 선별하여 추출하세요. 다른 연령/반의 정보는 절대 포함하지 마십시오.

[나이 및 반 판별 규칙]
- 한국 유치원/어린이집의 나이 표기 방식을 이해하고 적용하세요.
- "일상 나이(한국 나이)"와 "만 나이"가 혼용될 경우, 괄호 안이나 문맥상 명시된 일상 나이를 기준으로 반을 판별합니다.
- 예시 A: "만 4세(6세) 해바라기반" ➡️ 6세 아이(4세반 아님)를 위한 정보로 간주.
- 예시 B: "4세반, 5세반 친구들" ➡️ 4세반과 5세반 모두 포함.
- 예시 C: "7세 형님반을 제외한 모든 유아(5, 6세)" ➡️ 5세, 6세 대상 정보로 간주.
- 예시 D (반 이름 축약 표기, 매우 중요): 요일별 활동표나 일정표에서 반 이름을 맨 앞글자 한 글자로 축약해 괄호 안에 쉼표로 나열하는 경우가 매우 흔합니다 (예: "4세 생존수영(스, 프)" = 스웨덴반·프랑스반 대상, "수영복 착용 등원(캐, 덴)" = 캐나다반·덴마크반 대상). 이런 축약을 만나면 대상 아이의 소속 반 이름 맨 앞글자가 그 목록에 포함되는지로 판별하세요 — 소속 반이 "스웨덴반"인데 표에는 "스"라고만 적혀 있어도 반드시 같은 반으로 간주해 포함하고, 글자가 짧다고 무시하지 마세요. 같은 통신문 안에서 반 이름 전체(예: "스웨덴")가 나온 곳이 있다면 그걸로 축약 글자와 반 이름을 먼저 대응시켜 확인하세요.

[대상 아이 정보]
- 이름: ${child.name ?? '아이'}
- 연령: ${child.age}세 (이 연령에 해당하는 정보만 추출)
${
  child.className?.trim()
    ? `- 소속 반: ${child.className} (이 반에 명시적으로 해당하거나, '전체' 대상인 일정만 추출)`
    : `- 소속 반: 없음 (이 아이는 별도의 반 구분 없이 다니고 있습니다. 반 이름과 무관하게 연령(${child.age}세) 조건에 맞는 일정 위주로 판별하세요. 통신문에 특정 반 이름이 언급되어 있어도 나이 조건이 맞으면 포함하고, 나이 조건이 명백히 다른 반의 일정만 제외하세요.)`
}

[현재 기준 날짜]
- 오늘: ${todayISO}

[기존 등록된 일정 (연기·재개 판별용 참고 자료)]
아래는 이 아이의 캘린더에 이미 등록되어 있는 최근/예정 일정 목록입니다. 지금 분석할 통신문과는 별개의 자료이니, 통신문에 실제로 없는 내용을 함부로 지어내는 데 쓰지 말고 아래 4번 규칙의 용도로만 참고하세요.
${referenceEventsBlock}

[추출 규칙]
1. 날짜 처리:
   - "YYYY-MM-DD" 형식으로 작성하세요.
   - 연도 정보가 없으면 ${todayISO}의 연도를 따릅니다.
   - "이번 주 목요일" 같은 표현은 기준 날짜로부터 계산하세요.

2. 필터링 및 우선순위:
   - 아이의 '연령'이나 '소속 반'이 언급된 항목을 최우선으로 찾으세요.
   - 단순 공지 사항보다는 '행사', '준비물', '제출물', '휴원일' 등 부모의 행동이 필요한 항목 위주로 추출하세요.
   - 조건부 준비물 판별(중요): "생일인 친구 수만큼", "해당자만", "신청한 가정만"처럼 준비 여부나 개수가 다른 조건에 따라 달라지는 항목은, 같은 통신문 안에 있는 다른 표나 명단(예: 반별 생일자 명단표)을 실제로 대조해서 대상 아이의 반에 그 조건이 성립하는지 먼저 확인하세요. 대조 결과 대상 아이의 반에는 조건이 성립하지 않는다면(예: 이번 달 생일자가 없는 반) 그 준비물은 추출하지 말고, 필요하다면 해당 날짜의 다른 이벤트 noticeText나 memo에 "이번엔 해당 없음" 정도로만 짧게 남기세요.

3. 필드 작성:
   - title: 15자 이내 (예: "여름 소풍", "6세 현장학습"). 원문에 "5세 운동회"처럼 나이 표기가 활동명과 함께 붙어있다면, 나이 정보를 빠뜨리지 말고 반드시 title에 포함하세요 (예: "5세 운동회"를 "운동회"로 줄이지 마세요). 단, 원문에 나이가 명시되어 있지 않은 항목에는 나이를 임의로 추가하지 마세요.
   - items: 반드시 챙겨야 할 '물건'을 하나씩 개별 객체로 나눈 배열로 담으세요. 각 객체는 {name, needsReview?, reviewReason?} 형태이며, name에는 쇼핑 검색이 용이하도록 "금액"이나 "포장 조건" 등은 제외하고 핵심 물건 명칭만 적으세요 (예: [{"name": "물통"}, {"name": "도시락"}, {"name": "운동화"}]). 챙길 물건이 없으면 빈 배열([])로 두세요.
   - category: 이 일정의 성격을 아래 중 하나로 분류하세요 — "준비물"(물건을 챙겨야 함), "특별활동"(요리/체육 등 평소와 다른 활동), "행사"(현장학습/생일파티/발표회 등), "공지"(단순 안내, 제출/챙길 것 없음), "휴원/방학"(휴원일·재량휴업일·방학 안내).
   - location: 통신문에 장소가 명시되어 있을 때만 적으세요 (예: "조리실습실", "서울대공원"). 없으면 생략하세요.
   - time: 통신문에 "오전 10시", "하루 종일", "등원 직후"처럼 짧은 시각·시간대 표현이 명시되어 있을 때만 10자 내외로 적으세요 (예: "오전 10:30", "하루 종일"). "원내 활동시간내 진행 예정입니다"처럼 설명하는 문장은 절대 time에 넣지 마세요 — 그런 내용은 noticeText나 memo로 보내고, 짧은 시각 표현이 따로 없으면 time은 반드시 생략하세요.
   - noticeText: 학부모가 카드 상단에서 바로 읽을 수 있도록 핵심만 1~2문장으로 짧게 요약하세요 (예: "수박 화채 만들기 활동을 진행합니다. 옷이 더러워질 수 있어요."). 통신문 문장을 그대로 옮기지 말고 반드시 요약하세요.
   - memo: 금액, 복장, 혹은 "3,000원 이내", "개별 포장" 같은 구체적인 조건을 요약하세요. noticeText와 중복되지 않게, memo는 세부 조건 위주로 적으세요.
   - 구매 판별 중요: '독서통장', '원복', '교재' 등 유치원에서 지급되어 가져가기만 하면 되는 항목이나 '제출'이 들어가는 항목은 구매가 불필요하므로 가급적 items가 아닌 memo에 포함시키거나, items에 넣더라도 항목명에 명확히 표기하세요.
   - 기부/모금 캠페인 처리: "기부 물품", "모아주실 물품", "꾸러미 물품"처럼 아이 개인이 아니라 이웃/단체에 전달하기 위해 가정에서 준비해 보내는 품목도, 아이가 챙겨야 할 준비물과 동일하게 items 배열에 하나씩 나눠 담으세요 (예: "기부 물품: 통조림(참치, 햄), 도시락 김, 햇반" → [{"name": "통조림(참치, 햄)"}, {"name": "도시락 김"}, {"name": "햇반"}]). category도 "준비물"로 분류하고, 유통기한·개수 등 조건만 memo로 보내세요. 이런 캠페인 안내 전체를 noticeText나 memo에 뭉뚱그려 넣고 items를 비워두지 마세요.
   - icon: 성격에 맞는 이모지 1개

4. 기존 일정의 연기·재개 처리 (위 [기존 등록된 일정] 참고) — 이 규칙은 선택이 아니라 필수입니다:
   - 통신문이 "재활동", "우천으로 연기", "다시 진행", "순연" 등 이미 등록된 일정과 같은 활동을 날짜만 바꿔 다시 안내하는 내용인지 먼저 판단하세요.
   - 매칭은 제목 글자가 똑같은지로 하지 마세요. [기존 등록된 일정]의 제목이 통신문 속 활동명과 다르게 적혀 있어도(예: 참고 일정 제목은 "4세 한울 여름 축제"인데 그 준비물이 수건·방수가방·수영복·속옷·갈아입을옷·샌들이라면, 이는 사실상 "물놀이" 활동입니다), 참고 일정의 준비물 구성이나 통신문 문맥으로 볼 때 같은 성격의 활동이면 같은 일정으로 간주하세요.
   - 같은 활동으로 판단했다면, 새로 만드는 이벤트의 items를 절대 비워두거나 통신문에 다시 언급된 몇 개만 넣고 끝내지 마세요. 참고한 기존 일정의 items 전체를 기본값으로 가져오고, 통신문에 새로 언급된 준비물이 있으면 그것도 합쳐서(중복 제거) 빠짐없이 채우세요.
   - 예시: 참고 일정에 "4세 한울 여름 축제 — 준비물: 수건, 방수가방, 수영복, 속옷, 갈아입을옷, 샌들"이 있고, 통신문이 "우천으로 중단된 물놀이를 내일 다시 진행합니다. 수영복을 입혀 보내주시고 수건·속옷·양말을 챙겨주세요"라고만 안내한다면 → 새 이벤트의 items는 통신문에 언급된 것(수영복, 수건, 속옷, 양말)만이 아니라 참고 일정의 방수가방, 갈아입을옷, 샌들까지 모두 포함해 [수건, 방수가방, 수영복, 속옷, 갈아입을옷, 샌들, 양말]처럼 빠짐없이 채우세요.
   - 참고한 기존 일정과 명백히 다른 활동이거나, 통신문에서 이번엔 준비물이 필요 없다고 명시했다면 억지로 채우지 마세요.

5. 요일별 활동/특강 표 처리:
   - "특강 및 행사", "특별활동", "특강", "대소집단 활동"처럼 요일별로 과목이나 활동명이 나열된 표(예: 월=영어, 화=체육, 수=태권도/오감)가 있다면, 하트(♥)나 빈칸처럼 특별한 내용이 없는 날은 건너뛰고, 실제 과목/활동명이 적힌 날짜만 각각 하나의 이벤트로 추출하세요.
   - 이런 이벤트의 title은 과목/활동명 그대로 적으세요 (예: "영어", "체육", "하와이체험"). category는 "특별활동" 또는 "행사"로 분류하세요.
   - 유치원마다 표의 칸 이름과 요일 배치가 다를 수 있으니, "요일별로 다른 과목/활동이 배정된 표"라는 패턴 자체를 인식해서 유연하게 찾아 적용하세요.
   - 한 요일 칸 안에 줄바꿈이나 "&"로 이어져서 서로 이름이 다른 활동이 두 개 이상 적혀 있는 경우(매우 중요, 절대 실수하지 마세요): 이걸 하나의 title로 합치거나 그중 하나만 골라 나머지를 누락시키지 마세요. 각 활동명이 대상 아이의 연령/반 조건에 맞는지 따로따로 판단해서, 해당되는 활동은 전부 각각 독립된 이벤트로 만드세요.
     - 판단 기준: 통신문 본문에 각 활동이 별도 소제목이나 별도 활동일로 설명되고 있다면 별개의 활동입니다. 반대로 줄바꿈이 있어도 하나의 행사명을 여러 줄로 풀어쓴 것뿐이라면(예: "여름방학\n특별활동" → "여름방학 특별활동") 억지로 쪼개지 마세요.
     - 예시: 표 칸에 "원어민 선생님과 함께하는 〈Play&Story〉 3세 & 스웨덴 물놀이"라고 적혀 있고 대상 아이가 스웨덴반이라면, 이는 "Play&Story"(원어민 영어 체험, 전체 공통)와 "스웨덴 물놀이"(스웨덴반 전용 물놀이) 두 개의 서로 다른 활동입니다 → 같은 날짜에 title이 각각 "Play&Story"인 이벤트와 "스웨덴 물놀이"인 이벤트, 이렇게 두 개를 만드세요. "Play&Story 물놀이"처럼 하나로 합친 title을 만들지 마세요.

6. 색상/강조 표시로 연결된 정보 병합:
   - 통신문 하단 안내 문구(소식란, 협조사항 등)에서 특정 날짜나 활동명이 다른 텍스트와 구별되는 색상·굵기·밑줄로 강조되어 있고, 그 내용이 위 5번에서 추출한 이벤트와 같은 날짜/활동을 가리킨다면, 별도 이벤트를 새로 만들지 말고 해당 이벤트의 noticeText 또는 memo에 그 강조 문구 내용을 합쳐서 적으세요.
   - 예: 표에 "21일 하와이체험"이 있고, 안내 문구에 같은 색으로 "빨간 티셔츠 입고 등원부탁드립니다"라고 쓰여 있다면 → title: "하와이체험", noticeText: "원내 체험활동으로 빨간 티셔츠를 입고 등원해주세요."
   - 색상이 같지 않거나 관련성이 불분명하면 무리해서 합치지 말고 각각 독립적인 정보로 두세요.

7. 달력/캘린더 이미지의 날짜 강조 표시:
   - 숫자만 나열된 달력(캘린더) 형태의 이미지가 포함되어 있고, 그중 일부 날짜 칸이 배경색(노란색 형광펜 등)으로 눈에 띄게 칠해져 있거나 동그라미·네모로 표시돼 있다면, 그 강조된 날짜들이 곧 실제 활동·행사가 있는 날짜입니다. 강조된 날짜 각각을 하나씩 별도의 이벤트로 추출하세요.
   - 이 달력 이미지 자체에는 활동명이 안 적혀 있을 수 있습니다. 이럴 땐 같은 통신문 세트로 함께 제공된 다른 이미지(제목, 안내문, 별도 공지 텍스트 등)에서 활동명을 찾아 title로 사용하세요. 예: 달력 이미지엔 "OO반 일정 안내"만 있고 다른 이미지에 "9월 생존수영 안내"라고 쓰여 있다면, 강조된 각 날짜의 title은 "생존수영"으로 채우세요.
   - 강조된 날짜가 여러 개면 각각 독립된 이벤트로 만들되, 같은 세트의 다른 이미지에 있는 준비물·안내사항이 공통으로 적용된다면 각 이벤트에 동일하게 채우세요.

8. 금지·비권장 표시(❌, 취소선, "불가능", "금지" 라벨)가 붙은 항목 처리:
   - 이미지에서 특정 물건이나 복장 예시 옆에 ❌ 아이콘, 빨간 취소선, "착용 불가능", "금지", "안 됨" 같은 라벨이 함께 표시돼 있다면, 이는 "이것은 준비·착용하면 안 되는 예시"라는 뜻입니다. 이런 항목은 절대 items(준비물)에 포함하지 마세요.
   - 반대로 ✓나 "착용 가능", "권장" 라벨이 붙은 항목만 실제 준비물로 items에 포함하세요.
   - 허용/금지 여부가 이미지만으로 명확히 판단되지 않는 항목은 items에 억지로 넣지 말고, 해당 이벤트의 noticeText나 memo에 "허용되는 종류만 준비해주세요" 정도로 요약해 남기세요.

9. 출력 및 신뢰도:
   - 반드시 정해진 JSON 형식으로만 결괏값을 출력하세요. 불필요한 서술이나 설명은 절대 포함하지 마세요.
   - 확실하지 않은 날짜나 제목 등 이벤트 전체에 대한 의문이 있으면 해당 이벤트의 'needsReview: true'로 표시하고 이유를 'reviewReason'에 적으세요.
   - items 중 글씨가 흐릿하거나 표에서 일부가 잘려서 품명을 확신할 수 없는 항목이 있다면, 이벤트 전체가 아니라 그 항목 객체에만 'needsReview: true'와 구체적인 'reviewReason'(예: "글씨가 흐려 '수건'인지 '수영복'인지 확실하지 않아요")을 넣으세요. 확실한 항목에는 needsReview를 아예 넣지 마세요.

[급식 식단표 추출]
- 가정통신문에 주간 또는 월간 식단표(요일별/날짜별 급식 메뉴가 나열된 표)가 포함되어 있다면, "mealPlan" 배열로 별도 추출하세요.
- 각 항목은 날짜(date, "YYYY-MM-DD")와 그날의 메뉴 목록(menu, 문자열 배열 — 예: ["흰쌀밥", "미역국", "제육볶음", "배추김치"])으로 구성하세요.
- mainMenu: menu 항목들 중 그날의 "메인 반찬"(단백질 위주의 주요리, 예: 제육볶음/돈까스/불고기/생선구이 등)에 해당하는 항목을 하나 골라 그대로 적으세요. 밥류("흰쌀밥", "잡곡밥" 등), 국/찌개류, 김치·나물 등 기본 반찬은 mainMenu로 고르지 마세요. 메뉴가 전부 밥/국/김치뿐이라 뚜렷한 메인 반찬이 없다면 mainMenu는 생략하세요.
- 요일만 적혀 있고 날짜가 명시되지 않았다면, [현재 기준 날짜]를 기준으로 그 주(월~금)의 실제 날짜로 환산하세요.
- 식단표가 아예 없으면 "mealPlan"은 빈 배열([])로 반환하세요. 이는 오류가 아니라 정상적인 결과입니다.`;
  }
};
