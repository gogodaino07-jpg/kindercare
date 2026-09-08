import { NativeModules, Platform } from 'react-native';

interface WidgetTodayEvent {
  title: string;
  /** 이 일정의 아직 안 챙긴 준비물 이름 — 위젯엔 1개면 그대로, 여러 개면 "첫 항목 외 N건"으로 요약해서 보여준다. */
  itemNames: string[];
}

interface WidgetSummaryPayload {
  /** 오늘 일정 — 일정마다 자기 준비물과 묶어서 보여주기 위해 배열로 넘긴다. 위젯 높이 제한으로 최대 2건까지만 표시. */
  todayEvents: WidgetTodayEvent[];
}

/** 안드로이드 홈 화면 위젯(오늘 일정별 제목 + 준비물)에 최신 요약을 밀어준다.
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
