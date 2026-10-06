import { Platform } from 'react-native';
import { prefs } from './prefs';

// 집중하는 동안 고른 앱을 잠그는 기능 (iOS 스크린 타임). Android 는 아직 지원하지 않는다.
// 네이티브 모듈(modules/screen-time)이 없거나 Apple 이 권한을 승인하지 않은 빌드에서는 조용히 "지원 안 함"이 된다.

type Native = {
  authorizationStatus(): 'notDetermined' | 'denied' | 'approved';
  requestAuthorization(): Promise<'notDetermined' | 'denied' | 'approved'>;
  pickApps(): Promise<number>;
  selectedCount(): number;
  block(): boolean;
  unblock(): void;
};

let native: Native | null = null;
try {
  /* eslint-disable @typescript-eslint/no-require-imports */
  if (Platform.OS === 'ios') native = (require('../../modules/screen-time') as { default: Native }).default;
  /* eslint-enable @typescript-eslint/no-require-imports */
} catch {
  // 네이티브 모듈이 없는 환경(Expo Go 등)
}

export type ScreenTimeState = 'unsupported' | 'notDetermined' | 'denied' | 'approved';

// 이 기기/빌드에서 쓸 수 있는 기능인가 (iOS 이고 모듈이 들어 있음)
export const screenTimeAvailable = () => !!native;

export function screenTimeState(): ScreenTimeState {
  if (!native) return 'unsupported';
  try {
    return native.authorizationStatus();
  } catch {
    return 'unsupported';
  }
}

export function blockedAppCount(): number {
  try {
    return native?.selectedCount() ?? 0;
  } catch {
    return 0;
  }
}

export type SetupResult = { ok: boolean; reason?: 'unsupported' | 'denied' | 'unavailable'; count: number };

// 허용을 받고(필요하면) 잠글 앱을 고르게 한다. 온보딩/설정에서 쓴다.
export async function setupScreenTime(): Promise<SetupResult> {
  if (!native) return { ok: false, reason: 'unsupported', count: 0 };
  try {
    let status = native.authorizationStatus();
    if (status !== 'approved') status = await native.requestAuthorization();
    if (status !== 'approved') return { ok: false, reason: 'denied', count: 0 };
  } catch {
    // Apple 이 아직 이 앱에 Family Controls 권한을 승인하지 않은 빌드
    return { ok: false, reason: 'unavailable', count: 0 };
  }
  try {
    return { ok: true, count: await native.pickApps() };
  } catch {
    return { ok: false, reason: 'unavailable', count: 0 };
  }
}

// 잠글 앱을 다시 고른다 (허용이 이미 된 경우)
export async function pickBlockedApps(): Promise<number> {
  try {
    return (await native?.pickApps()) ?? 0;
  } catch {
    return blockedAppCount();
  }
}

// 집중이 시작되면 호출: 설정이 켜져 있고 허용되어 있고 고른 앱이 있을 때만 잠근다
export function blockApps(): void {
  if (!native || !prefs.screenTime) return;
  try {
    if (native.authorizationStatus() === 'approved') native.block();
  } catch {
    // ignore
  }
}

// 집중이 끝나거나 멈추면 호출. 앱을 켤 때도 안전을 위해 한 번 부른다(앱이 꺼진 사이 잠금이 남지 않도록).
export function unblockApps(): void {
  try {
    native?.unblock();
  } catch {
    // ignore
  }
}
