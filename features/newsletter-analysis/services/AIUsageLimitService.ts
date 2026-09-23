import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from '../../../utils/firebase';

/** 무료 사용자가 광고 없이 바로 쓸 수 있는 평생 스캔 횟수 — 알림장/급식표를 구분하지 않고
 *  하나의 풀을 공유한다. 이 횟수를 다 쓰면 완전히 막히는 게 아니라, 구독하지 않는 한
 *  스캔마다 광고 시청이 필요해진다(무제한 반복 가능).
 *  2026-09-19: 새 이메일만 만들면 광고 없이 공짜로 스캔 2회를 받아갈 수 있어 봇 계정
 *  어뷰징의 진입 장벽이 너무 낮았다(가짜 계정 166개 발견) — 0으로 낮춰서 첫 스캔부터
 *  광고 시청을 요구하게 함. */
export const FREE_LIFETIME_LIMIT = 0;
/** 무료 사용자가 광고를 보고 계속 이용할 수 있는 한도를 "무제한"에서 "월 5회"로 낮춘다
 *  (2026-09-19) — 광고 시청만 하면 스캔이 무제한으로 계속 가능했는데, 스캔 1회당 비용이
 *  대략 ₩50 안팎이라 이 정도 한도로는 사용자당 비용 부담이 거의 없으면서도(월 최대 250원
 *  수준), 유치원 알림장이 주 2~3회씩 오는 실사용 빈도를 충분히 커버한다.
 *  알림장/급식표를 구분하지 않는 공유 풀이며, 매월 초기화된다. */
export const FREE_MONTHLY_LIMIT = 5;
/** 탈퇴 후 같은 이메일로 재가입했을 때, 무료 스캔 횟수를 다시 2회로 리셋해주기까지
 *  기다리는 기간. 탈퇴 즉시 리셋해주면 탈퇴+재가입을 반복해 무료 스캔을 무한정
 *  받아가는 어뷰징이 가능해서 텀을 둔다. */
const WITHDRAWAL_RESET_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
/** 프리미엄 구독자의 알림장 스캔 주간/월간 한도 — 두 한도를 동시에 지켜야 함(둘 중 먼저 차는 쪽이 기준). */
export const PREMIUM_WEEKLY_LIMIT = 10;
export const PREMIUM_MONTHLY_LIMIT = 50;

/** 프리미엄 구독자의 급식표 스캔 주간/월간 한도 — 알림장 스캔과 별도로 관리. */
export const PREMIUM_MEAL_WEEKLY_LIMIT = 5;
export const PREMIUM_MEAL_MONTHLY_LIMIT = 15;

/** 2026-09 서울 리전(asia-northeast3) Cloud Build/Artifact Registry/Cloud Run 장애로
 *  analyzeNewsletter 함수가 응답하지 못하는 동안, 사용자가 광고까지 보고도 "분석 실패"만
 *  받는 걸 막기 위한 임시 점검 모드. 구글 쪽 복구(또는 리전 이전) 확인되면 false로 되돌릴 것. */
export const AI_ANALYSIS_MAINTENANCE_MODE = false;
export const AI_ANALYSIS_MAINTENANCE_MESSAGE =
  '서버 점검 중이라 AI 분석을 잠시 사용할 수 없어요. 곧 복구할 예정이니 조금만 기다려주세요 🙏';

export type AIUsageType = 'newsletter' | 'meal';

/** 이 앱은 예전부터 알림장 스캔 기록을 이 키/문서명으로 저장해왔음 — 그대로 유지해 기존 사용자 데이터가 이어지게 한다. */
const STORAGE_KEY_BY_TYPE: Record<AIUsageType, string> = {
  newsletter: 'kindercare:aiAnalysisUsage',
  meal: 'kindercare:mealAnalysisUsage',
};
const DOC_ID_BY_TYPE: Record<AIUsageType, string> = {
  newsletter: 'aiUsage',
  meal: 'mealAiUsage',
};

/** 무료 사용자의 평생 공유 풀(알림장+급식표 합산) 저장 키/문서명 — 타입 구분 없이 하나만 쓴다. */
const FREE_LIFETIME_STORAGE_KEY = 'kindercare:aiFreeLifetimeUsage';
const FREE_LIFETIME_DOC_ID = 'aiUsageFreeLifetime';

function premiumLimitsFor(type: AIUsageType) {
  return type === 'meal'
    ? { weekly: PREMIUM_MEAL_WEEKLY_LIMIT, monthly: PREMIUM_MEAL_MONTHLY_LIMIT }
    : { weekly: PREMIUM_WEEKLY_LIMIT, monthly: PREMIUM_MONTHLY_LIMIT };
}

interface PremiumUsageRecord {
  weekStart: string; // 이번 주 월요일 ISO 날짜(YYYY-MM-DD)
  weekCount: number;
  monthStart: string; // YYYY-MM
  monthCount: number;
}

interface FreeLifetimeRecord {
  totalCount: number;
  /** 광고 시청 후 스캔한 횟수의 월간 카운터(FREE_MONTHLY_LIMIT 적용 대상). */
  monthStart?: string; // YYYY-MM
  monthCount?: number;
}

function getMondayISO(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = 일요일
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function currentWeekStart(): string {
  return getMondayISO(new Date());
}

function currentMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 주/월이 바뀌었으면 해당 카운트를 0으로 리셋 — 두 기간을 독립적으로 굴린다. */
function normalizePremiumUsage(data: Partial<PremiumUsageRecord> | null | undefined): PremiumUsageRecord {
  const weekStart = currentWeekStart();
  const monthStart = currentMonthStart();
  return {
    weekStart,
    weekCount: data?.weekStart === weekStart ? data.weekCount ?? 0 : 0,
    monthStart,
    monthCount: data?.monthStart === monthStart ? data.monthCount ?? 0 : 0,
  };
}

function remainingForPremium(usage: PremiumUsageRecord, type: AIUsageType): number {
  const limits = premiumLimitsFor(type);
  return Math.max(0, Math.min(limits.weekly - usage.weekCount, limits.monthly - usage.monthCount));
}

/**
 * AI 분석(알림장/급식표 스캔) 사용 횟수를 계정(email) 기준으로 Firestore에 저장해 관리한다.
 * 예전에는 기기 로컬(AsyncStorage)에만 저장해 재설치하면 횟수가 초기화되는 문제가 있었음 —
 * 이제 계정에 귀속시켜 재설치/기기 변경으로는 초기화되지 않게 한다.
 *
 * 무료 사용자는 알림장/급식표를 구분하지 않는 평생 공유 풀(FREE_LIFETIME_LIMIT)을 광고 없이
 * 쓰고, 이 풀을 모두 소진하면 스캔마다 광고 시청이 필요해진다(화면단 로직, 광고 게이트 자체는
 * 이 서비스가 관리하지 않음). 프리미엄 구독자는 알림장/급식표를 각각 독립된 주간/월간
 * 한도로 관리한다(둘 중 먼저 소진되는 쪽이 기준).
 */
export const AIUsageLimitService = {
  async getRemainingCount(userId?: string, isSubscribed = false, type: AIUsageType = 'newsletter'): Promise<number> {
    if (!isSubscribed) {
      if (userId) await this.applyWithdrawalCooldownResetIfEligible(userId);
      const usage = await this.readFreeLifetimeUsage(userId);
      return Math.max(0, FREE_LIFETIME_LIMIT - usage.totalCount);
    }
    const usage = await this.readPremiumUsage(userId, type);
    return remainingForPremium(usage, type);
  },

  /** 무료 사용자가 광고 시청 후 이번 달에 몇 회 더 스캔할 수 있는지(FREE_MONTHLY_LIMIT
   *  기준). 구독자에게는 의미 없는 값이라 항상 호출 전에 isSubscribed부터 확인할 것. */
  async getFreeMonthlyRemaining(userId?: string): Promise<number> {
    const usage = await this.readFreeLifetimeUsage(userId);
    const thisMonth = currentMonthStart();
    const monthCount = usage.monthStart === thisMonth ? (usage.monthCount ?? 0) : 0;
    return Math.max(0, FREE_MONTHLY_LIMIT - monthCount);
  },

  async consume(userId?: string, isSubscribed = false, type: AIUsageType = 'newsletter'): Promise<number> {
    if (!isSubscribed) {
      const usage = await this.readFreeLifetimeUsage(userId);
      const thisMonth = currentMonthStart();
      const monthCount = usage.monthStart === thisMonth ? (usage.monthCount ?? 0) : 0;
      const nextRecord: FreeLifetimeRecord = {
        totalCount: usage.totalCount + 1,
        monthStart: thisMonth,
        monthCount: monthCount + 1,
      };
      await this.writeFreeLifetimeUsage(userId, nextRecord);
      return Math.max(0, FREE_LIFETIME_LIMIT - nextRecord.totalCount);
    }
    const usage = await this.readPremiumUsage(userId, type);
    const nextRecord: PremiumUsageRecord = {
      ...usage,
      weekCount: usage.weekCount + 1,
      monthCount: usage.monthCount + 1,
    };
    await this.writePremiumUsage(userId, nextRecord, type);
    return remainingForPremium(nextRecord, type);
  },

  /** 계정 탈퇴/데이터 초기화 시 호출 — 공유 무료 풀과 해당 타입의 프리미엄 카운트를 모두 리셋한다. */
  async resetUsage(userId: string, type: AIUsageType = 'newsletter'): Promise<void> {
    await this.writeFreeLifetimeUsage(userId, { totalCount: 0 });
    await this.writePremiumUsage(userId, normalizePremiumUsage(null), type);
  },

  /**
   * 탈퇴 후 같은 이메일로 재가입한 사용자가 무료 스캔을 확인하려 할 때마다 호출된다.
   * users/{email} 문서의 withdrawnAt(탈퇴 시각)을 확인해서, 그로부터 쿨다운
   * (WITHDRAWAL_RESET_COOLDOWN_MS)이 지났으면 그때 처음으로 무료 스캔 2회를 다시
   * 채워주고 withdrawnAt을 지운다(그래야 다음 호출부터 또 리셋해버리지 않음).
   * withdrawnAt이 없거나(탈퇴 이력 없음) 쿨다운이 아직 안 지났으면 아무 일도 안 한다.
   */
  async applyWithdrawalCooldownResetIfEligible(userId: string): Promise<void> {
    try {
      const doc = await getDb().collection('users').doc(userId).get();
      const withdrawnAt = doc.exists ? (doc.data()?.withdrawnAt as string | undefined) : undefined;
      if (!withdrawnAt) return;
      const elapsedMs = Date.now() - new Date(withdrawnAt).getTime();
      if (elapsedMs < WITHDRAWAL_RESET_COOLDOWN_MS) return;
      await this.resetUsage(userId);
      await this.resetUsage(userId, 'meal');
      await getDb().collection('users').doc(userId).update({ withdrawnAt: null });
    } catch {
      // 확인에 실패하면 이번엔 그냥 넘어감 — 다음 조회 때 다시 시도됨
    }
  },

  async readFreeLifetimeUsage(userId?: string): Promise<FreeLifetimeRecord> {
    if (userId) {
      try {
        const doc = await getDb().collection('users').doc(userId).collection('meta').doc(FREE_LIFETIME_DOC_ID).get();
        const record: FreeLifetimeRecord = { totalCount: doc.exists ? (doc.data()?.totalCount ?? 0) : 0 };
        await this.cacheFreeLifetimeLocally(userId, record);
        return record;
      } catch {
        // 오프라인 등으로 Firestore 조회에 실패하면 마지막으로 캐시해둔 값을 사용
        return (await this.readFreeLifetimeLocalCache(userId)) ?? { totalCount: 0 };
      }
    }
    return (await this.readFreeLifetimeLocalCache(undefined)) ?? { totalCount: 0 };
  },

  async writeFreeLifetimeUsage(userId: string | undefined, record: FreeLifetimeRecord): Promise<void> {
    await this.cacheFreeLifetimeLocally(userId, record);
    if (!userId) return;
    try {
      await getDb().collection('users').doc(userId).collection('meta').doc(FREE_LIFETIME_DOC_ID).set(record);
    } catch {
      // 네트워크 실패해도 로컬 캐시는 이미 갱신됐으니 다음 조회 때 Firestore와 다시 맞춰짐
    }
  },

  async cacheFreeLifetimeLocally(userId: string | undefined, record: FreeLifetimeRecord): Promise<void> {
    try {
      const key = userId ? `${FREE_LIFETIME_STORAGE_KEY}:${userId}` : FREE_LIFETIME_STORAGE_KEY;
      await AsyncStorage.setItem(key, JSON.stringify(record));
    } catch {}
  },

  async readFreeLifetimeLocalCache(userId: string | undefined): Promise<FreeLifetimeRecord | null> {
    try {
      const key = userId ? `${FREE_LIFETIME_STORAGE_KEY}:${userId}` : FREE_LIFETIME_STORAGE_KEY;
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as FreeLifetimeRecord) : null;
    } catch {
      return null;
    }
  },

  async readPremiumUsage(userId: string | undefined, type: AIUsageType): Promise<PremiumUsageRecord> {
    if (userId) {
      try {
        const doc = await getDb().collection('users').doc(userId).collection('meta').doc(DOC_ID_BY_TYPE[type]).get();
        const normalized = normalizePremiumUsage(doc.exists ? (doc.data() as Partial<PremiumUsageRecord>) : null);
        await this.cachePremiumLocally(userId, normalized, type);
        return normalized;
      } catch {
        // 오프라인 등으로 Firestore 조회에 실패하면 마지막으로 캐시해둔 값을 사용
        return normalizePremiumUsage(await this.readPremiumLocalCache(userId, type));
      }
    }
    return normalizePremiumUsage(await this.readPremiumLocalCache(undefined, type));
  },

  async writePremiumUsage(userId: string | undefined, record: PremiumUsageRecord, type: AIUsageType): Promise<void> {
    await this.cachePremiumLocally(userId, record, type);
    if (!userId) return;
    try {
      await getDb().collection('users').doc(userId).collection('meta').doc(DOC_ID_BY_TYPE[type]).set(record);
    } catch {
      // 네트워크 실패해도 로컬 캐시는 이미 갱신됐으니 다음 조회 때 Firestore와 다시 맞춰짐
    }
  },

  async cachePremiumLocally(userId: string | undefined, record: PremiumUsageRecord, type: AIUsageType): Promise<void> {
    try {
      const base = STORAGE_KEY_BY_TYPE[type];
      const key = userId ? `${base}:${userId}` : base;
      await AsyncStorage.setItem(key, JSON.stringify(record));
    } catch {}
  },

  async readPremiumLocalCache(userId: string | undefined, type: AIUsageType): Promise<PremiumUsageRecord | null> {
    try {
      const base = STORAGE_KEY_BY_TYPE[type];
      const key = userId ? `${base}:${userId}` : base;
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as PremiumUsageRecord) : null;
    } catch {
      return null;
    }
  },
};
