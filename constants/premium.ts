// 구독 결제 기능을 잠시 꺼둔 상태 — 나중에 구독을 다시 열 때 이 플래그만 true로 바꾸면 됨.
// (app/settings/subscription.tsx의 결제 UI, AppDataContext의 아이 등록 인원 잠금이 모두 이 값을 따른다.)
export const PREMIUM_PURCHASE_VISIBLE = false;
