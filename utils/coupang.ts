import { Linking } from 'react-native';
import { markExternalActionBriefly } from './externalAction';
import { getFunctions } from './firebase';

/** 딥링크 서버 응답이 이보다 늦으면 사용자를 기다리게 하지 않고 일반 검색 URL로 연다. */
const DEEPLINK_TIMEOUT_MS = 3000;

/**
 * Analyzes the 준비물 text and returns a "smart" search keyword for Coupang.
 * For example, "3,000원 미만 포장 선물" -> "유치원 선물"
 */
function getSmartSearchKeyword(text: string): string {
  let keyword = text.trim();

  // 1. Remove common price patterns and conditions that clutter search results
  // Handles: 3,000원, 3000원, 3천원, 미만, 이내, 이하, 이상, 내외
  keyword = keyword.replace(/[0-9,]+(원|만원|천원)?/g, '');
  keyword = keyword.replace(/(미만|이내|이하|이상|내외|정도의|포장|준비)/g, '');

  // 2. Remove parentheses and their contents (e.g. "물통(어깨끈)")
  keyword = keyword.replace(/\(.*\)/g, '');

  // 3. Special handling for Gifts
  if (keyword.includes('선물')) {
    if (keyword.includes('생일')) return '유치원 생일 선물';
    if (keyword.includes('크리스마스')) return '유치원 크리스마스 선물';
    return '유치원 선물';
  }

  // 4. If it's a known kindergarten item, add "유치원" prefix for better targeted results
  const itemsNeedingPrefix = ['물통', '낮잠이불', '식판', '덧신', '실내화', '운동화', '여벌옷'];
  for (const item of itemsNeedingPrefix) {
    if (keyword.includes(item)) return `유치원 ${item}`;
  }

  // 5. Final cleanup: remove double spaces and trim
  return keyword.replace(/\s+/g, ' ').trim() || text;
}

/**
 * 준비물 is often a comma/slash-separated list ("물통, 편한 신발, 여벌 옷") —
 * searching the whole string returns poor results, so pull out just the
 * first item as the primary shopping keyword.
 */
function extractPrimaryKeyword(text: string): string {
  // Split by newline, or comma that is NOT part of a number, or other delimiters
  const [first] = text.split(/\n|,(?!\d)|\/|·/);
  return (first ?? text).trim();
}

/**
 * 검색 URL을 쿠팡 파트너스 트래킹 링크로 변환(서버 프록시, 키워드별 캐싱).
 * 실패하거나 느리면 null — 수수료만 못 받을 뿐 검색 자체는 막지 않는다.
 */
async function fetchPartnerLink(keyword: string): Promise<string | null> {
  try {
    const call = getFunctions().httpsCallable('getCoupangDeeplink')({ keyword });
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), DEEPLINK_TIMEOUT_MS));
    const result = await Promise.race([call, timeout]);
    const url = (result?.data as { url?: unknown } | undefined)?.url;
    return typeof url === 'string' ? url : null;
  } catch (err) {
    console.warn('Coupang deeplink failed, falling back to plain search:', err);
    return null;
  }
}

export interface CoupangProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  /** 이미 파트너스 트래킹이 붙은 링크. */
  url: string;
  isRocket: boolean;
}

function toCoupangKeyword(text: string): string {
  return getSmartSearchKeyword(extractPrimaryKeyword(text));
}

/**
 * 준비물 추천 상품(서버 프록시, 키워드별 24시간 캐싱). 쿠팡 검색 API 한도가 작아서
 * 실패·한도 초과면 빈 배열 — 호출하는 쪽은 카드만 숨기면 된다.
 */
export async function fetchCoupangProducts(text: string): Promise<CoupangProduct[]> {
  const keyword = toCoupangKeyword(text);
  if (!keyword) return [];
  try {
    const result = await getFunctions().httpsCallable('getCoupangProducts')({ keyword });
    const products = (result.data as { products?: unknown } | undefined)?.products;
    return Array.isArray(products) ? (products as CoupangProduct[]) : [];
  } catch (err) {
    console.warn('Coupang products fetch failed:', err);
    return [];
  }
}

export async function openCoupangProduct(url: string): Promise<void> {
  markExternalActionBriefly();
  try {
    await Linking.openURL(url);
  } catch (err) {
    console.error('Coupang Link Error:', err);
  }
}

/** Opens Coupang's mobile search results for the given 준비물 keyword. */
export async function openCoupangSearch(keyword: string): Promise<void> {
  const smartKeyword = toCoupangKeyword(keyword);

  if (!smartKeyword) return;

  const encoded = encodeURIComponent(smartKeyword);
  const webUrl = (await fetchPartnerLink(smartKeyword)) ?? `https://m.coupang.com/nm/search?q=${encoded}`;

  // Leaving to Coupang (browser/app) blips AppState to 'background' — suppress
  // the lock/splash replay that would otherwise fire the moment we return.
  markExternalActionBriefly();

  try {
    await Linking.openURL(webUrl);
  } catch (err) {
    console.error('Coupang Link Error:', err);
  }
}
