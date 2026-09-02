import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { getFirebaseAuth } from '../utils/firebase';

const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
/** RevenueCat 대시보드에서 만든 Entitlement 식별자 — 구독 상품을 이 Entitlement에 연결해두어야 함. */
const PREMIUM_ENTITLEMENT_ID = 'premium';

interface SubscriptionContextValue {
  /** 프리미엄 구독이 현재 활성 상태인지. RevenueCat 키가 아직 설정 안 됐으면 항상 false. */
  isSubscribed: boolean;
  /** 최초 구독 상태 조회가 끝났는지(로딩 스피너 등에 사용). */
  isReady: boolean;
  /** RevenueCat API 키(.env의 EXPO_PUBLIC_REVENUECAT_ANDROID_KEY)가 설정돼 결제 기능을 실제로 쓸 수 있는지. */
  isBillingConfigured: boolean;
  /** Play 스토어의 구독 관리 페이지 링크(취소/변경용). 구독 중이 아니면 null. */
  managementURL: string | null;
  /** 결제 직후 등 구독 상태를 즉시 다시 확인하고 싶을 때 호출. */
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

// RevenueCat SDK는 앱 생애주기 동안 한 번만 configure() 해야 하므로 모듈 스코프에서 추적.
let configured = false;

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [managementURL, setManagementURL] = useState<string | null>(null);

  const applyCustomerInfo = useCallback((info: CustomerInfo) => {
    setIsSubscribed(!!info.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
    setManagementURL(info.managementURL);
  }, []);

  // getCustomerInfo()/logIn()이 앱 시작 시 거의 동시에 여러 번 날아가는데(마운트 직후 1회,
  // Firebase 로그인 확정 시 1회, refresh() 호출 시마다 등), 네트워크 응답은 요청한 순서대로
  // 도착한다는 보장이 없다. 예전엔 먼저 보낸 요청(예: 로그인 전 익명 사용자 기준 조회)의
  // 응답이 나중에 보낸 요청(로그인된 사용자 기준 조회) 응답보다 늦게 도착하면 그 오래된
  // 값으로 최신 상태를 덮어써버려서, 화면을 들어갔다 나오거나 백그라운드/포그라운드를
  // 반복하면 구독 상태가 실제로는 안 바뀌었는데도 잠깐씩 뒤바뀌어 보이는 원인이 됐다.
  // 요청마다 순번을 매겨 "가장 나중에 보낸 요청"의 응답만 반영하도록 막는다.
  const requestSeqRef = useRef(0);
  const fetchAndApply = useCallback(
    async (promise: Promise<CustomerInfo>) => {
      const requestId = ++requestSeqRef.current;
      try {
        const info = await promise;
        if (requestId !== requestSeqRef.current) return; // 그 사이 더 최신 요청이 발생 — 이 응답은 버림
        applyCustomerInfo(info);
      } catch {
        // 무시 — 실패한 요청이 기존 상태를 덮어쓰지 않게 그대로 둔다
      }
    },
    [applyCustomerInfo]
  );

  // RevenueCat SDK가 자체적으로 밀어주는 실시간 업데이트는 그 자체로 항상 최신 진실이므로
  // 즉시 반영하고, 순번도 함께 올려서 그 전에 보내둔 오래된 요청의 응답이 나중에 도착해도
  // 이 값을 덮어쓰지 못하게 막는다.
  const applyPushedCustomerInfo = useCallback(
    (info: CustomerInfo) => {
      requestSeqRef.current += 1;
      applyCustomerInfo(info);
    },
    [applyCustomerInfo]
  );

  useEffect(() => {
    if (!REVENUECAT_ANDROID_KEY) return; // 아직 RevenueCat API 키가 없으면 비구독 상태로 동작
    if (!configured) {
      configured = true;
      Purchases.configure({ apiKey: REVENUECAT_ANDROID_KEY });
    }

    fetchAndApply(Purchases.getCustomerInfo()).finally(() => setIsReady(true));

    Purchases.addCustomerInfoUpdateListener(applyPushedCustomerInfo);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(applyPushedCustomerInfo);
    };
  }, [fetchAndApply, applyPushedCustomerInfo]);

  // Firebase Auth 로그인이 확정되면 그 UID로 RevenueCat 사용자와 연결한다 — 기기를
  // 바꾸거나 재설치해도 같은 구독으로 인식되게 함. 이메일 대신 UID를 쓰는 이유는,
  // 이메일은 로그인 경로(구글/카카오)에 따라 검증 강도가 다를 수 있어 식별자로
  // 쓰기엔 약하고, Firebase Auth가 발급하는 UID가 실제 인증된 사용자를 훨씬
  // 신뢰성 있게 가리키기 때문이다. onAuthStateChanged를 쓰는 이유는, 앱을 껐다
  // 켰을 때 AppDataContext의 googleAccount(AsyncStorage 복원)보다 Firebase Auth
  // 세션 복원이 늦게 끝날 수 있어 그 상태 변화를 직접 구독해야 놓치지 않기 때문.
  useEffect(() => {
    if (!REVENUECAT_ANDROID_KEY) return;
    const unsubscribe = getFirebaseAuth().onAuthStateChanged((user: { uid: string } | null) => {
      if (!user) return;
      fetchAndApply(Purchases.logIn(user.uid).then(({ customerInfo }: { customerInfo: CustomerInfo }) => customerInfo));
    });
    return unsubscribe;
  }, [fetchAndApply]);

  const refresh = useCallback(async () => {
    if (!REVENUECAT_ANDROID_KEY) return;
    await fetchAndApply(Purchases.getCustomerInfo());
  }, [fetchAndApply]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      isSubscribed,
      isReady: REVENUECAT_ANDROID_KEY ? isReady : true,
      isBillingConfigured: !!REVENUECAT_ANDROID_KEY,
      managementURL,
      refresh,
    }),
    [isSubscribed, isReady, managementURL, refresh]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return ctx;
}
