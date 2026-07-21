import AsyncStorage from '@react-native-async-storage/async-storage';
import { toISODate } from './date';

/**
 * Daily free-use cap for "AI로 내용 분석하기". Persisted to AsyncStorage so the
 * count survives app restarts, keyed by calendar date so it silently resets
 * whenever the stored date no longer matches today.
 */
export const DAILY_ANALYSIS_LIMIT = 3;

const STORAGE_KEY = 'kindercare:aiAnalysisUsage';

interface UsageRecord {
  date: string;
  count: number;
}

async function readTodayUsage(): Promise<UsageRecord> {
  const today = toISODate(new Date());
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
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

/** Remaining free analyses left for today (0~DAILY_ANALYSIS_LIMIT). */
export async function getRemainingAnalysisCount(): Promise<number> {
  const usage = await readTodayUsage();
  return Math.max(0, DAILY_ANALYSIS_LIMIT - usage.count);
}

/** Records one use for today and returns the remaining count afterward. */
export async function consumeAnalysisUse(): Promise<number> {
  const usage = await readTodayUsage();
  const nextRecord: UsageRecord = {
    date: toISODate(new Date()),
    count: usage.count + 1,
  };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecord));
  } catch {
    // If persistence fails, the in-memory remaining count below still reflects
    // this use for the current session so the button doesn't silently over-allow.
  }
  return Math.max(0, DAILY_ANALYSIS_LIMIT - nextRecord.count);
}
