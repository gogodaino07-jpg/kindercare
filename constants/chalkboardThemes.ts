export interface ChalkboardTheme {
  id: string;
  label: string;
  frame: string;
  board: string;
  /** Text color for date/title/note on this board — pastel light boards need dark text. */
  text: string;
}

export const CHALKBOARD_THEMES: ChalkboardTheme[] = [
  { id: 'aqua', label: '아쿠아 화이트', frame: '#CFE8ED', board: '#EAF5F9', text: '#1E293B' },
  { id: 'pink', label: '핑크', frame: '#F4D8DE', board: '#FDEEF1', text: '#1E293B' },
  { id: 'lemon', label: '레몬', frame: '#F5E9BE', board: '#FBF6DE', text: '#1E293B' },
  { id: 'mint', label: '민트', frame: '#C9E9DC', board: '#E6F7F0', text: '#1E293B' },
  { id: 'lavender', label: '라벤더', frame: '#DED0EC', board: '#F1E9FA', text: '#1E293B' },
  { id: 'peach', label: '피치', frame: '#F5D9C3', board: '#FCEEE2', text: '#1E293B' },
];

export const DEFAULT_CHALKBOARD_THEME_ID = 'aqua';
