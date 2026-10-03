import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import GuestLoginModal from '../components/onboarding/GuestLoginModal';
import { getFirebaseAuth } from '../utils/firebase';
import { useAppData } from './AppDataContext';

interface GuestLoginGateValue {
  /** googleAccount가 있으면 onReady를 바로 실행하고, 없으면 로그인 시트를 띄운
   *  뒤 로그인(+게스트 데이터 이관)이 끝났을 때만 onReady를 실행한다. 사용자가
   *  시트를 닫으면 onReady는 실행되지 않는다(원래 동작이 조용히 취소됨). */
  requireLogin: (onReady: () => void) => void;
}

const GuestLoginGateContext = createContext<GuestLoginGateValue | null>(null);

export function GuestLoginGateProvider({ children }: { children: React.ReactNode }) {
  const { googleAccount } = useAppData();
  const [visible, setVisible] = useState(false);
  const pendingRef = useRef<(() => void) | null>(null);

  const requireLogin = useCallback(
    (onReady: () => void) => {
      // googleAccount는 AsyncStorage에 캐시된 값이라 Firebase Auth 세션이 끊겨도
      // 그대로 남는다. 그 상태로 통과시키면 서버 함수가 unauthenticated로 거부해
      // 분석 도중에 "로그인이 필요해요"가 떴으므로, 실제 Firebase 세션까지 확인한다.
      if (googleAccount && getFirebaseAuth().currentUser) {
        onReady();
        return;
      }
      pendingRef.current = onReady;
      setVisible(true);
    },
    [googleAccount]
  );

  const handleClose = useCallback(() => {
    pendingRef.current = null;
    setVisible(false);
  }, []);

  const handleSuccess = useCallback(() => {
    setVisible(false);
    const onReady = pendingRef.current;
    pendingRef.current = null;
    if (onReady) onReady();
  }, []);

  return (
    <GuestLoginGateContext.Provider value={{ requireLogin }}>
      {children}
      <GuestLoginModal visible={visible} onClose={handleClose} onSuccess={handleSuccess} />
    </GuestLoginGateContext.Provider>
  );
}

export function useRequireLogin(): (onReady: () => void) => void {
  const ctx = useContext(GuestLoginGateContext);
  if (!ctx) throw new Error('useRequireLogin must be used within a GuestLoginGateProvider');
  return ctx.requireLogin;
}
