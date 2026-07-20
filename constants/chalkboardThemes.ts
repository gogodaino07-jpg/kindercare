export interface ChalkboardTheme {
  id: string;
  label: string;
  frame: string;
  board: string;
}

export const CHALKBOARD_THEMES: ChalkboardTheme[] = [
  { id: 'default', label: '기본', frame: '#C9A87C', board: '#5C7A6E' },
  { id: 'deepwood', label: '딥우드', frame: '#8A5A2B', board: '#2C4A3E' },
  { id: 'pinkrose', label: '핑크로즈', frame: '#E8B4BC', board: '#6B4C5C' },
  { id: 'lemonyellow', label: '레몬옐로우', frame: '#F0D080', board: '#33485C' },
  { id: 'mint', label: '민트', frame: '#B8D8C8', board: '#3A3A3A' },
  { id: 'coral', label: '코랄', frame: '#F0B090', board: '#4A3B35' },
  { id: 'graydark', label: '그레이 다크모드', frame: '#9C9C9C', board: '#1E1E1E' },
  { id: 'lavender', label: '라벤더', frame: '#D9C9EC', board: '#4A3B5C' },
  { id: 'skyblue', label: '스카이블루', frame: '#B8D4E8', board: '#2A3F52' },
  { id: 'peach', label: '피치', frame: '#F5C9A8', board: '#5C4030' },
  { id: 'olive', label: '올리브', frame: '#C9C29A', board: '#3A3F2E' },
  { id: 'rosegold', label: '로즈골드', frame: '#E8C4B8', board: '#5C2E3A' },
];

export const DEFAULT_CHALKBOARD_THEME_ID = 'default';
