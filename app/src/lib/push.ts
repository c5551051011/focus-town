import * as Notifications from 'expo-notifications';
import { setPushToken } from './rooms';

let sent: string | null = null;

// 이 기기의 푸시 토큰을 서버에 올린다 (팀원이 "돌아와요" 알림을 보낼 수 있도록).
// 알림 권한이 없거나, 푸시 설정(Android: FCM)이 안 된 빌드에서는 조용히 넘어간다. 계정이 바뀌면 다시 올린다.
export async function syncPushToken(userId: string) {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.status !== 'granted') return;
    const { data } = await Notifications.getExpoPushTokenAsync();
    const key = `${userId}:${data}`;
    if (!data || key === sent) return;
    const r = await setPushToken(data);
    if (r.ok) sent = key;
  } catch {
    // 푸시를 못 쓰는 환경 (시뮬레이터, FCM 미설정 등)
  }
}

// 로그아웃으로 서버에서 토큰이 지워졌으니, 다음 로그인 때 다시 올리도록 기억을 비운다
export function forgetPushToken() {
  sent = null;
}
