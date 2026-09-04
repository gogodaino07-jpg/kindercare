// 진행 상황 / 보상 상태 관리 (AsyncStorage 로 로컬 저장)
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LEVELS, getLevel } from '../constants/levels';

const STORAGE_KEY = 'baby-math/progress-v1';

export interface GameState {
  playerName: string;
  stars: number;
  coins: number;
  /** 획득한 스티커 id 목록 */
  stickers: string[];
  /** 레벨별로 클리어한 스테이지 수 { 1: 2, 2: 0, ... } */
  clearedStages: Record<number, number>;
}

const INITIAL_STATE: GameState = {
  playerName: '우리 아기',
  stars: 0,
  coins: 0,
  stickers: [],
  clearedStages: {},
};

interface GameContextValue extends GameState {
  loaded: boolean;
  /** 해당 레벨이 잠금 해제됐는지 */
  isLevelUnlocked: (levelId: number) => boolean;
  /** 해당 레벨에서 다음에 도전할 스테이지 번호 (1부터, 이미 다 깼으면 총 스테이지 수) */
  nextStageOf: (levelId: number) => number;
  /** 레벨 전체 클리어 여부 */
  isLevelCleared: (levelId: number) => boolean;
  /** 지금 이어서 할 레벨 (모두 클리어면 마지막 레벨) */
  currentLevelId: number;
  addStars: (count: number) => void;
  /** 스테이지 클리어 기록. 레벨을 모두 깨면 스티커를 주고 스티커 id 를 돌려준다 */
  completeStage: (levelId: number, stage: number) => { unlockedSticker?: string };
  setPlayerName: (name: string) => void;
  resetProgress: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [loaded, setLoaded] = useState(false);

  // completeStage 처럼 "방금 스티커를 받았는지"를 즉시 알아야 하는 곳에서
  // 최신 상태를 동기적으로 읽기 위한 ref
  const stateRef = useRef(state);
  stateRef.current = state;

  // 상태를 최신값 기준으로 갱신하고, ref 도 같이 맞춰 준다
  const update = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  // 최초 1회 저장된 진행 상황 복원
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!alive) return;
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<GameState>;
          update({ ...INITIAL_STATE, ...parsed });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoaded(true);
      });
    // update 는 안정적인 콜백이라 최초 1회만 실행된다
    return () => {
      alive = false;
    };
  }, []);

  // 변경될 때마다 저장
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, loaded]);

  const isLevelCleared = useCallback(
    (levelId: number) => {
      const level = getLevel(levelId);
      if (!level) return false;
      return (state.clearedStages[levelId] ?? 0) >= level.stages;
    },
    [state.clearedStages],
  );

  const isLevelUnlocked = useCallback(
    (levelId: number) => {
      if (levelId <= LEVELS[0].id) return true;
      return isLevelCleared(levelId - 1);
    },
    [isLevelCleared],
  );

  const nextStageOf = useCallback(
    (levelId: number) => {
      const level = getLevel(levelId);
      if (!level) return 1;
      const cleared = state.clearedStages[levelId] ?? 0;
      return Math.min(cleared + 1, level.stages);
    },
    [state.clearedStages],
  );

  const currentLevelId = useMemo(() => {
    const next = LEVELS.find((level) => (state.clearedStages[level.id] ?? 0) < level.stages);
    return next ? next.id : LEVELS[LEVELS.length - 1].id;
  }, [state.clearedStages]);

  const addStars = useCallback(
    (count: number) => {
      const prev = stateRef.current;
      update({ ...prev, stars: prev.stars + count });
    },
    [update],
  );

  const completeStage = useCallback(
    (levelId: number, stage: number) => {
      const level = getLevel(levelId);
      if (!level) return {};
      const prev = stateRef.current;
      const cleared = prev.clearedStages[levelId] ?? 0;
      // 이미 깬 스테이지를 다시 풀면 진행도는 그대로 두고 코인만 준다
      const nextCleared = Math.max(cleared, Math.min(stage, level.stages));
      const justClearedLevel = cleared < level.stages && nextCleared >= level.stages;
      const unlockedSticker =
        justClearedLevel && !prev.stickers.includes(level.sticker.id) ? level.sticker.id : undefined;

      update({
        ...prev,
        coins: prev.coins + 1,
        clearedStages: { ...prev.clearedStages, [levelId]: nextCleared },
        stickers: unlockedSticker ? [...prev.stickers, unlockedSticker] : prev.stickers,
      });

      return { unlockedSticker };
    },
    [update],
  );

  const setPlayerName = useCallback(
    (name: string) => {
      const prev = stateRef.current;
      update({ ...prev, playerName: name.trim() || INITIAL_STATE.playerName });
    },
    [update],
  );

  const resetProgress = useCallback(() => update(INITIAL_STATE), [update]);

  const value = useMemo<GameContextValue>(
    () => ({
      ...state,
      loaded,
      isLevelUnlocked,
      isLevelCleared,
      nextStageOf,
      currentLevelId,
      addStars,
      completeStage,
      setPlayerName,
      resetProgress,
    }),
    [
      state,
      loaded,
      isLevelUnlocked,
      isLevelCleared,
      nextStageOf,
      currentLevelId,
      addStars,
      completeStage,
      setPlayerName,
      resetProgress,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame 은 GameProvider 안에서만 사용할 수 있어요.');
  return ctx;
}
