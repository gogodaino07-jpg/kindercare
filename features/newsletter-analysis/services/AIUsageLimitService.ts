import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from '../../../utils/firebase';

/** 무료 사용자의 평생 무료 스캔 횟수 — 알림장/급식표를 구분하지 않고 하나의 풀을 공유한다. */
export const FREE_LIFETIME_LIMIT = 5;
/** 프리미엄 구독자의 알림장 스캔 주간/월간 한도 — 두 한도를 동시에 지켜야 함(둘 중 먼저 차는 쪽이 기준). */
export const PREMIUM_WEEKLY_LIMIT = 10;
export const PREMIUM_MONTHLY_LIMIT = 50;

/** 프리미엄 구독자의 급식표 스캔 주간/월간 한도 — 알림장 스캔과 별도로 관리. */
export const PREMIUM_MEAL_WEEKLY_LIMIT = 5;
export const PREMIUM_MEAL_MONTHLY_LIMIT = 15;

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
 * 무료 사용자는 알림장/급식표를 구분하지 않는 평생 공유 풀(FREE_LIFETIME_LIMIT)을 쓰고,
 * 이 풀을 모두 소진하면 프리미엄 구독이 필요하다. 프리미엄 구독자는 알림장/급식표를
 * 각각 독립된 주간/월간 한도로 관리한다(둘 중 먼저 소진되는 쪽이 기준).
 */
export const AIUsageLimitService = {
  async getRemainingCount(userId?: string, isSubscribed = false, type: AIUsageType = 'newsletter'): Promise<number> {
    if (!isSubscribed) {
      const usage = await this.readFreeLifetimeUsage(userId);
      return Math.max(0, FREE_LIFETIME_LIMIT - usage.totalCount);
    }
    const usage = await this.readPremiumUsage(userId, type);
    return remainingForPremium(usage, type);
  },

  async consume(userId?: string, isSubscribed = false, type: AIUsageType = 'newsletter'): Promise<number> {
    if (!isSubscribed) {
      const usage = await this.readFreeLifetimeUsage(userId);
      const nextRecord: FreeLifetimeRecord = { totalCount: usage.totalCount + 1 };
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
