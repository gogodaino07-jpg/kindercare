import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRewardedAd } from 'react-native-google-mobile-ads';

// 별도 광고 단위를 새로 안 만들고 스캔용 리워드 광고 단위를 재사용한다.
const AD_UNIT_ID = process.env.EXPO_PUBLIC_AD_REWARDED_ID ?? null;
const STORAGE_KEY = 'addChildRewardedAd:lastEarnedAt';
// 이 안에 다시 요청하면 이미 본 것으로 치고 광고 없이 통과시킨다 — 한 자리에서
// 여러 명(셋째, 넷째...)을 연달아 등록할 때마다 매번 처음부터 광고를 다시
// 보게 하는 게 부담스럽다는 피드백 반영.
const GRACE_PERIOD_MS = 10 * 60 * 1000; // 10분

/**
 * 아이를 2번째 이상 등록하려 할 때 리워드 광고를 보여주고, 시청 완료(보상 획득)
 * 여부를 Promise로 알려준다. 첫 번째 아이는 광고 없이 바로 등록 가능 — 2번째
 * 부터만 이 게이트를 거친다. 광고 로드 실패/닫기(보상 미획득) 시에도 Promise가
 * 반드시 resolve되어 화면이 멈추지 않게 한다.
 */
export function useAddChildRewardedAd() {
  const { isLoaded, isClosed, isEarnedReward, error, load, show } = useRewardedAd(AD_UNIT_ID);
  const resolverRef = useRef<((earned: boolean) => void) | null>(null);
  const pendingShowRef = useRef(false);

  useEffect(() => {
    if (AD_UNIT_ID) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoaded && pendingShowRef.current) {
      pendingShowRef.current = false;
      show();
    }
  }, [isLoaded, show]);

  useEffect(() => {
    if (isClosed && resolverRef.current) {
      const resolve = resolverRef.current;
      resolverRef.current = null;
      const earned = !!isEarnedReward;
      if (earned) {
        AsyncStorage.setItem(STORAGE_KEY, String(Date.now())).catch(() => {});
      }
      resolve(earned);
    }
    if (isClosed && AD_UNIT_ID) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClosed, isEarnedReward]);

  useEffect(() => {
    if (error && resolverRef.current) {
      pendingShowRef.current = false;
      const resolve = resolverRef.current;
      resolverRef.current = null;
      resolve(false);
    }
  }, [error]);

  /** 광고를 노출하고, 사용자가 끝까지 봐서 보상을 받으면 true, 아니면 false로 resolve.
   * 방금(10분 이내) 이미 보상을 받은 적 있으면 — 한 자리에서 여러 명을 연달아
   * 등록하는 상황으로 보고 — 광고 없이 바로 true로 resolve한다. */
  const requestAndShow = useCallback((): Promise<boolean> => {
    if (!AD_UNIT_ID) return Promise.resolve(true); // 광고 단위 ID 미설정 시 등록을 막지 않음
    return (async () => {
      try {
        const lastEarnedRaw = await AsyncStorage.getItem(STORAGE_KEY);
        const lastEarnedAt = lastEarnedRaw ? Number(lastEarnedRaw) : 0;
        if (Date.now() - lastEarnedAt < GRACE_PERIOD_MS) return true;
      } catch {
        // 확인 실패 시엔 안전하게 평소대로 광고를 보여준다.
      }
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
        if (isLoaded) {
          show();
        } else {
          pendingShowRef.current = true;
          load();
        }
      });
    })();
  }, [isLoaded, load, show]);

  return { requestAndShow };
}
