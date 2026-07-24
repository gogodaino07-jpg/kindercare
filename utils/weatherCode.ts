export interface WeatherCodeInfo {
  emoji: string;
  label: string;
}

/** Maps Open-Meteo WMO weather codes to a simple emoji + Korean label. */
export function describeWeatherCode(code: number): WeatherCodeInfo {
  if (code === 0) return { emoji: '☀️', label: '맑음' };
  if (code === 1 || code === 2) return { emoji: '🌤️', label: '대체로 맑음' };
  if (code === 3) return { emoji: '☁️', label: '흐림' };
  if (code === 45 || code === 48) return { emoji: '🌫️', label: '안개' };
  if (code >= 51 && code <= 57) return { emoji: '🌦️', label: '이슬비' };
  if (code >= 61 && code <= 67) return { emoji: '🌧️', label: '비' };
  if (code >= 71 && code <= 77) return { emoji: '❄️', label: '눈' };
  if (code >= 80 && code <= 82) return { emoji: '🌧️', label: '소나기' };
  if (code === 85 || code === 86) return { emoji: '🌨️', label: '눈 소나기' };
  if (code >= 95) return { emoji: '⛈️', label: '뇌우' };
  return { emoji: '🌡️', label: '알 수 없음' };
}

/** Short 등원 팁 guide text for today's weather, shown under the weather strip. */
export function describeGuideTip(label: string): string {
  if (label === '맑음' || label === '대체로 맑음') return '화창해요! 야외 놀이하기 좋은 날이에요 ☀️';
  if (label === '흐림') return '구름이 많아요. 가벼운 겉옷을 챙겨주세요 ☁️';
  if (label === '안개') return '안개가 껴요. 등원길 조심히 다녀오세요 🌫️';
  if (label === '이슬비' || label === '비') return '비가 와요! 우산을 꼭 챙겨주세요 ☔';
  if (label === '눈' || label === '눈 소나기') return '눈이 와요. 미끄럼 조심하고 따뜻하게 입혀주세요 ❄️';
  if (label === '소나기') return '소나기가 올 수 있어요. 우산을 챙겨주세요 🌦️';
  if (label === '뇌우') return '천둥·번개가 있어요. 실내 활동을 추천해요 ⛈️';
  return '오늘도 즐거운 하루 보내세요 🐥';
}
