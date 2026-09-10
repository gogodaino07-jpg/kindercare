import { useIntervalInterstitialAd } from './useIntervalInterstitialAd';

const AD_UNIT_ID = process.env.EXPO_PUBLIC_AD_CHILD_SAVE_INTERSTITIAL_ID || null;
const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5분
const STORAGE_KEY = 'childSaveInterstitial:lastShownAt';

/**
 * 아이 프로필을 새로 등록하거나 수정 저장을 완료한 직후 전면 광고를 보여준다.
 * 저장 자체를 방해하면 안 되므로 저장이 끝난 뒤에만 호출하고, 마지막 노출로부터
 * 5분이 지나기 전에는 다시 보여주지 않아 연달아 저장할 때 매번 뜨는 걸 막는다.
 */
export function useChildSaveInterstitialAd() {
  return useIntervalInterstitialAd(AD_UNIT_ID, STORAGE_KEY, MIN_INTERVAL_MS);
}
