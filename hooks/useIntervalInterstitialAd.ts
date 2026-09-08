import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInterstitialAd } from 'react-native-google-mobile-ads';

// 저장 직후 호출되는 시점에 광고 로드가 아직 안 끝났으면 이만큼(ms)까지는
// 기다려본다 — 실기기에서 로드 자체는 되는데 저장하자마자 보여주려 하면
// 로딩이 간발의 차로 안 끝나 있는 경우가 흔해서(수백 ms~수 초), 완전히
// 포기하기 전에 짧게 폴링한다.
const LOAD_WAIT_MS = 8000;
const LOAD_POLL_INTERVAL_MS = 300;

/**
 * 특정 동작(저장/추가 등)이 끝난 직후 전면 광고를 보여주되, 마지막 노출로부터
 * minIntervalMs가 지나기 전에는 다시 보여주지 않는다 — 같은 작업을 연달아
 * 반복할 때(예: 일정을 여러 개 몰아서 추가) 매번 뜨는 걸 막기 위함.
 */
export function useIntervalInterstitialAd(adUnitId: string | null, storageKey: string, minIntervalMs: number) {
  const { isLoaded, isClosed, load, show } = useInterstitialAd(adUnitId);
  const isLoadedRef = useRef(isLoaded);
  useEffect(() => {
    isLoadedRef.current = isLoaded;
  }, [isLoaded]);

  useEffect(() => {
    if (adUnitId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 최초 load()가 AdMob SDK 초기화(mobileAds().initialize())보다 먼저 나가면
  // 그 요청이 조용히 유실되고 이후 재시도가 없어 그 세션 내내 로드가 안 됐다.
  // isLoaded가 아직 false인 동안 몇 초 간격으로 다시 load()를 걸어 이 경합을
  // 우회한다 — 이미 로드됐으면(isLoaded=true) 자동으로 재시도를 멈춘다.
  useEffect(() => {
    if (!adUnitId || isLoaded) return;
    const retryId = setInterval(() => load(), 4000);
    return () => clearInterval(retryId);
  }, [adUnitId, isLoaded, load]);

  useEffect(() => {
    // 방금 본 광고는 소진됐으니, 다음 노출을 위해 새 광고를 다시 미리 로드해둔다.
    if (isClosed && adUnitId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClosed]);

  /** 동작 완료 직후 호출. 광고 단위 미설정/로드 실패(대기 후에도)/간격 이내 재노출이면 조용히 아무 일도 안 함. */
  const showIfEligible = useCallback(async () => {
    if (!adUnitId) return;

    if (!isLoadedRef.current) {
      let waited = 0;
      while (!isLoadedRef.current && waited < LOAD_WAIT_MS) {
        await new Promise((resolve) => setTimeout(resolve, LOAD_POLL_INTERVAL_MS));
        waited += LOAD_POLL_INTERVAL_MS;
      }
    }
    if (!isLoadedRef.current) return;

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
  }, [adUnitId, show, storageKey, minIntervalMs]);

  return { showIfEligible };
}
