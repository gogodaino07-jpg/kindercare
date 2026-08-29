export type ChildAge = 2 | 3 | 4 | 5 | 6 | 7;

export interface Child {
  id: string;
  name?: string;
  /**
   * 성을 뺀, 인사말 등에서 편하게 부를 이름 (선택 입력).
   * "김서준"처럼 성이 붙는 이름은 첫 글자를 성으로 잘라내는 방식으로는
   * "서준이"·"서주니"처럼 성 없이 2음절 이상인 이름과 구분할 수 없어 별도로 받는다.
   * 비어 있으면 기존 방식(name에서 첫 글자를 성으로 추정해 제거)으로 대체된다.
   */
  givenName?: string;
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
  /** AI가 이 항목의 인식 결과를 확신하지 못할 때(글씨가 흐릿함 등) true. AI 확인·수정 화면에서 "확인필요" 배지로 표시. */
  needsReview?: boolean;
  reviewReason?: string;
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
  /** 구조화된 준비물 목록. 각 항목의 completed로 체크 여부를 함께 저장(홈·캘린더 화면 공유). */
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
  /** 이 일정을 만든 AI 분석에 사용된 원본 스캔 사진들의 기기 로컬 경로. Child.photoUri와
   *  마찬가지로 기기 로컬 전용이라 클라우드 동기화에서 제외되며, OS가 캐시를 정리하거나
   *  기기를 바꾸면 사라질 수 있다. */
  photoUris?: string[];
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
  /** 초대 코드로 실제 합류한 구성원만 채워짐 — users/{ownerEmail}/members 문서와 매칭용. */
  email?: string;
  /** '엄마' | '아빠' | '할머니' | '할아버지' | '외삼촌' | '기타' — 초대로 합류한 구성원만. */
  role?: string;
  /** role에서 파생된 편집 권한 — 초대로 합류한 구성원만(소유자는 항상 편집 가능이라 별도로 안 씀). */
  canEdit?: boolean;
}

/** Firestore `familyInvites/{code}` 문서 — 초대 코드가 어느 계정 소유인지 조회하는 용도. */
export interface FamilyInvite {
  ownerEmail: string;
  ownerName: string;
  createdAt: string;
}

/** Firestore `users/{ownerEmail}/members/{memberEmail}` 문서 — 실제 읽기 권한 부여 기록. */
export interface FamilyMembership {
  name: string;
  email: string;
  joinCode: string;
  joinedAt: string;
  role?: string;
  canEdit?: boolean;
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
