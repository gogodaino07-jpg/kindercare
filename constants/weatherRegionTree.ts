/**
 * 날씨 지역 3단계(시/도 -> 시/군/구 -> 읍/면/동) 피커용 데이터.
 *
 * 전국 3,500여 개 읍/면/동을 전부 담는 건 현실적이지 않아, 서울 25개 구와
 * 경기 주요 시/구는 3단계까지 촘촘하게, 그 외 15개 시/도는 2단계(시/도 ->
 * 주요 동)로 구성했다. 목록에 없는 동네는 화면의 검색창(지오코딩)으로 찾으면 된다.
 *
 * 동 단위 좌표는 실제로 개별 측량한 값이 아니라, 소속 시/군/구 대표 좌표에서
 * 아주 작은(약 1~1.5km) 오프셋을 준 근사값이다. 날씨는 같은 시/군/구 안에서는
 * 사실상 동일하므로(기상청/Open-Meteo 격자 해상도 자체가 그 정도 범위), 정밀
 * 측량이 아니어도 실사용에는 문제가 없다.
 */

export interface WeatherLeaf {
  /** 동/읍/면 이름, 또는 구 단위가 없는 시/도의 대표 동네 이름. */
  name: string;
  latitude: number;
  longitude: number;
}

export interface WeatherDistrict {
  /** 시/군/구 이름, 예: "성남시 분당구". */
  name: string;
  latitude: number;
  longitude: number;
  dongs: WeatherLeaf[];
}

export interface WeatherProvince {
  /** 1단계 칩에 보여줄 짧은 이름, 예: "서울", "경기". */
  name: string;
  latitude: number;
  longitude: number;
  /** 있으면 3단계(시/군/구 -> 동)까지, 없으면 dongs로 2단계만. */
  districts?: WeatherDistrict[];
  /** districts가 없는 시/도에서 바로 보여줄 대표 동네 목록. */
  dongs?: WeatherLeaf[];
}

/** 동 오프셋 패턴(북/남/동/서/북동/북서/남동/남서 순) — 대표 좌표에서 살짝씩 떨어뜨려 서로 다른 지점처럼 보이게 한다. */
const OFFSETS: [number, number][] = [
  [0.012, 0],
  [-0.012, 0],
  [0, 0.014],
  [0, -0.014],
  [0.009, 0.01],
  [0.009, -0.01],
  [-0.009, 0.01],
  [-0.009, -0.01],
];

function dong(name: string, baseLat: number, baseLng: number, index: number): WeatherLeaf {
  const [dLat, dLng] = OFFSETS[index % OFFSETS.length];
  return { name, latitude: Number((baseLat + dLat).toFixed(5)), longitude: Number((baseLng + dLng).toFixed(5)) };
}

function district(name: string, lat: number, lng: number, dongNames: string[]): WeatherDistrict {
  return {
    name,
    latitude: lat,
    longitude: lng,
    dongs: dongNames.map((n, i) => dong(n, lat, lng, i)),
  };
}

export const WEATHER_REGION_TREE: WeatherProvince[] = [
  {
    name: '서울',
    latitude: 37.5665,
    longitude: 126.978,
    districts: [
      district('종로구', 37.5735, 126.979, ['종로1가동', '청운효자동', '이화동']),
      district('중구', 37.5636, 126.9976, ['명동', '을지로동', '신당동']),
      district('용산구', 37.5326, 126.99, ['이촌동', '한남동', '용산동']),
      district('성동구', 37.5634, 127.0367, ['성수동', '왕십리동', '금호동']),
      district('광진구', 37.5385, 127.0823, ['자양동', '구의동', '화양동']),
      district('동대문구', 37.5744, 127.0396, ['전농동', '답십리동', '휘경동']),
      district('중랑구', 37.6063, 127.0925, ['면목동', '상봉동', '신내동']),
      district('성북구', 37.5894, 127.0167, ['성북동', '길음동', '정릉동']),
      district('강북구', 37.6396, 127.0257, ['수유동', '미아동', '번동']),
      district('도봉구', 37.6688, 127.0471, ['방학동', '창동', '쌍문동']),
      district('노원구', 37.6542, 127.0568, ['상계동', '중계동', '월계동']),
      district('은평구', 37.6027, 126.9291, ['불광동', '연신내동', '진관동']),
      district('서대문구', 37.5791, 126.9368, ['신촌동', '홍제동', '연희동']),
      district('마포구', 37.5663, 126.9019, ['서교동', '합정동', '상암동']),
      district('양천구', 37.5169, 126.8664, ['목동', '신정동', '신월동']),
      district('강서구', 37.5509, 126.8495, ['화곡동', '등촌동', '가양동']),
      district('구로구', 37.4954, 126.8874, ['구로동', '신도림동', '개봉동']),
      district('금천구', 37.4519, 126.9022, ['가산동', '독산동', '시흥동']),
      district('영등포구', 37.5264, 126.8963, ['여의도동', '영등포동', '당산동']),
      district('동작구', 37.5124, 126.9393, ['노량진동', '사당동', '흑석동']),
      district('관악구', 37.4784, 126.9516, ['신림동', '봉천동', '남현동']),
      district('서초구', 37.4837, 127.0324, ['서초동', '반포동', '방배동']),
      district('강남구', 37.5172, 127.0473, ['역삼동', '삼성동', '청담동']),
      district('송파구', 37.5145, 127.1059, ['잠실동', '가락동', '문정동']),
      district('강동구', 37.5301, 127.1238, ['천호동', '길동', '명일동']),
    ],
  },
  {
    name: '경기',
    latitude: 37.4138,
    longitude: 127.5183,
    districts: [
      district('성남시 분당구', 37.3826, 127.1189, [
        '정자동', '서현동', '야탑동', '판교동', '백현동', '삼평동', '수내동', '금곡동',
      ]),
      district('성남시 수정구', 37.4507, 127.1477, ['태평동', '신흥동', '단대동']),
      district('성남시 중원구', 37.4368, 127.1373, ['성남동', '중앙동', '금광동']),
      district('수원시 팔달구', 37.2801, 127.0187, ['인계동', '매교동', '지동']),
      district('수원시 영통구', 37.2593, 127.0489, ['영통동', '매탄동', '광교동']),
      district('고양시 일산동구', 37.6584, 126.7747, ['정발산동', '장항동', '식사동']),
      district('고양시 일산서구', 37.6737, 126.7502, ['주엽동', '일산동', '탄현동']),
      district('용인시 수지구', 37.3223, 127.0977, ['풍덕천동', '죽전동', '동천동']),
      district('용인시 기흥구', 37.2749, 127.1157, ['보정동', '구갈동', '동백동']),
      district('안양시 동안구', 37.3925, 126.9569, ['평촌동', '비산동', '관양동']),
      district('부천시', 37.5035, 126.766, ['상동', '중동', '심곡동']),
      district('화성시', 37.1996, 126.8311, ['동탄동', '병점동', '봉담읍']),
      district('남양주시', 37.6360, 127.2165, ['다산동', '별내동', '평내동']),
      district('안산시 단원구', 37.3236, 126.8219, ['고잔동', '원곡동', '초지동']),
      district('시흥시', 37.3800, 126.8031, ['배곧동', '정왕동', '은행동']),
    ],
  },
  {
    name: '인천',
    latitude: 37.4563,
    longitude: 126.7052,
    districts: [
      district('남동구', 37.4468, 126.7315, ['구월동', '만수동']),
      district('연수구', 37.4103, 126.6785, ['송도동', '연수동']),
      district('부평구', 37.5074, 126.7218, ['부평동', '삼산동']),
      district('계양구', 37.5372, 126.7378, ['계산동', '작전동']),
      district('서구', 37.5453, 126.6759, ['청라동', '검단동']),
      district('미추홀구', 37.4634, 126.6503, ['주안동', '용현동']),
    ],
  },
  {
    name: '부산',
    latitude: 35.1796,
    longitude: 129.0756,
    districts: [
      district('해운대구', 35.1631, 129.1635, ['우동', '중동']),
      district('수영구', 35.1454, 129.1131, ['광안동', '남천동']),
      district('부산진구', 35.1626, 129.0533, ['부전동', '전포동']),
      district('동래구', 35.2048, 129.0836, ['온천동', '명륜동']),
      district('사하구', 35.1044, 128.9744, ['하단동', '괴정동']),
      district('사상구', 35.1524, 128.9908, ['괘법동', '덕포동']),
    ],
  },
  {
    name: '대구',
    latitude: 35.8714,
    longitude: 128.6014,
    districts: [
      district('수성구', 35.8583, 128.6311, ['범어동', '수성동']),
      district('중구', 35.8693, 128.6062, ['동인동', '삼덕동']),
      district('달서구', 35.8296, 128.5327, ['월성동', '상인동']),
      district('북구', 35.8858, 128.5828, ['산격동', '침산동']),
    ],
  },
  {
    name: '대전',
    latitude: 36.3504,
    longitude: 127.3845,
    districts: [
      district('서구', 36.3554, 127.3838, ['둔산동', '월평동']),
      district('유성구', 36.3623, 127.3562, ['봉명동', '노은동']),
      district('중구', 36.3253, 127.4212, ['은행동', '대흥동']),
    ],
  },
  {
    name: '광주',
    latitude: 35.1595,
    longitude: 126.8526,
    districts: [
      district('서구', 35.1517, 126.8895, ['치평동', '화정동']),
      district('북구', 35.1741, 126.9124, ['용봉동', '풍향동']),
      district('광산구', 35.1397, 126.7936, ['수완동', '월곡동']),
    ],
  },
  {
    name: '울산',
    latitude: 35.5384,
    longitude: 129.3114,
    districts: [
      district('남구', 35.5437, 129.3300, ['삼산동', '신정동']),
      district('중구', 35.5695, 129.3327, ['성남동', '학성동']),
    ],
  },
  {
    name: '세종',
    latitude: 36.48,
    longitude: 127.289,
    dongs: [
      { name: '도담동', latitude: 36.5044, longitude: 127.2565 },
      { name: '아름동', latitude: 36.5075, longitude: 127.2653 },
      { name: '반곡동', latitude: 36.4823, longitude: 127.2953 },
    ],
  },
  {
    name: '강원',
    latitude: 37.8228,
    longitude: 128.1555,
    dongs: [
      { name: '춘천시 조운동', latitude: 37.8813, longitude: 127.7298 },
      { name: '원주시 단구동', latitude: 37.3422, longitude: 127.9202 },
      { name: '강릉시 홍제동', latitude: 37.7519, longitude: 128.8761 },
    ],
  },
  {
    name: '충북',
    latitude: 36.6357,
    longitude: 127.4917,
    dongs: [
      { name: '청주시 상당구', latitude: 36.6357, longitude: 127.4917 },
      { name: '청주시 흥덕구', latitude: 36.6284, longitude: 127.4406 },
      { name: '충주시 성내동', latitude: 36.9910, longitude: 127.9259 },
    ],
  },
  {
    name: '충남',
    latitude: 36.6588,
    longitude: 126.6728,
    dongs: [
      { name: '천안시 동남구', latitude: 36.8151, longitude: 127.1139 },
      { name: '천안시 서북구', latitude: 36.8225, longitude: 127.1483 },
      { name: '아산시 온천동', latitude: 36.7898, longitude: 127.0018 },
    ],
  },
  {
    name: '경북',
    latitude: 36.576,
    longitude: 128.5056,
    dongs: [
      { name: '포항시 남구', latitude: 36.0019, longitude: 129.3435 },
      { name: '포항시 북구', latitude: 36.0498, longitude: 129.3653 },
      { name: '구미시 원평동', latitude: 36.1195, longitude: 128.3446 },
    ],
  },
  {
    name: '경남',
    latitude: 35.2381,
    longitude: 128.6924,
    dongs: [
      { name: '창원시 성산구', latitude: 35.2280, longitude: 128.6811 },
      { name: '창원시 의창구', latitude: 35.2537, longitude: 128.6414 },
      { name: '김해시 내외동', latitude: 35.2285, longitude: 128.8695 },
    ],
  },
  {
    name: '전북',
    latitude: 35.7175,
    longitude: 127.153,
    dongs: [
      { name: '전주시 완산구', latitude: 35.8161, longitude: 127.1489 },
      { name: '전주시 덕진구', latitude: 35.8393, longitude: 127.1367 },
      { name: '군산시 나운동', latitude: 35.9645, longitude: 126.6832 },
    ],
  },
  {
    name: '전남',
    latitude: 34.8161,
    longitude: 126.463,
    dongs: [
      { name: '목포시 상동', latitude: 34.8161, longitude: 126.4522 },
      { name: '순천시 연향동', latitude: 34.9506, longitude: 127.4872 },
    ],
  },
  {
    name: '제주',
    latitude: 33.4996,
    longitude: 126.5312,
    dongs: [
      { name: '제주시 노형동', latitude: 33.4835, longitude: 126.4818 },
      { name: '제주시 연동', latitude: 33.4890, longitude: 126.4933 },
      { name: '서귀포시 서귀동', latitude: 33.2541, longitude: 126.5601 },
    ],
  },
];
