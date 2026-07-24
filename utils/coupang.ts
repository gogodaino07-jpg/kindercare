import { Linking } from 'react-native';
import { markExternalActionBriefly } from './externalAction';

/**
 * 준비물 is often a comma/slash-separated list ("물통, 편한 신발, 여벌 옷") —
 * searching the whole string returns poor results, so pull out just the
 * first item as the primary shopping keyword.
 */
function extractPrimaryKeyword(text: string): string {
  const [first] = text.split(/[,\/·]/);
  return (first ?? text).trim();
}

/** Opens Coupang's mobile search results for the given 준비물 keyword. */
export function openCoupangSearch(keyword: string): void {
  const trimmed = extractPrimaryKeyword(keyword);
  if (!trimmed) return;
  // Leaving to Coupang (browser/app) blips AppState to 'background' — suppress
  // the lock/splash replay that would otherwise fire the moment we return.
  markExternalActionBriefly();
  const url = `https://m.coupang.com/nm/search?q=${encodeURIComponent(trimmed)}`;
  Linking.openURL(url).catch(() => {});
}
