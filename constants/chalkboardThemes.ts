export interface ChalkboardTheme {
  id: string;
  label: string;
  frame: string;
  board: string;
}

export const CHALKBOARD_THEMES: ChalkboardTheme[] = [
  { id: 'default', label: '기본', frame: '#D4C3B3', board: '#6B8577' },
  { id: 'deepwood', label: '딥우드', frame: '#B08968', board: '#3E5C4E' },
  { id: 'pinkrose', label: '핑크로즈', frame: '#E8C4C9', board: '#7A5C69' },
  { id: 'lemonyellow', label: '레몬옐로우', frame: '#EDDCA8', board: '#435A6E' },
  { id: 'mint', label: '민트', frame: '#C9E0D2', board: '#4A4A4A' },
  { id: 'coral', label: '코랄', frame: '#EFC4AE', board: '#5A473F' },
  { id: 'graydark', label: '그레이 다크모드', frame: '#B5B5B5', board: '#2A2A2A' },
  { id: 'lavender', label: '라벤더', frame: '#DED0EC', board: '#5A4A6E' },
  { id: 'skyblue', label: '스카이블루', frame: '#C7DCEA', board: '#3A4F60' },
  { id: 'peach', label: '피치', frame: '#F0D2BB', board: '#6B4E3C' },
  { id: 'olive', label: '올리브', frame: '#D3CDAE', board: '#474D3C' },
  { id: 'rosegold', label: '로즈골드', frame: '#EAD0C8', board: '#6B3E48' },
];

export const DEFAULT_CHALKBOARD_THEME_ID = 'default';
