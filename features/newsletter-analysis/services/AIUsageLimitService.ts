import AsyncStorage from '@react-native-async-storage/async-storage';

export const FREE_USAGE_LIMIT = 3;
const STORAGE_KEY = 'kindercare:aiAnalysisUsage';

interface MonthlyUsageRecord {
  month: string; // YYYY-MM
  count: number;
}

export const AIUsageLimitService = {
  async getRemainingCount(userId?: string): Promise<number> {
    const usage = await this.readCurrentUsage(userId);
    return Math.max(0, FREE_USAGE_LIMIT - usage.count);
  },

  async consume(userId?: string): Promise<number> {
    const usage = await this.readCurrentUsage(userId);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const nextRecord: MonthlyUsageRecord = {
      month: currentMonth,
      count: usage.count + 1,
    };
    try {
      const key = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
      await AsyncStorage.setItem(key, JSON.stringify(nextRecord));
    } catch {}
    return Math.max(0, FREE_USAGE_LIMIT - nextRecord.count);
  },

  async resetUsage(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${STORAGE_KEY}:${userId}`);
    } catch {}
  },

  async readCurrentUsage(userId?: string): Promise<MonthlyUsageRecord> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {
      const key = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return { month: currentMonth, count: 0 };

      const parsed = JSON.parse(raw) as MonthlyUsageRecord;
      // If the stored month is different from the current month, reset count to 0
      if (parsed.month !== currentMonth) {
        return { month: currentMonth, count: 0 };
      }
      return parsed;
    } catch {
      return { month: currentMonth, count: 0 };
    }
  }
};
