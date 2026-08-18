import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { WEATHER_REGIONS, WeatherRegion } from '../constants/weatherRegions';

const STORAGE_KEY = 'kindercare:weatherRegion';

let cache: string | null | undefined; // undefined = not loaded yet, null = 자동(GPS)

async function loadCache(): Promise<string | null> {
  if (cache !== undefined) return cache;
  let loaded: string | null = null;
  try {
    loaded = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    loaded = null;
  }
  cache = loaded;
  return loaded;
}

/** 저장된 수동 지역 좌표를 반환(없으면 null) — useWeeklyWeather에서 GPS보다 우선 사용. */
export async function getStoredWeatherRegionCoords(): Promise<WeatherRegion | null> {
  const code = await loadCache();
  if (!code) return null;
  return WEATHER_REGIONS.find((r) => r.code === code) ?? null;
}

/**
 * 설정 화면에서 날씨 조회 지역을 수동으로 고를 수 있게 하는 훅.
 * regionCode가 null이면 "자동(GPS 우선, 실패 시 서울)".
 */
export function useWeatherRegion() {
  const [regionCode, setRegionCodeState] = useState<string | null>(cache ?? null);

  useEffect(() => {
    let mounted = true;
    loadCache().then((loaded) => {
      if (mounted) setRegionCodeState(loaded);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setRegionCode = useCallback(async (code: string | null) => {
    cache = code;
    setRegionCodeState(code);
    try {
      if (code) await AsyncStorage.setItem(STORAGE_KEY, code);
      else await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return { regionCode, setRegionCode };
}
