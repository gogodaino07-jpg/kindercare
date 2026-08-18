import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from '../../../utils/firebase';

/** 1주일에 무료로 스캔(알림장/급식)할 수 있는 총 횟수. 알림장 스캔과 급식 스캔이 이 한도를 공유한다. */
export const FREE_USAGE_LIMIT = 5;
const STORAGE_KEY = 'kindercare:aiAnalysisUsage'; // Firestore가 소스오브트루스, 이건 오프라인 폴백 캐시일 뿐

interface WeeklyUsageRecord {
  weekStart: string; // 이번 주 월요일 ISO 날짜(YYYY-MM-DD)
  count: number;
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

/**
 * AI 분석(알림장/급식 스캔) 무료 횟수를 계정(email) 기준으로 Firestore에 저장해 관리한다.
 * 예전에는 기기 로컬(AsyncStorage)에만 저장해 재설치하면 횟수가 초기화되는 문제가 있었음 —
 * 이제 계정에 귀속시켜 재설치/기기 변경으로는 초기화되지 않게 한다.
 */
export const AIUsageLimitService = {
  async getRemainingCount(userId?: string): Promise<number> {
    const usage = await this.readCurrentUsage(userId);
    return Math.max(0, FREE_USAGE_LIMIT - usage.count);
  },

  async consume(userId?: string): Promise<number> {
    const usage = await this.readCurrentUsage(userId);
    const nextRecord: WeeklyUsageRecord = { weekStart: currentWeekStart(), count: usage.count + 1 };
    await this.writeUsage(userId, nextRecord);
    return Math.max(0, FREE_USAGE_LIMIT - nextRecord.count);
  },

  async resetUsage(userId: string): Promise<void> {
    await this.writeUsage(userId, { weekStart: currentWeekStart(), count: 0 });
  },

  async readCurrentUsage(userId?: string): Promise<WeeklyUsageRecord> {
    const weekStart = currentWeekStart();

    if (userId) {
      try {
        const doc = await getDb().collection('users').doc(userId).collection('meta').doc('aiUsage').get();
        if (doc.exists) {
          const data = doc.data() as WeeklyUsageRecord;
          if (data.weekStart === weekStart) {
            await this.cacheLocally(userId, data);
            return data;
          }
        }
        return { weekStart, count: 0 };
      } catch {
        // 오프라인 등으로 Firestore 조회에 실패하면 마지막으로 캐시해둔 값을 사용
        const cached = await this.readLocalCache(userId);
        if (cached && cached.weekStart === weekStart) return cached;
        return { weekStart, count: 0 };
      }
    }

    const cached = await this.readLocalCache(undefined);
    if (cached && cached.weekStart === weekStart) return cached;
    return { weekStart, count: 0 };
  },

  async writeUsage(userId: string | undefined, record: WeeklyUsageRecord): Promise<void> {
    await this.cacheLocally(userId, record);
    if (!userId) return;
    try {
      await getDb().collection('users').doc(userId).collection('meta').doc('aiUsage').set(record);
    } catch {
      // 네트워크 실패해도 로컬 캐시는 이미 갱신됐으니 다음 조회 때 Firestore와 다시 맞춰짐
    }
  },

  async cacheLocally(userId: string | undefined, record: WeeklyUsageRecord): Promise<void> {
    try {
      const key = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
      await AsyncStorage.setItem(key, JSON.stringify(record));
    } catch {}
  },

  async readLocalCache(userId: string | undefined): Promise<WeeklyUsageRecord | null> {
    try {
      const key = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as WeeklyUsageRecord) : null;
    } catch {
      return null;
    }
  },
};
