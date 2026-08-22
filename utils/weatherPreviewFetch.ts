import { describeWeatherCode } from './weatherCode';

export interface WeatherPreview {
  tempC: number;
  emoji: string;
  label: string;
}

/**
 * 날씨 지역 설정 화면에서 "지금 고르고 있는 지역"의 오늘 기온을 바로 보여주기 위한
 * 가벼운 1회성 조회 — 저장 여부와 무관하게 좌표만 넘기면 오늘 날씨만 받아온다.
 * 홈 화면의 useWeeklyWeather(주간 예보 + 캐시)와는 별개의 용도라 캐시를 공유하지 않는다.
 */
export async function fetchWeatherPreview(latitude: number, longitude: number): Promise<WeatherPreview | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&daily=weather_code,temperature_2m_max&timezone=auto&forecast_days=1`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const json = await response.json();
    const code = json?.daily?.weather_code?.[0];
    const tempMax = json?.daily?.temperature_2m_max?.[0];
    if (typeof code !== 'number' || typeof tempMax !== 'number') return null;
    const { emoji, label } = describeWeatherCode(code);
    return { tempC: Math.round(tempMax), emoji, label };
  } catch {
    return null;
  }
}
