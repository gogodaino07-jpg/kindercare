import { useCallback, useEffect, useRef } from 'react';
import { useRewardedAd } from 'react-native-google-mobile-ads';

const AD_UNIT_ID = process.env.EXPO_PUBLIC_AD_REWARDED_ID ?? null;

/**
 * 알림장/급식 스캔 직전에 리워드 광고를 보여주고, 시청 완료(보상 획득) 여부를 Promise로 알려준다.
 * 광고 로드 실패/닫기(보상 미획득) 시에도 Promise가 반드시 resolve되어 화면이 멈추지 않게 한다.
 */
export function useScanRewardedAd() {
  const { isLoaded, isClosed, isEarnedReward, error, load, show } = useRewardedAd(AD_UNIT_ID);
  const resolverRef = useRef<((earned: boolean) => void) | null>(null);
  const pendingShowRef = useRef(false);

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
  }, [isClosed, isEarnedReward]);

  useEffect(() => {
    if (error && resolverRef.current) {
      pendingShowRef.current = false;
      const resolve = resolverRef.current;
      resolverRef.current = null;
      resolve(false);
    }
  }, [error]);

  /** 광고를 로드/노출하고, 사용자가 끝까지 봐서 보상을 받으면 true, 아니면 false로 resolve. */
  const requestAndShow = useCallback((): Promise<boolean> => {
    if (!AD_UNIT_ID) return Promise.resolve(true); // 광고 단위 ID 미설정 시 스캔을 막지 않음
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      pendingShowRef.current = true;
      load();
    });
  }, [load]);

  return { requestAndShow };
}
