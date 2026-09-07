import { useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInterstitialAd } from 'react-native-google-mobile-ads';

const AD_UNIT_ID = process.env.EXPO_PUBLIC_AD_CHILD_SAVE_INTERSTITIAL_ID || null;
const LAST_SHOWN_KEY = 'childSaveInterstitial:lastShownAt';
const MIN_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3시간

/**
 * 아이 프로필을 새로 등록하거나 수정 저장을 완료한 직후 전면 광고를 보여준다.
 * 저장 자체를 방해하면 안 되므로 저장이 끝난 뒤에만 호출하고, 마지막 노출로부터
 * 3시간이 지나기 전에는 다시 보여주지 않아 연달아 저장할 때 매번 뜨는 걸 막는다.
 */
export function useChildSaveInterstitialAd() {
  const { isLoaded, isClosed, load, show } = useInterstitialAd(AD_UNIT_ID);

  useEffect(() => {
    if (AD_UNIT_ID) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // 방금 본 광고는 소진됐으니, 다음 저장을 위해 새 광고를 다시 미리 로드해둔다.
    if (isClosed && AD_UNIT_ID) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClosed]);

  /** 저장 완료 직후 호출. 광고 단위 미설정/로드 실패/3시간 이내 재노출이면 조용히 아무 일도 안 함. */
  const showIfEligible = useCallback(async () => {
    if (!AD_UNIT_ID || !isLoaded) return;
    const now = Date.now();
    try {
      const lastShownRaw = await AsyncStorage.getItem(LAST_SHOWN_KEY);
      const lastShownAt = lastShownRaw ? Number(lastShownRaw) : 0;
      if (now - lastShownAt < MIN_INTERVAL_MS) return;
      await AsyncStorage.setItem(LAST_SHOWN_KEY, String(now));
    } catch {
      return; // 간격 제한을 확인할 수 없으면 과다 노출을 피하기 위해 이번엔 건너뜀
    }
    show();
  }, [isLoaded, show]);

  return { showIfEligible };
}
