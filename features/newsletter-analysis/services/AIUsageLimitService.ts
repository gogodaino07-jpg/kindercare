import AsyncStorage from '@react-native-async-storage/async-storage';
import { toISODate } from '../../../utils/date';

export const DAILY_ANALYSIS_LIMIT = 3;
const STORAGE_KEY = 'kindercare:aiAnalysisUsage';

interface UsageRecord {
  date: string;
  count: number;
}

export const AIUsageLimitService = {
  async getRemainingCount(userId?: string): Promise<number> {
    const usage = await this.readTodayUsage(userId);
    return Math.max(0, DAILY_ANALYSIS_LIMIT - usage.count);
  },

  async consume(userId?: string): Promise<number> {
    const usage = await this.readTodayUsage(userId);
    const nextRecord: UsageRecord = {
      date: toISODate(new Date()),
      count: usage.count + 1,
    };
    try {
      const key = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
      await AsyncStorage.setItem(key, JSON.stringify(nextRecord));
    } catch {}
    return Math.max(0, DAILY_ANALYSIS_LIMIT - nextRecord.count);
  },

  async resetUsage(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${STORAGE_KEY}:${userId}`);
    } catch {}
  },

  async provideAdReward(userId?: string): Promise<number> {
    const usage = await this.readTodayUsage(userId);
    const nextRecord: UsageRecord = {
      date: usage.date,
      count: Math.max(0, usage.count - 1), // Decrease usage count to increase remaining
    };
    try {
      const key = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
      await AsyncStorage.setItem(key, JSON.stringify(nextRecord));
    } catch {}
    return Math.max(0, DAILY_ANALYSIS_LIMIT - nextRecord.count);
  },

  async readTodayUsage(userId?: string): Promise<UsageRecord> {
    const today = toISODate(new Date());
    try {
      const key = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return { date: today, count: 0 };
      const parsed = JSON.parse(raw) as UsageRecord;
      if (parsed.date !== today) {
        return { date: today, count: 0 };
      }
      return parsed;
    } catch {
      return { date: today, count: 0 };
    }
  }
};
