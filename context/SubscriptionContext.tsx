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

  // getCustomerInfo()/logIn() 응답과 SDK가 자체적으로 밀어주는 실시간 업데이트(push)가
  // 앱 시작 시, 그리고 백그라운드/포그라운드를 오갈 때마다 거의 동시에 여러 건 날아든다.
  // 이들이 도착하는 "순서"는 실제 데이터의 신선도와 무관하다 — 예전엔 나중에 보낸 요청의
  // 응답보다 push가 먼저 도착하면 그 push가 최신이라고 간주해 순번을 올려버렸는데, 정작
  // 그 push가 SDK 로컬 캐시에서 온 오래된 스냅샷이면 뒤이어 도착하는 진짜 최신 fetch 응답을
  // "예전 요청"으로 오인해 버려서, 화면을 들어갔다 나오거나 백그라운드/포그라운드를 반복하면
  // 구독 상태가 실제로는 안 바뀌었는데도 표시됐다 안 됐다 깜빡이는 원인이 됐다.
  // CustomerInfo에는 이 스냅샷이 실제로 언제 생성됐는지를 나타내는 requestDate가 들어있으므로,
  // 호출 순서 대신 이 값으로 신선도를 비교해 항상 실제로 더 최신인 데이터만 반영한다.
  const lastAppliedRequestTimeRef = useRef(0);
  const applyCustomerInfo = useCallback((info: CustomerInfo) => {
    const requestTime = new Date(info.requestDate).getTime();
    if (requestTime < lastAppliedRequestTimeRef.current) return; // 이미 적용된 것보다 오래된 스냅샷 — 버림
    lastAppliedRequestTimeRef.current = requestTime;
    setIsSubscribed(!!info.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
    setManagementURL(info.managementURL);
  }, []);

  const fetchAndApply = useCallback(
    async (promise: Promise<CustomerInfo>) => {
      try {
        const info = await promise;
        applyCustomerInfo(info);
      } catch {
        // 무시 — 실패한 요청이 기존 상태를 덮어쓰지 않게 그대로 둔다
      }
    },
    [applyCustomerInfo]
  );

  // Firebase Auth 상태가 확정되기 전에 무조건 먼저 쏘는 익명 getCustomerInfo()는
  // "익명" RevenueCat 사용자 기준으로 응답한다. 로그인된 사용자라면 이 익명 응답과
  // 로그인(logIn) 이후의 실제 사용자 응답이 거의 동시에 도착하는데, 이 둘은 서로
  // 다른 사용자의 응답이라 requestDate 비교(같은 사용자 응답끼리의 신선도 비교)로는
  // 걸러지지 않는다 — 게다가 예전엔 이 익명 응답만 보고 isReady를 먼저 true로
  // 켜버려서, 실제 로그인된(구독 중인) 사용자에게도 진짜 구독 상태가 확인되기 전
  // 짧은 순간 "미구독"으로 보여 광고가 뜨거나 설정 화면에 구독중 표시가 안 되는
  // 문제가 있었다. Firebase Auth 상태(로그인 여부)가 먼저 확정된 뒤, 그에 맞는
  // 조회(로그인 사용자는 logIn, 비로그인 사용자는 익명 getCustomerInfo) 하나만
  // 실행하고 그 응답이 도착한 뒤에야 isReady를 켠다.
  const identityEpochRef = useRef(0);

  useEffect(() => {
    if (!REVENUECAT_ANDROID_KEY) return; // 아직 RevenueCat API 키가 없으면 비구독 상태로 동작
    if (!configured) {
      configured = true;
      Purchases.configure({ apiKey: REVENUECAT_ANDROID_KEY });
    }

    // Firebase Auth 로그인이 확정되면 그 UID로 RevenueCat 사용자와 연결한다 — 기기를
    // 바꾸거나 재설치해도 같은 구독으로 인식되게 함. 이메일 대신 UID를 쓰는 이유는,
    // 이메일은 로그인 경로(구글/카카오)에 따라 검증 강도가 다를 수 있어 식별자로
    // 쓰기엔 약하고, Firebase Auth가 발급하는 UID가 실제 인증된 사용자를 훨씬
    // 신뢰성 있게 가리키기 때문이다.
    const unsubscribe = getFirebaseAuth().onAuthStateChanged((user: { uid: string } | null) => {
      identityEpochRef.current += 1;
      const epochAtStart = identityEpochRef.current;
      const infoPromise = user
        ? Purchases.logIn(user.uid).then(({ customerInfo }: { customerInfo: CustomerInfo }) => customerInfo)
        : Purchases.getCustomerInfo();
      fetchAndApply(infoPromise).finally(() => {
        if (identityEpochRef.current === epochAtStart) setIsReady(true);
      });
    });

    Purchases.addCustomerInfoUpdateListener(applyCustomerInfo);
    return () => {
      unsubscribe();
      Purchases.removeCustomerInfoUpdateListener(applyCustomerInfo);
    };
  }, [fetchAndApply, applyCustomerInfo]);

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
