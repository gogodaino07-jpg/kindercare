import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    if (!REVENUECAT_ANDROID_KEY) return; // 아직 RevenueCat API 키가 없으면 비구독 상태로 동작
    if (!configured) {
      configured = true;
      Purchases.configure({ apiKey: REVENUECAT_ANDROID_KEY });
    }

    Purchases.getCustomerInfo()
      .then(applyCustomerInfo)
      .catch(() => {})
      .finally(() => setIsReady(true));

    Purchases.addCustomerInfoUpdateListener(applyCustomerInfo);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(applyCustomerInfo);
    };
  }, [applyCustomerInfo]);

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
      Purchases.logIn(user.uid)
        .then(({ customerInfo }: { customerInfo: CustomerInfo }) => applyCustomerInfo(customerInfo))
        .catch(() => {});
    });
    return unsubscribe;
  }, [applyCustomerInfo]);

  const refresh = useCallback(async () => {
    if (!REVENUECAT_ANDROID_KEY) return;
    try {
      applyCustomerInfo(await Purchases.getCustomerInfo());
    } catch {}
  }, [applyCustomerInfo]);

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
