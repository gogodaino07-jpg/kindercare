import { useIntervalInterstitialAd } from './useIntervalInterstitialAd';

// 별도 광고 단위를 새로 안 만들고 아이 프로필 저장용 전면광고 단위를 재사용한다.
const AD_UNIT_ID = process.env.EXPO_PUBLIC_AD_CHILD_SAVE_INTERSTITIAL_ID || null;
// 튜토리얼 자체가 온보딩(신규가입/탈퇴 후 재가입/계정 전환)마다 한 번만 뜨므로
// 간격 제한을 두지 않는다 — 3시간 제한을 뒀더니 탈퇴 후 바로 재가입하면 안 떴다.
const MIN_INTERVAL_MS = 0;
const STORAGE_KEY = 'tutorialFinishInterstitial:lastShownAt';

/**
 * 홈 튜토리얼을 마치고("시작하기"/"건너뛰기") 홈으로 돌아오는 순간 전면 광고를 보여준다.
 * enabled가 false면 광고 객체 자체를 만들지 않아 튜토리얼을 안 보는
 * 대부분의 홈 진입에서 불필요한 광고 로드 요청이 나가지 않는다.
 */
export function useTutorialFinishInterstitialAd(enabled: boolean) {
  return useIntervalInterstitialAd(enabled ? AD_UNIT_ID : null, STORAGE_KEY, MIN_INTERVAL_MS);
}
