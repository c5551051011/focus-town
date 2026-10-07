import { Platform } from 'react-native';

// 화면 잠금(배터리를 아끼려고 화면을 꺼 두는 것)은 앱을 떠난 것이 아니다.
// 앱이 백그라운드로 갔을 때 그 이유가 "화면 잠금"인지 "다른 앱으로 이동"인지를 구분한다.
// 네이티브 모듈이 없으면(Expo Go 등) 항상 "잠금 아님"으로 보고 예전처럼 동작한다.

export type LockInfo = { locked: boolean; lockedAt: number; unlockedAt: number };

let read: (() => LockInfo) | null = null;
try {
  /* eslint-disable @typescript-eslint/no-require-imports */
  if (Platform.OS === 'android') {
    const m = (require('../../modules/focus-ongoing') as { default: { lockInfo(): LockInfo } }).default;
    read = () => m.lockInfo();
  } else if (Platform.OS === 'ios') {
    const m = (require('../../modules/lock-state') as { default: { lockInfo(): LockInfo } }).default;
    read = () => m.lockInfo();
  }
  /* eslint-enable @typescript-eslint/no-require-imports */
} catch {
  // 네이티브 모듈 없음
}

export function lockInfo(): LockInfo | null {
  try {
    return read ? read() : null;
  } catch {
    return null;
  }
}

// 백그라운드로 간 신호와 잠금 신호는 서로 조금 늦거나 빠를 수 있어서, 이 시간 안에 겹치면 같은 일로 본다
const SAME_EVENT_MS = 2500;
// iOS 는 화면을 잠근 뒤 몇 초 늦게 "잠김" 신호를 주기도 한다. 떠난 뒤 이 시간 안에 잠겼다면 화면 잠금으로 본다
const LOCK_LATE_MS = 30000;

// 이 시각(leftAt)에 시작된 이탈이 화면 잠금 때문인지
export function isLockSince(leftAt: number): boolean {
  const info = lockInfo();
  return !!info && info.locked && info.lockedAt >= leftAt - SAME_EVENT_MS && info.lockedAt <= leftAt + LOCK_LATE_MS;
}
// 앱이 백그라운드로 간 뒤 잠금 여부를 확인하기까지 기다리는 시간
export const LOCK_CHECK_MS = 900;

export const isLockedNow = (): boolean => lockInfo()?.locked === true;

// 앱을 떠나 있던 시간(밀리초). 화면 잠금으로 시작된 경우, 잠겨 있던 시간은 빼고 "잠금을 푼 뒤 돌아오기까지"만 센다.
export function awayExcludingLock(leftAt: number, now: number): number {
  const info = lockInfo();
  if (info && info.lockedAt > 0 && info.lockedAt >= leftAt - SAME_EVENT_MS && info.lockedAt <= leftAt + LOCK_LATE_MS) {
    // 아직 "잠김"으로 남아 있어도 앱이 다시 열렸다면 이미 풀린 것이다
    const since = info.unlockedAt >= info.lockedAt ? info.unlockedAt : now;
    return Math.max(0, now - Math.max(since, leftAt));
  }
  return Math.max(0, now - leftAt);
}
