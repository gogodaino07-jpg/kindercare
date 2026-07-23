import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
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
}

interface WeatherResult {
  days: WeatherDay[];
  usingFallbackLocation: boolean;
}

const SEOUL_COORDS = { latitude: 37.5665, longitude: 126.978 };

// Module-level cache so repeated Home mounts within the session don't refetch.
let cachedResult: WeatherResult | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30 * 60 * 1000;

async function resolveCoords(): Promise<{ coords: { latitude: number; longitude: number }; usingFallback: boolean }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { coords: SEOUL_COORDS, usingFallback: true };
    }
    const position = await Location.getCurrentPositionAsync({});
    return {
      coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
      usingFallback: false,
    };
  } catch {
    return { coords: SEOUL_COORDS, usingFallback: true };
  }
}

async function fetchWeeklyWeather(): Promise<WeatherResult> {
  const { coords, usingFallback } = await resolveCoords();
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;

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
    };
  });

  return { days, usingFallbackLocation: usingFallback };
}

export function useWeeklyWeather() {
  const [days, setDays] = useState<WeatherDay[] | null>(cachedResult?.days ?? null);
  const [usingFallbackLocation, setUsingFallbackLocation] = useState(
    cachedResult?.usingFallbackLocation ?? false
  );
  const [loading, setLoading] = useState(!cachedResult);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    const isFresh = cachedResult && Date.now() - cachedAt < CACHE_TTL_MS;
    if (isFresh && !force) {
      setDays(cachedResult!.days);
      setUsingFallbackLocation(cachedResult!.usingFallbackLocation);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // The permission prompt / GPS fix briefly blips AppState to
      // inactive/background on some platforms — suppress the lock/splash
      // replay that would otherwise fire the instant we get a fix back.
      const result = await withExternalAction(fetchWeeklyWeather);
      cachedResult = result;
      cachedAt = Date.now();
      setDays(result.days);
      setUsingFallbackLocation(result.usingFallbackLocation);
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

  const retry = useCallback(() => load(true), [load]);

  return { days, loading, error, retry, usingFallbackLocation };
}
