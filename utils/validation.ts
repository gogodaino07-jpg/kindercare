/**
 * Guards the "Coupang에서 바로 구매" button from showing for a 준비물 value
 * that has no real content — standalone Hangul jamo (ㅁㄴㅇㄹ, ㅏㅑ...) or
 * punctuation/symbols only aren't meaningful shopping search terms.
 * Also filters out pure numbers, prices, or very short keywords.
 */
export function isValidCoupangKeyword(text: string | undefined | null): boolean {
  if (!text) return false;
  const trimmed = text.trim();

  // 1. Must be at least 2 characters (excluding single numbers like "3")
  if (trimmed.length < 2) return false;

  // 2. Must contain at least one Korean syllable or English letter
  if (!/[a-zA-Z가-힣]/.test(trimmed)) return false;

  // 3. Filter out pure prices (e.g., "3,000원", "5000원", "1만원")
  const isPurePrice = /^[0-9,]+(원|만원|천원)?$/.test(trimmed);
  if (isPurePrice) return false;

  // 4. Filter out pure numbers with punctuation
  const isPureNumber = /^[0-9., ]+$/.test(trimmed);
  if (isPureNumber) return false;

  // 5. Filter out non-purchase items common in kindergarten
  const blacklistedKeywords = ['제출', '통장', '교재', '안내문', '봉투', '원복', '활동복', '가방', '성적표', '카드'];
  if (blacklistedKeywords.some(k => trimmed.includes(k))) return false;

  return true;
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
