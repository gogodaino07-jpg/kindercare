import { useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInterstitialAd } from 'react-native-google-mobile-ads';

const AD_UNIT_ID = process.env.EXPO_PUBLIC_AD_CHILD_SAVE_INTERSTITIAL_ID || null;
const LAST_SHOWN_KEY = 'childSaveInterstitial:lastShownDate';

/**
 * 아이 프로필을 새로 등록하거나 수정 저장을 완료한 직후 전면 광고를 보여준다.
 * 저장 자체를 방해하면 안 되므로 저장이 끝난 뒤에만 호출하고, 하루 한 번만
 * 노출해서 반복 수정 시 매번 뜨는 걸 막는다.
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

  /** 저장 완료 직후 호출. 광고 단위 미설정/로드 실패/오늘 이미 노출됨이면 조용히 아무 일도 안 함. */
  const showIfEligible = useCallback(async () => {
    if (!AD_UNIT_ID || !isLoaded) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    try {
      const lastShownDate = await AsyncStorage.getItem(LAST_SHOWN_KEY);
      if (lastShownDate === todayKey) return;
      await AsyncStorage.setItem(LAST_SHOWN_KEY, todayKey);
    } catch {
      return; // 하루 한 번 제한을 확인할 수 없으면 과다 노출을 피하기 위해 이번엔 건너뜀
    }
    show();
  }, [isLoaded, show]);

  return { showIfEligible };
}
