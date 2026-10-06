import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { POSTHOG_HOST, POSTHOG_KEY } from '../config';
import { prefs } from './prefs';

// 가벼운 익명 사용 분석: PostHog의 capture API에 직접 보낸다 (SDK/네이티브 모듈 없음).
// - 계정/이름/이메일 등 개인정보는 보내지 않는다. 기기 안에서 만든 무작위 익명 ID만 쓴다.
// - 직접 만든 모드 이름은 보내지 않는다 ("custom"으로만 보냄).
// - 설정에서 끄거나 키가 없으면 아무것도 보내지 않는다.

const ID_KEY = 'focus_town_anon_id_v1';
let anonId: string | null = null;

function randomId(): string {
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
}

export async function initAnalytics(): Promise<void> {
  try {
    anonId = await AsyncStorage.getItem(ID_KEY);
    if (!anonId) {
      anonId = randomId();
      await AsyncStorage.setItem(ID_KEY, anonId);
    }
  } catch {
    anonId = randomId();
  }
}

export type EventName =
  | 'app_open'
  | 'onboarding_done'
  | 'onboarding_skipped'
  | 'onboarding_consent'
  | 'session_start'
  | 'session_cancel'
  | 'session_complete'
  | 'session_fail'
  | 'goal_reached'
  | 'group_create'
  | 'group_join'
  | 'group_complete'
  | 'group_fail'
  | 'reminder_changed';

export function track(event: EventName, props: Record<string, string | number | boolean> = {}): void {
  if (!prefs.analytics || !POSTHOG_KEY || !anonId) return;
  fetch(`${POSTHOG_HOST}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: POSTHOG_KEY,
      event,
      distinct_id: anonId,
      properties: {
        ...props,
        platform: Platform.OS,
        app_version: Constants.expoConfig?.version ?? 'unknown',
        $lib: 'focus-town-app',
        $process_person_profile: false,
      },
    }),
  }).catch(() => {});
}
