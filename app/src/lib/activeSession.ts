import AsyncStorage from '@react-native-async-storage/async-storage';
import { AmbientId } from './ambient';

// 진행 중인 세션을 저장해 두었다가, 앱이 강제 종료됐을 때 이어하기/정리를 할 수 있게 한다.
export type ActiveRecord = {
  minutes: number;
  startedAt: number;
  endAt: number;
  ambient: AmbientId;
  tag: string;
  leftAt: number | null; // 앱이 백그라운드로 간 시각 (돌아오면 null)
  seenAt: number; // 앱이 화면에 떠 있는 동안 5초마다 갱신
};

const KEY = 'focus_town_active_v1';

export async function loadActive(): Promise<ActiveRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActiveRecord) : null;
  } catch {
    return null;
  }
}

export async function saveActive(rec: ActiveRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(rec));
  } catch {}
}

export async function patchActive(patch: Partial<ActiveRecord>): Promise<void> {
  const cur = await loadActive();
  if (cur) await saveActive({ ...cur, ...patch });
}

export async function clearActive(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
