import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { StampBoardThemeId, STAMP_BOARD_THEMES } from '../constants/stampBoardThemes';

interface StampBoardData {
  targetCount: number;
  /** index i = i번째 칸에 찍힌 아이콘, 비어있으면 null. 칸을 직접 탭해서 채우거나
   *  지울 수 있어(자유 배치), 순서와 무관하게 각 칸이 자기 아이콘을 그대로 기억한다. */
  stamps: (string | null)[];
  /** index i = i번째 칸에 해당하는 미션 문구. targetCount와 항상 길이가 같다. */
  missions: string[];
  wish: string;
  themeId: StampBoardThemeId;
  stampIcon: string;
  soundEnabled: boolean;
}

const DEFAULT_TARGET_COUNT = 10;

function emptyStamps(count: number): (string | null)[] {
  return Array.from({ length: count }, () => null);
}

function emptyMissions(count: number): string[] {
  return Array.from({ length: count }, () => '');
}

const DEFAULT_DATA: StampBoardData = {
  targetCount: DEFAULT_TARGET_COUNT,
  stamps: emptyStamps(DEFAULT_TARGET_COUNT),
  missions: emptyMissions(DEFAULT_TARGET_COUNT),
  wish: '',
  themeId: 'blue',
  stampIcon: STAMP_BOARD_THEMES.blue.stickers[0],
  soundEnabled: true,
};

function storageKey(childId: string): string {
  return `kindercare:stampBoard:${childId}`;
}

const cache: Record<string, StampBoardData> = {};

/** 예전 버전(하루 1개 제한 + currentStamps/stampHistory 방식)에서 저장된 데이터를
 *  칸별 배열(stamps) 방식으로 변환한다. 이미 새 방식이면 그대로 쓴다. */
function migrateData(raw: any): StampBoardData {
  const targetCount = Math.max(1, raw.targetCount ?? DEFAULT_TARGET_COUNT);
  const missions = Array.from({ length: targetCount }, (_, i) => raw.missions?.[i] ?? '');
  if (Array.isArray(raw.stamps)) {
    const stamps = Array.from({ length: targetCount }, (_, i) => raw.stamps[i] ?? null);
    return { ...DEFAULT_DATA, ...raw, targetCount, stamps, missions };
  }
  const currentStamps: number = raw.currentStamps ?? 0;
  const stampHistory: string[] = raw.stampHistory ?? [];
  const fallbackIcon: string = raw.stampIcon ?? DEFAULT_DATA.stampIcon;
  const stamps = Array.from({ length: targetCount }, (_, i) =>
    i < currentStamps ? stampHistory[i] ?? fallbackIcon : null
  );
  return { ...DEFAULT_DATA, ...raw, targetCount, stamps, missions };
}

async function loadData(childId: string): Promise<StampBoardData> {
  if (cache[childId]) return cache[childId];
  let loaded: StampBoardData = DEFAULT_DATA;
  try {
    const raw = await AsyncStorage.getItem(storageKey(childId));
    if (raw) loaded = migrateData(JSON.parse(raw));
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
 * 하루 제한 없이 아무 칸이나 탭해서 자유롭게 찍고 지울 수 있다.
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

  const currentStamps = data.stamps.filter((s) => s !== null).length;
  const isCompleted = data.targetCount > 0 && currentStamps >= data.targetCount;

  /** 빈 칸을 현재 선택된 아이콘으로 채운다 — 이미 찍힌 칸은 지울 수 없다(실수 방지). */
  const placeStamp = useCallback((index: number) => {
    if (!childId) return;
    setData((prev) => {
      if (index < 0 || index >= prev.targetCount || prev.stamps[index]) return prev;
      const nextStamps = [...prev.stamps];
      nextStamps[index] = prev.stampIcon;
      const next: StampBoardData = { ...prev, stamps: nextStamps };
      persist(childId, next);
      return next;
    });
  }, [childId]);

  const updateSettings = useCallback(
    (targetCount: number, wish: string) => {
      if (!childId) return;
      setData((prev) => {
        const clampedTarget = Math.max(1, targetCount);
        const nextStamps = Array.from({ length: clampedTarget }, (_, i) => prev.stamps[i] ?? null);
        const nextMissions = Array.from({ length: clampedTarget }, (_, i) => prev.missions[i] ?? '');
        const next: StampBoardData = { ...prev, targetCount: clampedTarget, stamps: nextStamps, missions: nextMissions, wish };
        persist(childId, next);
        return next;
      });
    },
    [childId]
  );

  /** 미션 확인 화면에서 칸별 미션 문구를 한 번에 저장한다. */
  const setMissions = useCallback(
    (missions: string[]) => {
      if (!childId) return;
      setData((prev) => {
        const nextMissions = Array.from({ length: prev.targetCount }, (_, i) => missions[i] ?? '');
        const next: StampBoardData = { ...prev, missions: nextMissions };
        persist(childId, next);
        return next;
      });
    },
    [childId]
  );

  const resetProgress = useCallback(() => {
    if (!childId) return;
    setData((prev) => {
      const next: StampBoardData = { ...prev, stamps: emptyStamps(prev.targetCount) };
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
    stamps: data.stamps,
    missions: data.missions,
    currentStamps,
    wish: data.wish,
    themeId: data.themeId,
    stampIcon: data.stampIcon,
    soundEnabled: data.soundEnabled,
    isCompleted,
    placeStamp,
    updateSettings,
    setMissions,
    resetProgress,
    setTheme,
    setStampIcon,
    setSoundEnabled,
    refresh,
  };
}
