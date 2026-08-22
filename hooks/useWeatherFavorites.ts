import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { StoredWeatherRegion } from './useWeatherRegion';

const STORAGE_KEY = 'kindercare:weatherFavorites';

export interface WeatherFavoriteSlot {
  key: 'home' | 'work' | 'family';
  label: string;
  region: StoredWeatherRegion | null;
}

const DEFAULT_SLOTS: WeatherFavoriteSlot[] = [
  { key: 'home', label: '우리집', region: null },
  { key: 'work', label: '회사', region: null },
  { key: 'family', label: '본가', region: null },
];

let cache: WeatherFavoriteSlot[] | undefined; // undefined = 아직 로드 안 함

async function loadCache(): Promise<WeatherFavoriteSlot[]> {
  if (cache !== undefined) return cache;
  let loaded = DEFAULT_SLOTS;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, StoredWeatherRegion | null>;
      loaded = DEFAULT_SLOTS.map((slot) => ({ ...slot, region: parsed[slot.key] ?? null }));
    }
  } catch {
    loaded = DEFAULT_SLOTS;
  }
  cache = loaded;
  return loaded;
}

async function persist(slots: WeatherFavoriteSlot[]): Promise<void> {
  cache = slots;
  const record: Record<string, StoredWeatherRegion | null> = {};
  slots.forEach((slot) => {
    record[slot.key] = slot.region;
  });
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {}
}

/**
 * "우리집/회사/본가" 세 칸짜리 즐겨찾기 — 날씨 지역 설정 화면에서 지금 고른 지역을
 * 한 칸에 저장해두고, 다음엔 원터치로 그 지역으로 바로 바꿀 수 있게 한다.
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

  const saveToSlot = useCallback((key: WeatherFavoriteSlot['key'], region: StoredWeatherRegion) => {
    setSlots((prev) => {
      const next = prev.map((slot) => (slot.key === key ? { ...slot, region } : slot));
      persist(next);
      return next;
    });
  }, []);

  return { slots, saveToSlot };
}
