import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from './types';

const KEY = 'focus_town_sessions_v1';

export async function loadSessions(): Promise<Session[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session[]) : [];
  } catch {
    return [];
  }
}

export async function saveSessions(sessions: Session[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(sessions));
  } catch {}
}
