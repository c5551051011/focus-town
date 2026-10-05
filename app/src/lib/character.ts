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
