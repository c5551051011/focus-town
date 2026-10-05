import AsyncStorage from '@react-native-async-storage/async-storage';
import { AMBIENTS, AmbientId } from './ambient';
import { Character, isValidCharacter } from './character';
import { VOLUME_VALUES, VolumeLevel, prefs } from './prefs';

export type Settings = {
  minutes: number;
  ambient: AmbientId;
  volume: VolumeLevel;
  sfx: boolean;
  haptics: boolean;
  notify: boolean;
  dailyGoal: number; // 하루 목표(분), 0이면 끔
  reminderOn: boolean;
  reminderHour: number;
  reminderMinute: number;
  liveProgress: boolean; // 화면 밖 진행 카드(라이브 액티비티/알림 카드)
  analytics: boolean; // 익명 사용/크래시 데이터 공유
  onboarded: boolean;
  tag: string;
  customTags: string[];
  character: Character | null; // 내 캐릭터 (처음 실행 시 만든다)
};
export const DEFAULT_SETTINGS: Settings = { minutes: 25, ambient: 'off', volume: 'mid', sfx: true, haptics: true, notify: true, dailyGoal: 60, reminderOn: false, reminderHour: 20, reminderMinute: 0, liveProgress: true, analytics: true, onboarded: false, tag: 'STUDY', customTags: [], character: null };
const KEY = 'focus_town_settings_v1';

export function applyPrefs(s: Settings) {
  prefs.sfx = s.sfx;
  prefs.haptics = s.haptics;
  prefs.notify = s.notify;
  prefs.analytics = s.analytics;
  prefs.liveProgress = s.liveProgress;
  prefs.volume = VOLUME_VALUES[s.volume];
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const s = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as Settings;
    // 삭제된 배경음이 저장돼 있으면 OFF로 되돌린다
    if (!AMBIENTS.some((a) => a.id === s.ambient)) s.ambient = 'off';
    if (!isValidCharacter(s.character)) s.character = null;
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
