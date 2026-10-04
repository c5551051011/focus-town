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

export async function requestNotificationPermission(): Promise<boolean> {
  if (!prefs.notify) return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// 이탈하면 알림 2개를 예약한다: 3초 뒤 "돌아오세요", 유예(grace)가 끝나는 시점에 "무너졌어요"
export async function scheduleAwayNotifications(graceSeconds: number) {
  if (!prefs.notify) return;
  const at = (seconds: number) => ({ type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds }) as const;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Your building is in danger!', body: `Come back within ${graceSeconds - 3} seconds!` },
      trigger: at(3),
    });
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Your building collapsed...', body: 'You were away too long. Open the app to try again.' },
      trigger: at(graceSeconds),
    });
  } catch {}
}

export async function cancelReturnWarning() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}
