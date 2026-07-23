import { Linking } from 'react-native';

/** Opens Coupang's mobile search results for the given 준비물 keyword. */
export function openCoupangSearch(keyword: string): void {
  const trimmed = keyword.trim();
  if (!trimmed) return;
  const url = `https://m.coupang.com/nm/search?q=${encodeURIComponent(trimmed)}`;
  Linking.openURL(url).catch(() => {});
}
