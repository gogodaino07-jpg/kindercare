import { Coords, NearbyPlace, PlaceCategory, PlaceSort } from '../types';

/**
 * 한국관광공사 TourAPI(국문 관광정보서비스) KorService2 연동.
 * 키 발급: https://www.data.go.kr 에서 "한국관광공사_국문 관광정보 서비스_GW" 신청 후
 * 발급받은 "일반 인증키(디코딩)" 값을 .env의 EXPO_PUBLIC_TOUR_API_KEY에 넣어주세요.
 */
const TOUR_API_KEY = process.env.EXPO_PUBLIC_TOUR_API_KEY;
const BASE_URL = 'https://apis.data.go.kr/B551011/KorService2';

type PlaceApiCategory = Exclude<PlaceCategory, 'all'>;

// TourAPI contentTypeId 기준. cat1(대분류)까지 지정한 nature는 관광지 중 자연 항목만 좁혀서 가져옴.
const CATEGORY_CONTENT_TYPE: Record<PlaceApiCategory, string> = {
  nature: '12',
  culture: '14',
  leisure: '28',
};
const CATEGORY_CAT1: Partial<Record<PlaceApiCategory, string>> = {
  nature: 'A01',
};

export const CATEGORY_OPTIONS: { id: PlaceCategory; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'nature', label: '공원·자연' },
  { id: 'culture', label: '체험관·문화시설' },
  { id: 'leisure', label: '테마파크·레포츠' },
];

export const AREA_OPTIONS: { code: string; label: string }[] = [
  { code: '1', label: '서울' },
  { code: '6', label: '부산' },
  { code: '4', label: '대구' },
  { code: '2', label: '인천' },
  { code: '5', label: '광주' },
  { code: '3', label: '대전' },
  { code: '7', label: '울산' },
  { code: '8', label: '세종' },
  { code: '31', label: '경기' },
  { code: '32', label: '강원' },
  { code: '33', label: '충북' },
  { code: '34', label: '충남' },
  { code: '35', label: '경북' },
  { code: '36', label: '경남' },
  { code: '37', label: '전북' },
  { code: '38', label: '전남' },
  { code: '39', label: '제주' },
];

interface RawItem {
  contentid: string;
  title: string;
  addr1?: string;
  firstimage?: string;
  firstimage2?: string;
  mapx: string;
  mapy: string;
  dist?: string;
}

function haversineMeters(a: Coords, b: Coords): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function normalizeItem(item: RawItem, category: PlaceApiCategory, coords?: Coords): NearbyPlace {
  const mapX = parseFloat(item.mapx);
  const mapY = parseFloat(item.mapy);
  const distanceMeters = item.dist
    ? parseFloat(item.dist)
    : coords && !Number.isNaN(mapX) && !Number.isNaN(mapY)
      ? haversineMeters(coords, { latitude: mapY, longitude: mapX })
      : undefined;

  return {
    contentId: item.contentid,
    title: item.title,
    imageUrl: item.firstimage || item.firstimage2 || undefined,
    address: item.addr1 ?? '',
    category,
    distanceMeters,
    mapX,
    mapY,
  };
}

async function fetchCategory(
  category: PlaceApiCategory,
  options: { coords?: Coords; areaCode?: string }
): Promise<RawItem[]> {
  if (!TOUR_API_KEY) {
    throw new Error('TourAPI 키가 설정되지 않았어요. .env의 EXPO_PUBLIC_TOUR_API_KEY를 확인해주세요.');
  }

  const useLocation = !!options.coords;
  // GPS 좌표가 있으면 반경 검색(locationBasedList2), 없으면 지역 선택 검색(areaBasedList2)
  const endpoint = useLocation ? 'locationBasedList2' : 'areaBasedList2';

  const params = new URLSearchParams({
    serviceKey: TOUR_API_KEY,
    MobileOS: 'ETC',
    MobileApp: 'kindercare',
    _type: 'json',
    numOfRows: '30',
    pageNo: '1',
    contentTypeId: CATEGORY_CONTENT_TYPE[category],
  });

  const cat1 = CATEGORY_CAT1[category];
  if (cat1) params.set('cat1', cat1);

  if (useLocation && options.coords) {
    params.set('mapX', String(options.coords.longitude));
    params.set('mapY', String(options.coords.latitude));
    params.set('radius', '20000');
  } else if (options.areaCode) {
    params.set('areaCode', options.areaCode);
  }

  const response = await fetch(`${BASE_URL}/${endpoint}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`나들이 장소 정보를 가져오지 못했어요 (${response.status})`);
  }

  const json = await response.json();
  const items = json?.response?.body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

/** 아이와 가기 좋은 나들이 장소를 최대 30개 조회. 좌표가 있으면 거리순 정렬이 가능. */
export async function fetchNearbyPlaces(options: {
  coords?: Coords;
  areaCode?: string;
  category: PlaceCategory;
  sort: PlaceSort;
}): Promise<NearbyPlace[]> {
  const categories: PlaceApiCategory[] =
    options.category === 'all' ? ['nature', 'culture', 'leisure'] : [options.category];

  const results = await Promise.all(
    categories.map((category) =>
      fetchCategory(category, { coords: options.coords, areaCode: options.areaCode }).then((items) =>
        items.map((item) => normalizeItem(item, category, options.coords))
      )
    )
  );

  const merged = new Map<string, NearbyPlace>();
  for (const list of results) {
    for (const place of list) {
      if (!merged.has(place.contentId)) merged.set(place.contentId, place);
    }
  }

  const places = Array.from(merged.values());

  if (options.sort === 'distance' && options.coords) {
    places.sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
  }

  return places.slice(0, 30);
}
