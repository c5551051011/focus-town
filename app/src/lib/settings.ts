import AsyncStorage from '@react-native-async-storage/async-storage';
import { AMBIENTS, AmbientId } from './ambient';
import { VOLUME_VALUES, VolumeLevel, prefs } from './prefs';

export type Settings = {
  minutes: number;
  ambient: AmbientId;
  volume: VolumeLevel;
  sfx: boolean;
  haptics: boolean;
  notify: boolean;
  analytics: boolean; // 익명 사용/크래시 데이터 공유
  onboarded: boolean;
  tag: string;
  customTags: string[];
};
export const DEFAULT_SETTINGS: Settings = { minutes: 25, ambient: 'off', volume: 'mid', sfx: true, haptics: true, notify: true, analytics: true, onboarded: false, tag: 'STUDY', customTags: [] };
const KEY = 'focus_town_settings_v1';

export function applyPrefs(s: Settings) {
  prefs.sfx = s.sfx;
  prefs.haptics = s.haptics;
  prefs.notify = s.notify;
  prefs.analytics = s.analytics;
  prefs.volume = VOLUME_VALUES[s.volume];
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const s = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as Settings;
    // 삭제된 배경음이 저장돼 있으면 OFF로 되돌린다
    if (!AMBIENTS.some((a) => a.id === s.ambient)) s.ambient = 'off';
    return s;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
