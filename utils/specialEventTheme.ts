export interface SpecialEventTheme {
  emoji: string;
  label: string;
  message: string;
  gradient: [string, string];
}

/** 제목에 포함된 키워드로 "방학"/"소풍" 같은 아주 특별한 일정을 감지해 전용 테마를 돌려준다. */
export function getSpecialEventTheme(title: string): SpecialEventTheme | null {
  if (title.includes('방학')) {
    return {
      emoji: '🏖️',
      label: '방학',
      message: '신나는 방학이 시작돼요!',
      gradient: ['#0EA5E9', '#38BDF8'],
    };
  }
  if (title.includes('소풍') || title.includes('현장학습') || title.includes('수학여행')) {
    return {
      emoji: '🚌',
      label: '나들이',
      message: '즐거운 나들이날이에요!',
      gradient: ['#22C55E', '#84CC16'],
    };
  }
  return null;
}
