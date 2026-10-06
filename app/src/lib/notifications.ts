import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { prefs } from './prefs';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Android 13+ 에서는 알림 채널이 있어야 권한 팝업이 뜬다
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Towny',
    importance: Notifications.AndroidImportance.HIGH,
  }).catch(() => {});
}

// 알림 권한 요청 (이미 허용이면 그대로 true)
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.status === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// 세션 시작 시: "이탈 경고" 설정이 켜져 있을 때만 권한을 요청한다
export async function requestNotificationPermission(): Promise<boolean> {
  if (!prefs.notify) return false;
  return ensureNotificationPermission();
}

const AWAY_IDS = ['away-warn', 'away-collapse'];
const REMINDER_DAYS = 7;
const reminderId = (i: number) => `reminder-${i}`;

// 이탈하면 알림 2개를 예약한다: 3초 뒤 "돌아오세요", 유예(grace)가 끝나는 시점에 "무너졌어요"
export async function scheduleAwayNotifications(graceSeconds: number, group = false) {
  if (!prefs.notify) return;
  const at = (seconds: number) => ({ type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds }) as const;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: AWAY_IDS[0],
      content: group
        ? { title: 'Your team is counting on you!', body: `Come back within ${graceSeconds - 3} seconds before the building takes damage.` }
        : { title: 'Your building is in danger!', body: `Come back within ${graceSeconds - 3} seconds!` },
      trigger: at(3),
    });
    await Notifications.scheduleNotificationAsync({
      identifier: AWAY_IDS[1],
      content: group
        ? { title: 'The team building is cracking!', body: 'Every second away now hurts your team. Come back!' }
        : { title: 'Your building collapsed...', body: 'You were away too long. Open the app to try again.' },
      trigger: at(graceSeconds),
    });
  } catch {}
}

// 복귀 시 이탈 알림만 취소한다 (하루 시작 알림은 건드리지 않는다)
export async function cancelReturnWarning() {
  try {
    await Promise.all(AWAY_IDS.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  } catch {}
}

// 하루 시작 알림: 앞으로 7일치를 개별 예약하고, 앱을 열 때마다 다시 맞춘다.
// 오늘 이미 집중했으면 오늘 알림은 건너뛰고, 스트릭이 있으면 첫 알림에서 스트릭을 언급한다.
export async function syncReminders(opts: { enabled: boolean; hour: number; minute: number; doneToday: boolean; streak: number }) {
  try {
    await Promise.all(Array.from({ length: REMINDER_DAYS }, (_, i) => Notifications.cancelScheduledNotificationAsync(reminderId(i))));
    if (!opts.enabled) return;
    if (!(await ensureNotificationPermission())) return;

    const now = new Date();
    for (let i = 0; i < REMINDER_DAYS; i++) {
      const when = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, opts.hour, opts.minute, 0);
      if (when.getTime() <= now.getTime()) continue; // 이미 지난 시각
      if (i === 0 && opts.doneToday) continue; // 오늘 이미 집중함
      const first = i === 0 || (i === 1 && opts.doneToday);
      const body =
        first && opts.streak > 0
          ? `Keep your ${opts.streak}-day streak alive! Time to focus.`
          : 'Your town is waiting. Ready to focus?';
      await Notifications.scheduleNotificationAsync({
        identifier: reminderId(i),
        content: { title: 'Towny', body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
      });
    }
  } catch {}
}
