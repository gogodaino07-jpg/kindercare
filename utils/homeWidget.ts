import { NativeModules, Platform } from 'react-native';

interface WidgetSummaryPayload {
  totalItems: number;
  checkedItems: number;
  todayTitles: string[];
  /** 아직 안 챙긴 준비물 이름 — 위젯에는 최대 2줄까지만 보여주고 나머지는 "+N개 더"로 요약한다. */
  todayItemNames: string[];
}

/** 안드로이드 홈 화면 위젯(오늘 일정 제목 + 준비물 현황)에 최신 요약을 밀어준다.
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
