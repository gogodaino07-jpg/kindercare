export interface WeatherRegion {
  code: string;
  label: string;
  latitude: number;
  longitude: number;
}

/** 날씨 조회용 지역 목록(시/도 단위 대표 좌표) — 위치 권한을 안 쓰거나 GPS가 부정확할 때 수동으로 고를 수 있게 한다. */
export const WEATHER_REGIONS: WeatherRegion[] = [
  { code: '1', label: '서울', latitude: 37.5665, longitude: 126.978 },
  { code: '6', label: '부산', latitude: 35.1796, longitude: 129.0756 },
  { code: '4', label: '대구', latitude: 35.8714, longitude: 128.6014 },
  { code: '2', label: '인천', latitude: 37.4563, longitude: 126.7052 },
  { code: '5', label: '광주', latitude: 35.1595, longitude: 126.8526 },
  { code: '3', label: '대전', latitude: 36.3504, longitude: 127.3845 },
  { code: '7', label: '울산', latitude: 35.5384, longitude: 129.3114 },
  { code: '8', label: '세종', latitude: 36.48, longitude: 127.289 },
  { code: '31', label: '경기', latitude: 37.4138, longitude: 127.5183 },
  { code: '32', label: '강원', latitude: 37.8228, longitude: 128.1555 },
  { code: '33', label: '충북', latitude: 36.6357, longitude: 127.4917 },
  { code: '34', label: '충남', latitude: 36.6588, longitude: 126.6728 },
  { code: '35', label: '경북', latitude: 36.576, longitude: 128.5056 },
  { code: '36', label: '경남', latitude: 35.2381, longitude: 128.6924 },
  { code: '37', label: '전북', latitude: 35.7175, longitude: 127.153 },
  { code: '38', label: '전남', latitude: 34.8161, longitude: 126.463 },
  { code: '39', label: '제주', latitude: 33.4996, longitude: 126.5312 },
];
