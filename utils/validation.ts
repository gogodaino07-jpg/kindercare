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

/**
 * Strips special characters and emojis from the given text.
 * Allows letters (Hangul, English), digits, and whitespace.
 * Optionally allows specific symbols (e.g. '@' for email IDs).
 */
export function stripInvalidCharacters(text: string, allowedChars: string = ''): string {
  // Regex:
  // [^ ... ] -> Not the following
  // a-zA-Z -> English letters
  // 0-9 -> Digits
  // 가-힣 -> Hangul syllables
  // ㄱ-ㅎㅏ-ㅣ -> Hangul jamo (optional, kept for typing convenience)
  // \\s -> Whitespace
  const escapedAllowed = allowedChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\\s${escapedAllowed}]`, 'g');
  return text.replace(regex, '');
}

/**
 * Removes undefined values from an object recursively to make it Firestore-compatible.
 */
export function sanitizeData(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeData);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      if (value !== undefined) {
        newObj[key] = sanitizeData(value);
      }
    });
    return newObj;
  }
  return obj;
}
