export type ChildAge = 3 | 4 | 5 | 6 | 7;

export interface Child {
  id: string;
  name?: string;
  age: ChildAge;
  birthdate?: string; // ISO date string: "YYYY-MM-DD"
  className?: string;
  photoUri?: string;
}

export interface EventItem {
  id: string;
  name: string;
  /** 준비물 챙김 완료 여부. 캘린더 화면의 준비물 체크리스트에서 사용. */
  completed?: boolean;
}

export interface Event {
  id: string;
  /** ISO date string, e.g. "2026-07-21" */
  date: string;
  title: string;
  /**
   * 준비물 — also used as the Coupang shopping-search keyword.
   * Kept in sync with `items` (newline-joined) for backward compatibility
   * with screens that still read `note` directly.
   */
  note?: string;
  /** 메모 — free-form notes, kept separate from 준비물. */
  memo?: string;
  /** 구조화된 준비물 목록. 체크 여부는 Event에 저장하지 않고 기기 로컬(useLocalChecklist)에서 관리. */
  items?: EventItem[];
  /** 카테고리 뱃지 — 예: '준비물' | '특별활동' | '행사' | '공지' */
  category?: string;
  /** 장소 — 통신문에 명시된 경우만 채움 */
  location?: string;
  /** 표시용 시간 문자열 — 예: "오전 10:30", "하루 종일" */
  time?: string;
  /** 카드 상단에 보여줄 1~2문장 공지 요약 */
  noticeText?: string;
  /** 등원 전날 저녁 알림 수신 여부 — defaults to true when unset. */
  notifyDayBefore?: boolean;
  childId: string;
  /** 'ai' = 가정통신문 업로드 → AI 확인 화면에서 저장된 일정, 'manual' = 캘린더에서 직접 추가 */
  source: 'ai' | 'manual';
  icon?: string;
  needsReview?: boolean;
  reviewReason?: string;
}

export interface MealPlan {
  id: string;
  /** ISO date string, e.g. "2026-07-21" */
  date: string;
  /** 메뉴 항목들 */
  menu: string[];
  /** menu 중 메인 반찬(주요리)에 해당하는 항목. 홈 화면 인사말 등에 노출할 때 사용. */
  mainMenu?: string;
  /** Event처럼 아이(=소속 기관) 기준으로 스코프 */
  childId: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  isOwner: boolean;
  phone?: string;
}

export interface TimeOfDay {
  period: 'AM' | 'PM';
  hour: number;
  minute: number;
}

export interface NotificationSettings {
  enabled: boolean;
  dayBeforeTime: TimeOfDay;
  sameDayEnabled: boolean;
  sameDayTime: TimeOfDay;
}

export interface UploadedDoc {
  id: string;
  uri: string;
  kind: 'image' | 'file';
  name?: string;
  /** 표시용 용량 문자열, 예: "2.4 MB" — 선택 시점에 계산해 채움. */
  sizeLabel?: string;
  /** 표시용 선택 일자, 예: "2026.08.20" — 선택 시점의 오늘 날짜. */
  pickedAt?: string;
  /** 어떤 버튼으로 첨부했는지 — 카드 상단 태그 라벨에 사용. */
  pickSource?: 'camera' | 'gallery' | 'file';
}

export interface GoogleAccount {
  email: string;
  name: string;
}
