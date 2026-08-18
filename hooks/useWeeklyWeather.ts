import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStoredWeatherRegionCoords } from './useWeatherRegion';
import { formatMD, toISODate } from '../utils/date';
import { withExternalAction } from '../utils/externalAction';
import { describeWeatherCode } from '../utils/weatherCode';

export interface WeatherDay {
  date: string;
  weekdayLabel: string;
  tempMax: number;
  tempMin: number;
  emoji: string;
  label: string;
  isToday: boolean;
  isTomorrow: boolean;
  isYesterday: boolean;
}

interface WeatherResult {
  days: WeatherDay[];
  usingFallbackLocation: boolean;
  locationLabel: string;
}

/** 날씨 데이터의 실제 출처 — 홈 화면에 그대로 노출되므로 사실과 다른 값(예: 기상청)을 쓰지 않는다. */
export const WEATHER_SOURCE_LABEL = 'Open-Meteo';

const SEOUL_COORDS = { latitude: 37.5665, longitude: 126.978 };

// Module-level cache so repeated Home mounts within the session don't refetch.
let cachedResult: WeatherResult | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;
/** Background auto-refresh cadence — manual refresh is now pull-to-refresh only. */
const AUTO_REFRESH_MS = 60 * 60 * 1000;

/** 설정에서 날씨 지역을 바꿨을 때 다음 조회가 캐시된 이전 지역 값을 쓰지 않도록 무효화. */
export function invalidateWeatherCache(): void {
  cachedResult = null;
  cachedAt = 0;
}

/** GPS 좌표를 "시 구" 정도의 짧은 표기로 역지오코딩. 실패하면 '내 위치'. */
async function resolveLocationLabel(coords: { latitude: number; longitude: number }): Promise<string> {
  try {
    const results = await Location.reverseGeocodeAsync(coords);
    const place = results[0];
    if (!place) return '내 위치';
    const parts = [place.city ?? place.region ?? undefined, place.district ?? undefined].filter(
      (v): v is string => !!v
    );
    return parts.length > 0 ? parts.join(' ') : '내 위치';
  } catch {
    return '내 위치';
  }
}

export async function resolveCoords(): Promise<{
  coords: { latitude: number; longitude: number };
  usingFallback: boolean;
  locationLabel: string;
}> {
  // 설정에서 지역을 수동으로 골랐으면 GPS보다 우선한다.
  const manualRegion = await getStoredWeatherRegionCoords();
  if (manualRegion) {
    return {
      coords: { latitude: manualRegion.latitude, longitude: manualRegion.longitude },
      usingFallback: false,
      locationLabel: manualRegion.label,
    };
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { coords: SEOUL_COORDS, usingFallback: true, locationLabel: '서울' };
    }

    // Try to get the last known location first for near-instant results.
    const lastKnown = await Location.getLastKnownPositionAsync({});
    if (lastKnown) {
      const coords = { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
      return { coords, usingFallback: false, locationLabel: await resolveLocationLabel(coords) };
    }

    // Fall back to current position with Balanced accuracy (faster than High).
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    return { coords, usingFallback: false, locationLabel: await resolveLocationLabel(coords) };
  } catch {
    return { coords: SEOUL_COORDS, usingFallback: true, locationLabel: '서울' };
  }
}

async function fetchWeeklyWeather(): Promise<WeatherResult> {
  const { coords, usingFallback, locationLabel } = await resolveCoords();
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7&past_days=1`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`날씨 정보를 가져오지 못했어요 (${response.status})`);
  }
  const json = await response.json();
  const { time, weather_code, temperature_2m_max, temperature_2m_min } = json.daily as {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };

  const today = toISODate(new Date());
  const tomorrow = toISODate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const yesterday = toISODate(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const days: WeatherDay[] = time.map((date, i) => {
    const { emoji, label } = describeWeatherCode(weather_code[i]);
    return {
      date,
      weekdayLabel: formatMD(date),
      tempMax: Math.round(temperature_2m_max[i]),
      tempMin: Math.round(temperature_2m_min[i]),
      emoji,
      label,
      isToday: date === today,
      isTomorrow: date === tomorrow,
      isYesterday: date === yesterday,
    };
  });

  return { days, usingFallbackLocation: usingFallback, locationLabel };
}

export function useWeeklyWeather() {
  const [rawDays, setRawDays] = useState<WeatherDay[] | null>(cachedResult?.days ?? null);
  const [usingFallbackLocation, setUsingFallbackLocation] = useState(
    cachedResult?.usingFallbackLocation ?? false
  );
  const [locationLabel, setLocationLabel] = useState(cachedResult?.locationLabel ?? '');
  const [loading, setLoading] = useState(!cachedResult);
  const [error, setError] = useState<string | null>(null);

  // Compute live today/tomorrow status every time the component renders or rawDays changes
  const days = useMemo(() => {
    if (!rawDays) return null;
    const todayISO = toISODate(new Date());
    const tomorrowISO = toISODate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const yesterdayISO = toISODate(new Date(Date.now() - 24 * 60 * 60 * 1000));

    return rawDays.map(d => ({
      ...d,
      isToday: d.date === todayISO,
      isTomorrow: d.date === tomorrowISO,
      isYesterday: d.date === yesterdayISO,
    }));
  }, [rawDays]);

  const load = useCallback(async (force = false) => {
    const isFresh = cachedResult && Date.now() - cachedAt < CACHE_TTL_MS;
    if (isFresh && !force) {
      setRawDays(cachedResult!.days);
      setUsingFallbackLocation(cachedResult!.usingFallbackLocation);
      setLocationLabel(cachedResult!.locationLabel);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await withExternalAction(fetchWeeklyWeather);
      cachedResult = result;
      cachedAt = Date.now();
      setRawDays(result.days);
      setUsingFallbackLocation(result.usingFallbackLocation);
      setLocationLabel(result.locationLabel);
    } catch (e) {
      setError(e instanceof Error ? e.message : '날씨 정보를 가져오지 못했어요');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background auto-refresh while Home stays mounted, independent of any
  // manual pull-to-refresh the user triggers.
  useEffect(() => {
    const id = setInterval(() => load(true), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const retry = useCallback(() => load(true), [load]);

  return { days, loading, error, retry, usingFallbackLocation, locationLabel };
}
