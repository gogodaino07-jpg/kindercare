import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { WEATHER_REGIONS } from '../constants/weatherRegions';

const STORAGE_KEY = 'kindercare:weatherRegion';

export interface StoredWeatherRegion {
  /** 17개 시·도 빠른 선택에서 왔으면 코드값, 검색(구/동)으로 왔으면 없음. */
  code?: string;
  label: string;
  latitude: number;
  longitude: number;
}

let cache: StoredWeatherRegion | null | undefined; // undefined = 아직 로드 안 함, null = 자동(GPS)

/** 예전 버전엔 지역 코드 문자열만 저장했음 — 새 JSON 포맷으로 하위 호환 변환. */
function parseStored(raw: string | null): StoredWeatherRegion | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.latitude === 'number' &&
      typeof parsed.longitude === 'number' &&
      typeof parsed.label === 'string'
    ) {
      return parsed as StoredWeatherRegion;
    }
  } catch {
    const legacy = WEATHER_REGIONS.find((r) => r.code === raw);
    if (legacy) return { code: legacy.code, label: legacy.label, latitude: legacy.latitude, longitude: legacy.longitude };
  }
  return null;
}

async function loadCache(): Promise<StoredWeatherRegion | null> {
  if (cache !== undefined) return cache;
  let loaded: StoredWeatherRegion | null = null;
  try {
    loaded = parseStored(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    loaded = null;
  }
  cache = loaded;
  return loaded;
}

/** 저장된 수동 지역 좌표를 반환(없으면 null) — useWeeklyWeather에서 GPS보다 우선 사용. */
export async function getStoredWeatherRegionCoords(): Promise<StoredWeatherRegion | null> {
  return loadCache();
}

/**
 * 설정 화면에서 날씨 조회 지역을 수동으로 고를 수 있게 하는 훅.
 * region이 null이면 "자동(GPS 우선, 실패 시 서울)".
 */
export function useWeatherRegion() {
  const [region, setRegionState] = useState<StoredWeatherRegion | null>(cache ?? null);

  useEffect(() => {
    let mounted = true;
    loadCache().then((loaded) => {
      if (mounted) setRegionState(loaded);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setRegion = useCallback(async (next: StoredWeatherRegion | null) => {
    cache = next;
    setRegionState(next);
    try {
      if (next) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return { region, setRegion };
}
