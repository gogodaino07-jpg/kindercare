import { NativeModules, Platform } from 'react-native';

interface WidgetTodayEvent {
  title: string;
  /** 이 일정의 아직 안 챙긴 준비물 이름. */
  itemNames: string[];
  /** 준비물이 원래 있었는데(1개 이상) 전부 체크 완료된 상태 — 위젯에 "(준비물 완료)"로 표시한다. */
  allItemsDone: boolean;
}

interface WidgetTomorrowPreview {
  /** "9.9 (수)" 형태로 미리 포맷한 문자열. */
  dateLabel: string;
  /** 위젯 탭 시 캘린더의 이 날짜로 바로 이동하기 위한 ISO 날짜("YYYY-MM-DD"). */
  dateISO: string;
  title: string;
  itemCount: number;
}

interface WidgetChildSummary {
  /** 위젯 헤더에 보여줄 오늘 날짜 — "9.8 (화)" 형태로 미리 포맷해서 넘긴다. */
  dateLabel: string;
  /** 위젯(오늘 일정 목록 포함) 탭 시 캘린더의 이 날짜로 바로 이동하기 위한 ISO 날짜. */
  dateISO: string;
  /** 오늘 일정 — 일정마다 자기 준비물과 묶어서 보여주기 위해 배열로 넘긴다. 위젯 높이 제한으로 최대 2건까지만 표시. */
  todayEvents: WidgetTodayEvent[];
  /** 내일 일정 미리보기 — 내일 일정이 없으면 null(위젯에서 그 줄 자체를 숨김). 있으면 첫 번째 일정만. */
  tomorrow: WidgetTomorrowPreview | null;
}

interface WidgetChildInfo {
  id: string;
  /** 위젯 추가 시 아이 선택 화면에 보여줄 이름. */
  name: string;
  /** 기기 로컬 캐시 경로 — 있으면 프로필 사진을, 없으면 avatarEmoji를 보여준다. */
  photoUri?: string;
  avatarEmoji?: string;
}

interface WidgetSummaryPayload {
  /** 아이가 2명 이상일 때, 위젯을 홈 화면에 새로 추가하면 뜨는 "아이 선택" 화면에
   *  쓰일 목록 — 무료 한도로 잠긴 아이는 호출부에서 미리 제외하고 넘긴다. */
  children: WidgetChildInfo[];
  /** 아이 id별 요약 데이터. 위젯 인스턴스마다 설정 시 고른 아이의 항목만 골라서 보여준다. */
  summaries: Record<string, WidgetChildSummary>;
}

/** 안드로이드 홈 화면 위젯(오늘 일정별 제목 + 준비물 + 내일 미리보기)에 최신 요약을 밀어준다.
 *  네이티브 모듈(HomeWidgetModule)이 없는 환경(iOS, 오래된 빌드)에서는 조용히 무시한다. */
export function updateHomeWidget(payload: WidgetSummaryPayload): void {
  if (Platform.OS !== 'android') return;
  const mod = NativeModules.HomeWidgetModule;
  if (!mod?.updateWidgetData) return;
  try {
    mod.updateWidgetData(JSON.stringify(payload));
  } catch {
    // 위젯 갱신 실패가 앱 사용에 지장을 주면 안 되므로 조용히 무시.
  }
}
