import { Event, EventItem } from '../types/models';

/**
 * items가 없는 과거 이벤트는 note를 줄 단위로 나눠 표시만 해줌(저장하지 않는 화면 표시용 폴백).
 * 진행률 게이지와 일정 카드가 서로 다른 기준으로 항목 수를 세면 게이지가 숨어버리는 등
 * 불일치가 생기므로, 항목 목록을 구하는 로직은 이 함수 하나로 통일한다.
 *
 * 준비물 챙김 완료 여부는 각 항목의 `completed` 필드에 담겨 Event와 함께 저장된다(홈
 * 화면과 캘린더 화면이 같은 값을 공유). 예전엔 기기 로컬 AsyncStorage에 별도로 저장해서
 * 홈에서 체크해도 캘린더에는 반영되지 않는 문제가 있었음 — 지금은 이 파일 하나로 통일.
 */
export function getDisplayItems(event: Event): EventItem[] {
  if (event.items && event.items.length > 0) return event.items;
  if (!event.note) return [];
  return event.note
    .split('\n')
    .map((name, idx) => ({ id: `legacy-${idx}`, name: name.trim() }))
    .filter((i) => i.name);
}
