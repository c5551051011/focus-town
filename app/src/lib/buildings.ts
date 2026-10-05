import { SpriteName } from '../components/Pixel';

export type Building = { id: SpriteName; name: string; minMinutes: number };

// 집중 시간이 길수록 더 큰 건물. id는 픽셀 스프라이트 이름과 같다.
export const BUILDINGS: Building[] = [
  { id: 'hut', name: 'Straw Hut', minMinutes: 0 },
  { id: 'house', name: 'Brick House', minMinutes: 20 },
  { id: 'tower', name: 'Arcade Tower', minMinutes: 45 },
  { id: 'library', name: 'Birch Library', minMinutes: 70 },
  { id: 'castle', name: 'Stone Castle', minMinutes: 100 },
];

export function buildingFor(minutes: number): Building {
  let result = BUILDINGS[0];
  for (const b of BUILDINGS) if (minutes >= b.minMinutes) result = b;
  return result;
}

// 휠에서 고를 수 있는 값: 5분 단위, 5~120분. 개발 모드에서는 1분 테스트 값이 맨 앞에 추가된다.
export const TIME_VALUES: number[] = [
  ...(__DEV__ ? [1] : []),
  ...Array.from({ length: 24 }, (_, i) => (i + 1) * 5),
];
