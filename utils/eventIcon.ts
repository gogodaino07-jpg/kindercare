const DEFAULT_EVENT_ICON = '📌';

/** Keyword → emoji lookup for auto-suggesting an icon from an event title. First match wins. */
const KEYWORD_ICON_MAP: Array<{ keywords: string[]; icon: string }> = [
  { keywords: ['생일'], icon: '🎂' },
  { keywords: ['소풍', '현장학습', '견학', '나들이'], icon: '🚌' },
  { keywords: ['운동회', '줄넘기', '체육', '달리기'], icon: '🏃' },
  { keywords: ['수영', '물놀이'], icon: '🏊' },
  { keywords: ['미술', '그리기', '만들기', '색칠'], icon: '🎨' },
  { keywords: ['음악', '노래', '악기', '율동'], icon: '🎵' },
  { keywords: ['독서', '도서', '동화'], icon: '📚' },
  { keywords: ['급식', '간식', '영양', '요리'], icon: '🍎' },
  { keywords: ['예방접종', '검진', '건강', '병원'], icon: '💉' },
  { keywords: ['학예회', '발표회', '공연', '재롱잔치'], icon: '🎭' },
  { keywords: ['입학', '졸업', '수료'], icon: '🎓' },
  { keywords: ['크리스마스', '성탄'], icon: '🎄' },
  { keywords: ['설날', '추석', '명절'], icon: '🎊' },
  { keywords: ['텃밭', '식물', '자연관찰'], icon: '🌱' },
  { keywords: ['사진', '촬영'], icon: '📸' },
  { keywords: ['선물', '기념일'], icon: '🎁' },
];

/** A small curated set the user can pick from directly, covering common kindergarten events. */
export const EVENT_ICON_OPTIONS: string[] = [
  DEFAULT_EVENT_ICON,
  '🎂', '🚌', '🏃', '🏊', '🎨', '🎵', '📚', '🍎',
  '💉', '🎭', '🎓', '🎄', '🎊', '🌱', '📸', '🎁',
];

/** Guesses a topic-appropriate emoji from an event title; falls back to the pushpin default. */
export function suggestEventIcon(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return DEFAULT_EVENT_ICON;

  for (const { keywords, icon } of KEYWORD_ICON_MAP) {
    if (keywords.some((keyword) => trimmed.includes(keyword))) {
      return icon;
    }
  }
  return DEFAULT_EVENT_ICON;
}
