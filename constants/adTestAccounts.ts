/**
 * 개발자 본인 테스트폰에서는 분석 전 리워드 광고 시청을 요구하지 않는다.
 * 실제 사용자에게는 영향 없음 — 여기 등록된 구글 계정으로 로그인했을 때만 우회된다.
 */
const AD_TEST_EMAILS = ['gogodaino07@gmail.com'];

export function isAdTestAccount(email?: string | null): boolean {
  if (!email) return false;
  return AD_TEST_EMAILS.includes(email.trim().toLowerCase());
}
