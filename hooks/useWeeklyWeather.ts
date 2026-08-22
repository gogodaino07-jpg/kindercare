import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
// 지역을 빠르게 연달아 바꿀 때 이전(느리게 도착한) 응답이 최신 응답을 덮어쓰지
// 않도록, 응답을 반영하기 전에 "그 요청이 여전히 최신 요청인지" 확인한다.
let latestRequestId = 0;
/** Background auto-refresh cadence — manual refresh is now pull-to-refresh only. */
const AUTO_REFRESH_MS = 60 * 60 * 1000;
/** 지역 칩을 연달아 빠르게 바꿀 때, 마지막 선택 후 이만큼 조용해야 실제로 재조회한다. */
const REGION_CHANGE_DEBOUNCE_MS = 400;

// 지역이 바뀐 순간 이미 화면에 떠 있는 useWeeklyWeather 인스턴스들에게 바로
// 알려주기 위한 구독자 목록. 캐시만 지우면(cachedResult=null) 다음 조회부터는
// 새 지역을 쓰지만, 이미 마운트된 홈 화면은 스스로 다시 불러오지 않아서 당겨서
// 새로고침하거나 자동 갱신 주기(1시간)가 돌 때까지 예전 지역 값이 그대로 보였다.
const invalidationListeners = new Set<() => void>();

/** 설정에서 날씨 지역을 바꿨을 때 다음 조회가 캐시된 이전 지역 값을 쓰지 않도록 무효화하고,
 *  지금 화면에 떠 있는 모든 useWeeklyWeather에 즉시 재조회를 트리거한다. */
export function invalidateWeatherCache(): void {
  cachedResult = null;
  cachedAt = 0;
  invalidationListeners.forEach((notify) => notify());
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
    const requestId = ++latestRequestId;
    try {
      const result = await withExternalAction(fetchWeeklyWeather);
      if (requestId !== latestRequestId) return; // 그 사이 더 최신 요청이 나감 — 이 결과는 버린다.
      cachedResult = result;
      cachedAt = Date.now();
      setRawDays(result.days);
      setUsingFallbackLocation(result.usingFallbackLocation);
      setLocationLabel(result.locationLabel);
    } catch (e) {
      if (requestId !== latestRequestId) return;
      setError(e instanceof Error ? e.message : '날씨 정보를 가져오지 못했어요');
    } finally {
      if (requestId === latestRequestId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 설정 화면에서 지역을 바꿔 invalidateWeatherCache()가 불리면, 당겨서
  // 새로고침을 하지 않아도 바로 새 지역 기준으로 다시 조회한다. 지역 칩을
  // 빠르게 연달아 누르는 경우까지 매번 즉시 호출하면 API가 낭비되니, 마지막
  // 선택 후 잠깐(REGION_CHANGE_DEBOUNCE_MS) 조용할 때만 한 번 호출한다.
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const notify = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => load(true), REGION_CHANGE_DEBOUNCE_MS);
    };
    invalidationListeners.add(notify);
    return () => {
      invalidationListeners.delete(notify);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [load]);

  // Background auto-refresh while Home stays mounted, independent of any
  // manual pull-to-refresh the user triggers.
  useEffect(() => {
    const id = setInterval(() => load(true), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const retry = useCallback(() => load(true), [load]);

  return { days, loading, error, retry, usingFallbackLocation, locationLabel };
}
