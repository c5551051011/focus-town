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

// 그룹 건물: 내구성에 따라 한 단계 작아지거나(-1) 오두막이 된다(-2)
export function tieredBuilding(minutes: number, tier: number): Building {
  const base = buildingFor(minutes);
  if (tier >= 0) return base;
  if (tier <= -2) return BUILDINGS[0];
  return BUILDINGS[Math.max(0, BUILDINGS.findIndex((b) => b.id === base.id) - 1)];
}

// 기록된 세션이 마을에 놓을 건물 (그룹에서 정해진 건물이 있으면 그것, 없으면 시간으로)
export function buildingOf(s: { minutes: number; building?: string }): Building {
  return BUILDINGS.find((b) => b.id === s.building) ?? buildingFor(s.minutes);
}

// 휠에서 고를 수 있는 값: 5분 단위, 5~120분. 개발 모드에서는 1분 테스트 값이 맨 앞에 추가된다.
export const TIME_VALUES: number[] = [
  ...(__DEV__ ? [1] : []),
  ...Array.from({ length: 24 }, (_, i) => (i + 1) * 5),
];
