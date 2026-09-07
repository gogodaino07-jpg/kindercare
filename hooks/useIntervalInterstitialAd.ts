import { useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInterstitialAd } from 'react-native-google-mobile-ads';

/**
 * 특정 동작(저장/추가 등)이 끝난 직후 전면 광고를 보여주되, 마지막 노출로부터
 * minIntervalMs가 지나기 전에는 다시 보여주지 않는다 — 같은 작업을 연달아
 * 반복할 때(예: 일정을 여러 개 몰아서 추가) 매번 뜨는 걸 막기 위함.
 */
export function useIntervalInterstitialAd(adUnitId: string | null, storageKey: string, minIntervalMs: number) {
  const { isLoaded, isClosed, load, show } = useInterstitialAd(adUnitId);

  useEffect(() => {
    if (adUnitId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // 방금 본 광고는 소진됐으니, 다음 노출을 위해 새 광고를 다시 미리 로드해둔다.
    if (isClosed && adUnitId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClosed]);

  /** 동작 완료 직후 호출. 광고 단위 미설정/로드 실패/간격 이내 재노출이면 조용히 아무 일도 안 함. */
  const showIfEligible = useCallback(async () => {
    if (!adUnitId || !isLoaded) return;
    const now = Date.now();
    try {
      const lastShownRaw = await AsyncStorage.getItem(storageKey);
      const lastShownAt = lastShownRaw ? Number(lastShownRaw) : 0;
      if (now - lastShownAt < minIntervalMs) return;
      await AsyncStorage.setItem(storageKey, String(now));
    } catch {
      return; // 간격 제한을 확인할 수 없으면 과다 노출을 피하기 위해 이번엔 건너뜀
    }
    show();
  }, [adUnitId, isLoaded, show, storageKey, minIntervalMs]);

  return { showIfEligible };
}
