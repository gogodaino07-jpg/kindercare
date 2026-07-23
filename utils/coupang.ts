import { Linking } from 'react-native';
import { markExternalActionBriefly } from './externalAction';

/** Opens Coupang's mobile search results for the given 준비물 keyword. */
export function openCoupangSearch(keyword: string): void {
  const trimmed = keyword.trim();
  if (!trimmed) return;
  // Leaving to Coupang (browser/app) blips AppState to 'background' — suppress
  // the lock/splash replay that would otherwise fire the moment we return.
  markExternalActionBriefly();
  const url = `https://m.coupang.com/nm/search?q=${encodeURIComponent(trimmed)}`;
  Linking.openURL(url).catch(() => {});
}
