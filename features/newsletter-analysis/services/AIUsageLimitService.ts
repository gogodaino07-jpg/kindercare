import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from '../../../utils/firebase';

/** 무료 사용자의 주간 알림장 스캔 한도. */
export const FREE_WEEKLY_LIMIT = 5;
/** 프리미엄 구독자의 알림장 스캔 주간/월간 한도 — 두 한도를 동시에 지켜야 함(둘 중 먼저 차는 쪽이 기준). */
export const PREMIUM_WEEKLY_LIMIT = 10;
export const PREMIUM_MONTHLY_LIMIT = 50;

/** 무료 사용자의 주간 급식표 스캔 한도 — 알림장 스캔과 별도로 관리(급식표는 보통 훨씬 뜸하게 게시되므로 한도를 낮게 둠). */
export const FREE_MEAL_WEEKLY_LIMIT = 2;
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

function limitsFor(type: AIUsageType) {
  return type === 'meal'
    ? { free: FREE_MEAL_WEEKLY_LIMIT, premiumWeekly: PREMIUM_MEAL_WEEKLY_LIMIT, premiumMonthly: PREMIUM_MEAL_MONTHLY_LIMIT }
    : { free: FREE_WEEKLY_LIMIT, premiumWeekly: PREMIUM_WEEKLY_LIMIT, premiumMonthly: PREMIUM_MONTHLY_LIMIT };
}

interface UsageRecord {
  weekStart: string; // 이번 주 월요일 ISO 날짜(YYYY-MM-DD)
  weekCount: number;
  monthStart: string; // YYYY-MM
  monthCount: number;
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
function normalizeUsage(data: Partial<UsageRecord> | null | undefined): UsageRecord {
  const weekStart = currentWeekStart();
  const monthStart = currentMonthStart();
  return {
    weekStart,
    weekCount: data?.weekStart === weekStart ? data.weekCount ?? 0 : 0,
    monthStart,
    monthCount: data?.monthStart === monthStart ? data.monthCount ?? 0 : 0,
  };
}

function remainingFor(usage: UsageRecord, isSubscribed: boolean, type: AIUsageType): number {
  const limits = limitsFor(type);
  if (isSubscribed) {
    return Math.max(0, Math.min(limits.premiumWeekly - usage.weekCount, limits.premiumMonthly - usage.monthCount));
  }
  return Math.max(0, limits.free - usage.weekCount);
}

/**
 * AI 분석(알림장/급식표 스캔) 무료 횟수를 계정(email) 기준으로 Firestore에 저장해 관리한다.
 * 예전에는 기기 로컬(AsyncStorage)에만 저장해 재설치하면 횟수가 초기화되는 문제가 있었음 —
 * 이제 계정에 귀속시켜 재설치/기기 변경으로는 초기화되지 않게 한다.
 * 프리미엄 구독자는 주간 한도와 월간 한도를 동시에 추적해 둘 중 먼저 소진되는 쪽을 기준으로 막는다.
 * 알림장 스캔과 급식표 스캔은 `type`으로 서로 다른 문서/한도를 쓰는 별도의 횟수 풀이다
 * (type을 생략하면 기존 알림장 스캔과 동일하게 동작 — 하위 호환용 기본값).
 */
export const AIUsageLimitService = {
  async getRemainingCount(userId?: string, isSubscribed = false, type: AIUsageType = 'newsletter'): Promise<number> {
    const usage = await this.readCurrentUsage(userId, type);
    return remainingFor(usage, isSubscribed, type);
  },

  async consume(userId?: string, isSubscribed = false, type: AIUsageType = 'newsletter'): Promise<number> {
    const usage = await this.readCurrentUsage(userId, type);
    const nextRecord: UsageRecord = {
      ...usage,
      weekCount: usage.weekCount + 1,
      monthCount: usage.monthCount + 1,
    };
    await this.writeUsage(userId, nextRecord, type);
    return remainingFor(nextRecord, isSubscribed, type);
  },

  async resetUsage(userId: string, type: AIUsageType = 'newsletter'): Promise<void> {
    await this.writeUsage(userId, normalizeUsage(null), type);
  },

  async readCurrentUsage(userId?: string, type: AIUsageType = 'newsletter'): Promise<UsageRecord> {
    if (userId) {
      try {
        const doc = await getDb().collection('users').doc(userId).collection('meta').doc(DOC_ID_BY_TYPE[type]).get();
        const normalized = normalizeUsage(doc.exists ? (doc.data() as Partial<UsageRecord>) : null);
        await this.cacheLocally(userId, normalized, type);
        return normalized;
      } catch {
        // 오프라인 등으로 Firestore 조회에 실패하면 마지막으로 캐시해둔 값을 사용
        return normalizeUsage(await this.readLocalCache(userId, type));
      }
    }

    return normalizeUsage(await this.readLocalCache(undefined, type));
  },

  async writeUsage(userId: string | undefined, record: UsageRecord, type: AIUsageType = 'newsletter'): Promise<void> {
    await this.cacheLocally(userId, record, type);
    if (!userId) return;
    try {
      await getDb().collection('users').doc(userId).collection('meta').doc(DOC_ID_BY_TYPE[type]).set(record);
    } catch {
      // 네트워크 실패해도 로컬 캐시는 이미 갱신됐으니 다음 조회 때 Firestore와 다시 맞춰짐
    }
  },

  async cacheLocally(userId: string | undefined, record: UsageRecord, type: AIUsageType = 'newsletter'): Promise<void> {
    try {
      const base = STORAGE_KEY_BY_TYPE[type];
      const key = userId ? `${base}:${userId}` : base;
      await AsyncStorage.setItem(key, JSON.stringify(record));
    } catch {}
  },

  async readLocalCache(userId: string | undefined, type: AIUsageType = 'newsletter'): Promise<UsageRecord | null> {
    try {
      const base = STORAGE_KEY_BY_TYPE[type];
      const key = userId ? `${base}:${userId}` : base;
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as UsageRecord) : null;
    } catch {
      return null;
    }
  },
};
