/**
 * Guards the "Coupang에서 바로 구매" button from showing for a 준비물 value
 * that has no real content — standalone Hangul jamo (ㅁㄴㅇㄹ, ㅏㅑ...) or
 * punctuation/symbols only aren't meaningful shopping search terms.
 * Requires at least one Latin letter, digit, or complete Hangul syllable.
 */
export function isValidCoupangKeyword(text: string | undefined | null): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  return /[a-zA-Z0-9가-힣]/.test(trimmed);
}
