import { useIntervalInterstitialAd } from './useIntervalInterstitialAd';

// 별도 광고 단위를 새로 안 만들고 아이 프로필 저장용 전면광고 단위를 재사용한다.
// 성과를 자리별로 따로 보고 싶어지면 나중에 AdMob에서 전면 광고 단위를 새로
// 만들어서 이 값만 바꾸면 됨.
const AD_UNIT_ID = process.env.EXPO_PUBLIC_AD_CHILD_SAVE_INTERSTITIAL_ID || null;
const MIN_INTERVAL_MS = 10 * 60 * 1000; // 10분
const STORAGE_KEY = 'calendarAddEventInterstitial:lastShownAt';

/**
 * 캘린더에서 일정을 새로 추가하고 저장을 완료한 직후 전면 광고를 보여준다.
 * 알림장 스캔 후 한 번에 여러 일정을 몰아서 추가하는 경우가 흔해서, 마지막
 * 노출로부터 10분이 지나기 전에는 다시 보여주지 않아 연달아 추가할 때 매번
 * 뜨는 걸 막는다.
 */
export function useCalendarAddEventInterstitialAd() {
  return useIntervalInterstitialAd(AD_UNIT_ID, STORAGE_KEY, MIN_INTERVAL_MS);
}
