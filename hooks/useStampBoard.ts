import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { StampBoardThemeId, STAMP_BOARD_THEMES } from '../constants/stampBoardThemes';
import { toISODate } from '../utils/date';

interface StampBoardData {
  targetCount: number;
  currentStamps: number;
  wish: string;
  lastStampedDateISO: string | null;
  themeId: StampBoardThemeId;
  stampIcon: string;
  soundEnabled: boolean;
  /** index i = i번째로 찍힌 도장에 실제로 쓰인 아이콘. 이후 stampIcon을 바꿔도
   *  이미 찍힌 도장은 그때 그 아이콘 그대로 보이게 하기 위함. */
  stampHistory: string[];
}

const DEFAULT_DATA: StampBoardData = {
  targetCount: 10,
  currentStamps: 0,
  wish: '',
  lastStampedDateISO: null,
  themeId: 'blue',
  stampIcon: STAMP_BOARD_THEMES.blue.stickers[0],
  soundEnabled: true,
  stampHistory: [],
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
      const next: StampBoardData = {
        ...prev,
        currentStamps: prev.currentStamps + 1,
        lastStampedDateISO: todayISO,
        stampHistory: [...prev.stampHistory, prev.stampIcon],
      };
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
      const next: StampBoardData = { ...prev, currentStamps: 0, lastStampedDateISO: null, stampHistory: [] };
      persist(childId, next);
      return next;
    });
  }, [childId]);

  const setTheme = useCallback(
    (themeId: StampBoardThemeId) => {
      if (!childId) return;
      setData((prev) => {
        const next: StampBoardData = { ...prev, themeId, stampIcon: STAMP_BOARD_THEMES[themeId].stickers[0] };
        persist(childId, next);
        return next;
      });
    },
    [childId]
  );

  const setStampIcon = useCallback(
    (stampIcon: string) => {
      if (!childId) return;
      setData((prev) => {
        const next: StampBoardData = { ...prev, stampIcon };
        persist(childId, next);
        return next;
      });
    },
    [childId]
  );

  const setSoundEnabled = useCallback(
    (soundEnabled: boolean) => {
      if (!childId) return;
      setData((prev) => {
        const next: StampBoardData = { ...prev, soundEnabled };
        persist(childId, next);
        return next;
      });
    },
    [childId]
  );

  /** 당겨서 새로고침 — 캐시를 버리고 저장소에서 다시 읽어와 상태를 맞춘다. */
  const refresh = useCallback(async () => {
    if (!childId) return;
    delete cache[childId];
    const loaded = await loadData(childId);
    setData(loaded);
  }, [childId]);

  return {
    targetCount: data.targetCount,
    currentStamps: data.currentStamps,
    wish: data.wish,
    themeId: data.themeId,
    stampIcon: data.stampIcon,
    stampHistory: data.stampHistory,
    soundEnabled: data.soundEnabled,
    hasStampedToday,
    isCompleted,
    addStamp,
    updateSettings,
    resetProgress,
    setTheme,
    setStampIcon,
    setSoundEnabled,
    refresh,
  };
}
