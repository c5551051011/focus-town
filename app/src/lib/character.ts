import { COLOR_IDS, HAT_IDS, SPECIES } from './characterAssets';

export type Character = {
  name: string;
  species: (typeof SPECIES)[number];
  color: (typeof COLOR_IDS)[number];
  hat: (typeof HAT_IDS)[number];
};

export const MAX_NAME_LENGTH = 10;

export const DEFAULT_CHARACTER: Character = { name: '', species: 'bear', color: 'brown', hat: 'hardhat' };

export function cleanName(raw: string): string {
  return raw.replace(/[^A-Za-z0-9가-힣 _-]/g, '').slice(0, MAX_NAME_LENGTH);
}

export function isValidCharacter(c: unknown): c is Character {
  const x = c as Character | null;
  return (
    !!x &&
    typeof x.name === 'string' &&
    x.name.trim().length > 0 &&
    (SPECIES as readonly string[]).includes(x.species) &&
    (COLOR_IDS as readonly string[]).includes(x.color) &&
    (HAT_IDS as readonly string[]).includes(x.hat)
  );
}

// 추천 닉네임: 형용사 + 명사 + 숫자 두 자리 (최대 10자). 예: CozyFox42
const ADJECTIVES = ['Cozy', 'Calm', 'Neat', 'Bold', 'Busy', 'Kind', 'Warm', 'Wise', 'Snug', 'Tiny', 'Swift', 'Brave', 'Happy', 'Lucky', 'Sunny', 'Quiet'];
const NOUNS = ['Fox', 'Bear', 'Owl', 'Cat', 'Pup', 'Hen', 'Cub', 'Moss', 'Pine', 'Brick', 'Hut', 'Bee', 'Seal', 'Duck', 'Mole', 'Deer'];

export function suggestName(): string {
  const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
  for (let i = 0; i < 20; i++) {
    const base = pick(ADJECTIVES) + pick(NOUNS);
    if (base.length <= MAX_NAME_LENGTH - 2) return base + String(Math.floor(Math.random() * 90) + 10);
  }
  return pick(ADJECTIVES) + pick(['Fox', 'Cat', 'Owl']) + String(Math.floor(Math.random() * 90) + 10);
}
