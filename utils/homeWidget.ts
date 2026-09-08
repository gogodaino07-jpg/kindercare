import { NativeModules, Platform } from 'react-native';

interface WidgetTodayEvent {
  title: string;
  /** 이 일정의 아직 안 챙긴 준비물 이름 — 위젯엔 최대 2개까지 칩으로 보여주고, 더 있으면 "외 N건"으로 요약한다. */
  itemNames: string[];
}

interface WidgetTomorrowPreview {
  /** "9.9 (수)" 형태로 미리 포맷한 문자열. */
  dateLabel: string;
  title: string;
  itemCount: number;
}

interface WidgetSummaryPayload {
  /** 위젯 헤더에 보여줄 오늘 날짜 — "9.8 (화)" 형태로 미리 포맷해서 넘긴다. */
  dateLabel: string;
  /** 오늘 일정 — 일정마다 자기 준비물과 묶어서 보여주기 위해 배열로 넘긴다. 위젯 높이 제한으로 최대 2건까지만 표시. */
  todayEvents: WidgetTodayEvent[];
  /** 내일 일정 미리보기 — 내일 일정이 없으면 null(위젯에서 그 줄 자체를 숨김). 있으면 첫 번째 일정만. */
  tomorrow: WidgetTomorrowPreview | null;
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
