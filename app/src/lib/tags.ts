import { colors } from '../theme';

// 집중 모드(태그). 기본 4개 + 사용자가 추가한 태그
export const PRESET_TAGS = ['STUDY', 'READING', 'WORK', 'EXERCISE', 'REST', 'SLEEP'];
export const MAX_CUSTOM_TAGS = 8;
export const MAX_TAG_LENGTH = 12;

const PRESET_COLORS: Record<string, string> = {
  STUDY: '#8be9fd',
  READING: '#ff9de2',
  WORK: '#bd93f9',
  EXERCISE: '#ffb86c',
  REST: '#7ee787',
  SLEEP: '#9aa8ff',
};
// 직접 만든 태그는 이름으로 색을 정해서, 삭제/추가해도 색이 바뀌지 않는다
const CUSTOM_COLORS = ['#f1fa8c', '#6be0c9', '#ff9d9d', '#e6a8ff', '#c9d6ff', '#b0f0a0'];

export function tagColor(tag: string | undefined): string {
  if (!tag) return colors.dim;
  if (PRESET_COLORS[tag]) return PRESET_COLORS[tag];
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return CUSTOM_COLORS[h % CUSTOM_COLORS.length];
}

export function cleanTag(raw: string): string {
  return raw.replace(/[^A-Za-z0-9가-힣 ]/g, '').trim().toUpperCase().slice(0, MAX_TAG_LENGTH);
}
