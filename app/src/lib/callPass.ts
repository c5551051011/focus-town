import AsyncStorage from '@react-native-async-storage/async-storage';

// 전화 통화처럼 어쩔 수 없이 앱을 벗어난 경우를 위한 "통화 패스" (하루 1회).
// 앱은 통화 상태를 직접 알 수 없어서, 돌아왔을 때 사용자가 직접 사용 여부를 고른다.
// 사용하면 앱을 벗어나 있던 시간만큼 타이머가 멈춘 것으로 처리한다.
const KEY = 'focus_town_call_pass_day_v1';
export const MAX_PASS_AWAY_MINUTES = 30;

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export async function isPassAvailable(awaySeconds: number): Promise<boolean> {
  if (awaySeconds > MAX_PASS_AWAY_MINUTES * 60) return false;
  try {
    return (await AsyncStorage.getItem(KEY)) !== todayKey();
  } catch {
    return false;
  }
}

export async function consumePass(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, todayKey());
  } catch {}
}
