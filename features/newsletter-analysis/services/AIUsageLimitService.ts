import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from '../../../utils/firebase';

/** 무료 사용자의 주간 스캔 한도(알림장/급식 스캔이 이 한도를 공유). */
export const FREE_WEEKLY_LIMIT = 3;
/** 프리미엄 구독자의 주간/월간 스캔 한도 — 두 한도를 동시에 지켜야 함(둘 중 먼저 차는 쪽이 기준). */
export const PREMIUM_WEEKLY_LIMIT = 10;
export const PREMIUM_MONTHLY_LIMIT = 50;

const STORAGE_KEY = 'kindercare:aiAnalysisUsage'; // Firestore가 소스오브트루스, 이건 오프라인 폴백 캐시일 뿐

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

function remainingFor(usage: UsageRecord, isSubscribed: boolean): number {
  if (isSubscribed) {
    return Math.max(0, Math.min(PREMIUM_WEEKLY_LIMIT - usage.weekCount, PREMIUM_MONTHLY_LIMIT - usage.monthCount));
  }
  return Math.max(0, FREE_WEEKLY_LIMIT - usage.weekCount);
}

/**
 * AI 분석(알림장/급식 스캔) 무료 횟수를 계정(email) 기준으로 Firestore에 저장해 관리한다.
 * 예전에는 기기 로컬(AsyncStorage)에만 저장해 재설치하면 횟수가 초기화되는 문제가 있었음 —
 * 이제 계정에 귀속시켜 재설치/기기 변경으로는 초기화되지 않게 한다.
 * 프리미엄 구독자는 주간 한도와 월간 한도를 동시에 추적해 둘 중 먼저 소진되는 쪽을 기준으로 막는다.
 */
export const AIUsageLimitService = {
  async getRemainingCount(userId?: string, isSubscribed = false): Promise<number> {
    const usage = await this.readCurrentUsage(userId);
    return remainingFor(usage, isSubscribed);
  },

  async consume(userId?: string, isSubscribed = false): Promise<number> {
    const usage = await this.readCurrentUsage(userId);
    const nextRecord: UsageRecord = {
      ...usage,
      weekCount: usage.weekCount + 1,
      monthCount: usage.monthCount + 1,
    };
    await this.writeUsage(userId, nextRecord);
    return remainingFor(nextRecord, isSubscribed);
  },

  async resetUsage(userId: string): Promise<void> {
    await this.writeUsage(userId, normalizeUsage(null));
  },

  async readCurrentUsage(userId?: string): Promise<UsageRecord> {
    if (userId) {
      try {
        const doc = await getDb().collection('users').doc(userId).collection('meta').doc('aiUsage').get();
        const normalized = normalizeUsage(doc.exists ? (doc.data() as Partial<UsageRecord>) : null);
        await this.cacheLocally(userId, normalized);
        return normalized;
      } catch {
        // 오프라인 등으로 Firestore 조회에 실패하면 마지막으로 캐시해둔 값을 사용
        return normalizeUsage(await this.readLocalCache(userId));
      }
    }

    return normalizeUsage(await this.readLocalCache(undefined));
  },

  async writeUsage(userId: string | undefined, record: UsageRecord): Promise<void> {
    await this.cacheLocally(userId, record);
    if (!userId) return;
    try {
      await getDb().collection('users').doc(userId).collection('meta').doc('aiUsage').set(record);
    } catch {
      // 네트워크 실패해도 로컬 캐시는 이미 갱신됐으니 다음 조회 때 Firestore와 다시 맞춰짐
    }
  },

  async cacheLocally(userId: string | undefined, record: UsageRecord): Promise<void> {
    try {
      const key = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
      await AsyncStorage.setItem(key, JSON.stringify(record));
    } catch {}
  },

  async readLocalCache(userId: string | undefined): Promise<UsageRecord | null> {
    try {
      const key = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as UsageRecord) : null;
    } catch {
      return null;
    }
  },
};
