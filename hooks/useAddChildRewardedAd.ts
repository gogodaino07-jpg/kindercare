import { useCallback, useEffect, useRef } from 'react';
import { useRewardedAd } from 'react-native-google-mobile-ads';

// 별도 광고 단위를 새로 안 만들고 스캔용 리워드 광고 단위를 재사용한다.
const AD_UNIT_ID = process.env.EXPO_PUBLIC_AD_REWARDED_ID ?? null;

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
      resolve(!!isEarnedReward);
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

  /** 광고를 노출하고, 사용자가 끝까지 봐서 보상을 받으면 true, 아니면 false로 resolve. */
  const requestAndShow = useCallback((): Promise<boolean> => {
    if (!AD_UNIT_ID) return Promise.resolve(true); // 광고 단위 ID 미설정 시 등록을 막지 않음
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      if (isLoaded) {
        show();
      } else {
        pendingShowRef.current = true;
        load();
      }
    });
  }, [isLoaded, load, show]);

  return { requestAndShow };
}
