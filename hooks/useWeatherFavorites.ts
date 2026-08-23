import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { StoredWeatherRegion } from './useWeatherRegion';

const STORAGE_KEY = 'kindercare:weatherFavorites';

export interface WeatherFavoriteSlot {
  id: string;
  label: string;
  region: StoredWeatherRegion | null;
}

const DEFAULT_SLOTS: WeatherFavoriteSlot[] = [
  { id: 'home', label: '우리집', region: null },
  { id: 'work', label: '회사', region: null },
  { id: 'family', label: '본가', region: null },
];

let cache: WeatherFavoriteSlot[] | undefined; // undefined = 아직 로드 안 함

function makeSlotId(): string {
  return `slot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

async function loadCache(): Promise<WeatherFavoriteSlot[]> {
  if (cache !== undefined) return cache;
  let loaded = DEFAULT_SLOTS;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        loaded = parsed;
      } else if (parsed && typeof parsed === 'object') {
        // 예전엔 우리집/회사/본가 고정 3칸을 { home, work, family } 객체로 저장했음 —
        // 배열(자유 추가/삭제) 포맷으로 하위 호환 변환.
        const legacy = parsed as Record<string, StoredWeatherRegion | null>;
        loaded = DEFAULT_SLOTS.map((slot) => ({ ...slot, region: legacy[slot.id] ?? null }));
      }
    }
  } catch {
    loaded = DEFAULT_SLOTS;
  }
  cache = loaded;
  return loaded;
}

async function persist(slots: WeatherFavoriteSlot[]): Promise<void> {
  cache = slots;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
  } catch {}
}

/**
 * "자주 찾는 동네" 즐겨찾기 — 날씨 지역 설정 화면에서 지금 고른 지역을 한 칸에
 * 저장해두고, 다음엔 원터치로 그 지역으로 바로 바꿀 수 있게 한다. 칸은 자유롭게
 * 추가/삭제/이름 변경이 가능하다(기본 3칸: 우리집/회사/본가는 초기값일 뿐).
 */
export function useWeatherFavorites() {
  const [slots, setSlots] = useState<WeatherFavoriteSlot[]>(() => cache ?? DEFAULT_SLOTS);

  useEffect(() => {
    let mounted = true;
    loadCache().then((loaded) => {
      if (mounted) setSlots(loaded);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const saveToSlot = useCallback((id: string, region: StoredWeatherRegion | null) => {
    setSlots((prev) => {
      const next = prev.map((slot) => (slot.id === id ? { ...slot, region } : slot));
      persist(next);
      return next;
    });
  }, []);

  const addSlot = useCallback((label: string) => {
    setSlots((prev) => {
      const next = [...prev, { id: makeSlotId(), label, region: null }];
      persist(next);
      return next;
    });
  }, []);

  const renameSlot = useCallback((id: string, label: string) => {
    setSlots((prev) => {
      const next = prev.map((slot) => (slot.id === id ? { ...slot, label } : slot));
      persist(next);
      return next;
    });
  }, []);

  const removeSlot = useCallback((id: string) => {
    setSlots((prev) => {
      const next = prev.filter((slot) => slot.id !== id);
      persist(next);
      return next;
    });
  }, []);

  return { slots, saveToSlot, addSlot, renameSlot, removeSlot };
}
