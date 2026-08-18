import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { toISODate } from '../utils/date';

interface StampBoardData {
  targetCount: number;
  currentStamps: number;
  wish: string;
  lastStampedDateISO: string | null;
}

const DEFAULT_DATA: StampBoardData = {
  targetCount: 10,
  currentStamps: 0,
  wish: '',
  lastStampedDateISO: null,
};

function storageKey(childId: string): string {
  return `kindercare:stampBoard:${childId}`;
}

const cache: Record<string, StampBoardData> = {};

async function loadData(childId: string): Promise<StampBoardData> {
  if (cache[childId]) return cache[childId];
  let loaded: StampBoardData = DEFAULT_DATA;
  try {
    const raw = await AsyncStorage.getItem(storageKey(childId));
    if (raw) loaded = { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch {}
  cache[childId] = loaded;
  return loaded;
}

async function persist(childId: string, data: StampBoardData): Promise<void> {
  cache[childId] = data;
  try {
    await AsyncStorage.setItem(storageKey(childId), JSON.stringify(data));
  } catch {}
}

/**
 * "참 잘했어요" 도장판 — 기기 로컬(AsyncStorage)에만 저장, 아이별로 분리 보관.
 * hasStampedToday/isCompleted는 저장된 플래그가 아니라 매번 계산해서
 * 날짜가 바뀌면 자동으로 다시 도장을 찍을 수 있게 한다.
 */
export function useStampBoard(childId: string | undefined) {
  const [data, setData] = useState<StampBoardData>(() => (childId && cache[childId]) || DEFAULT_DATA);

  useEffect(() => {
    if (!childId) return;
    let mounted = true;
    loadData(childId).then((loaded) => {
      if (mounted) setData(loaded);
    });
    return () => {
      mounted = false;
    };
  }, [childId]);

  const todayISO = toISODate(new Date());
  const hasStampedToday = data.lastStampedDateISO === todayISO;
  const isCompleted = data.targetCount > 0 && data.currentStamps >= data.targetCount;

  const addStamp = useCallback(() => {
    if (!childId || hasStampedToday || isCompleted) return;
    setData((prev) => {
      const next: StampBoardData = { ...prev, currentStamps: prev.currentStamps + 1, lastStampedDateISO: todayISO };
      persist(childId, next);
      return next;
    });
  }, [childId, hasStampedToday, isCompleted, todayISO]);

  const updateSettings = useCallback(
    (targetCount: number, wish: string) => {
      if (!childId) return;
      setData((prev) => {
        const next: StampBoardData = { ...prev, targetCount: Math.max(1, targetCount), wish };
        persist(childId, next);
        return next;
      });
    },
    [childId]
  );

  const resetProgress = useCallback(() => {
    if (!childId) return;
    setData((prev) => {
      const next: StampBoardData = { ...prev, currentStamps: 0, lastStampedDateISO: null };
      persist(childId, next);
      return next;
    });
  }, [childId]);

  return {
    targetCount: data.targetCount,
    currentStamps: data.currentStamps,
    wish: data.wish,
    hasStampedToday,
    isCompleted,
    addStamp,
    updateSettings,
    resetProgress,
  };
}
