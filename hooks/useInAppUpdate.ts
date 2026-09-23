import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import SpInAppUpdates, { IAUInstallStatus, IAUUpdateKind } from 'sp-react-native-in-app-updates';

// 모듈 스코프에 하나만 둬서 RootLayout이 리마운트돼도 상태 리스너가 중복 등록되지 않게 한다.
const inAppUpdates = new SpInAppUpdates(__DEV__);

/**
 * Flexible 인앱 업데이트: 새 버전이 있으면 조용히 백그라운드로 내려받고,
 * 다운로드가 끝났을 때만(showSheet=true) 바텀시트로 "재시작해서 적용"을 안내한다.
 * Immediate(강제)가 아니므로 앱 사용을 막지 않고, 사용자가 "나중에"를 눌러도
 * 다음 실행 시 Play Core가 계속 같은 상태를 유지한다.
 *
 * iOS는 Play Core가 없어 지원하지 않는다(iOS 지원 자체가 보류 상태).
 */
export function useInAppUpdate() {
  const [showSheet, setShowSheet] = useState(false);
  const updateStartedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const handleStatusUpdate = (event: { status: IAUInstallStatus }) => {
      if (event.status === IAUInstallStatus.DOWNLOADED) {
        setShowSheet(true);
      }
    };
    inAppUpdates.addStatusUpdateListener(handleStatusUpdate);

    inAppUpdates
      .checkNeedsUpdate()
      .then((result) => {
        if (result.shouldUpdate && !updateStartedRef.current) {
          updateStartedRef.current = true;
          // Flexible은 시스템 다이얼로그로 동의만 받고 다운로드는 백그라운드로 진행되므로,
          // 완료 여부는 위 상태 리스너(DOWNLOADED)로만 판단한다.
          inAppUpdates.startUpdate({ updateType: IAUUpdateKind.FLEXIBLE }).catch(() => {});
        }
      })
      .catch(() => {
        // 스토어에 아직 이 버전이 올라가지 않았거나 네트워크 문제인 경우가 대부분 —
        // 업데이트 확인은 부가 기능이라 실패해도 앱 사용에는 영향 없게 조용히 무시한다.
      });

    return () => {
      inAppUpdates.removeStatusUpdateListener(handleStatusUpdate);
    };
  }, []);

  const applyUpdate = () => {
    setShowSheet(false);
    inAppUpdates.installUpdate();
  };

  const dismiss = () => setShowSheet(false);

  return { showSheet, applyUpdate, dismiss };
}
