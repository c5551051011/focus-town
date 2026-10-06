import { NativeModule, requireNativeModule } from 'expo';

declare class LockStateModule extends NativeModule<Record<never, never>> {
  /** 화면이 잠겨 있는지(locked), 마지막으로 잠긴 시각, 마지막으로 풀린 시각(밀리초). */
  lockInfo(): { locked: boolean; lockedAt: number; unlockedAt: number };
}

export default requireNativeModule<LockStateModule>('LockState');
