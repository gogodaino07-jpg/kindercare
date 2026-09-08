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

  // showIfEligible()가 "광고가 실제로 닫힐 때"까지 기다릴 수 있도록, 닫힘을
  // 기다리는 콜백들을 쌓아뒀다가 isClosed가 뜨는 순간 한 번에 풀어준다.
  const closeResolversRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    // 방금 본 광고는 소진됐으니, 다음 노출을 위해 새 광고를 다시 미리 로드해둔다.
    if (isClosed && adUnitId) {
      load();
      const resolvers = closeResolversRef.current;
      closeResolversRef.current = [];
      resolvers.forEach((resolve) => resolve());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClosed]);

  /**
   * 동작 완료 직후 호출. 광고 단위 미설정/로드 실패(대기 후에도)/간격 이내
   * 재노출이면 조용히 아무 일도 안 하고 false를 반환한다. 실제로 광고를
   * 띄운 경우에는 사용자가 그 광고를 닫을 때까지 기다렸다가 true를 반환한다
   * — 호출부에서 "광고를 실제로 보여줬는지"에 따라 이후 동작(예: 저장 확정을
   * 한 번 더 확인받을지)을 분기할 수 있게 하기 위함.
   */
  const showIfEligible = useCallback(async (): Promise<boolean> => {
    if (!adUnitId) return false;

    if (!isLoadedRef.current) {
      let waited = 0;
      while (!isLoadedRef.current && waited < LOAD_WAIT_MS) {
        await new Promise((resolve) => setTimeout(resolve, LOAD_POLL_INTERVAL_MS));
        waited += LOAD_POLL_INTERVAL_MS;
      }
    }
    if (!isLoadedRef.current) return false;

    const now = Date.now();
    try {
      const lastShownRaw = await AsyncStorage.getItem(storageKey);
      const lastShownAt = lastShownRaw ? Number(lastShownRaw) : 0;
      if (now - lastShownAt < minIntervalMs) return false;
      await AsyncStorage.setItem(storageKey, String(now));
    } catch {
      return false; // 간격 제한을 확인할 수 없으면 과다 노출을 피하기 위해 이번엔 건너뜀
    }

    const closed = new Promise<void>((resolve) => {
      closeResolversRef.current.push(resolve);
    });
    show();
    await closed;
    return true;
  }, [adUnitId, show, storageKey, minIntervalMs]);

  return { showIfEligible };
}
