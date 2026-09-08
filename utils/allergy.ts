/** 공백을 무시하고 부분 문자열로 비교 — "새우 튀김"에 "새우"가 있는지, "돼지고기"에 "돼지"가 있는지 등을 잡아내기 위함. */
function normalize(text: string): string {
  return text.replace(/\s/g, '');
}

/** menuItem 문구 안에 아이의 알레르기 키워드가 하나라도 포함되어 있으면 true. */
export function isAllergyMatch(menuItem: string, allergies: string[] | undefined): boolean {
  if (!allergies?.length) return false;
  const normalizedMenu = normalize(menuItem);
  return allergies.some((allergy) => {
    const keyword = normalize(allergy);
    return keyword.length > 0 && normalizedMenu.includes(keyword);
  });
}
