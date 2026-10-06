import { NativeModule, requireNativeModule } from 'expo';

declare class FocusOngoingModule extends NativeModule<Record<never, never>> {
  /** 알림 영역에 카운트다운 카드를 띄우거나 갱신한다. 알림 권한이 없으면 false. */
  show(title: string, text: string, endAtMs: number, timeoutMs: number): boolean;
  cancel(): void;
  /** 화면이 꺼져 있는지(locked), 마지막으로 꺼진 시각, 마지막으로 잠금을 푼 시각(밀리초). */
  lockInfo(): { locked: boolean; lockedAt: number; unlockedAt: number };
}

export default requireNativeModule<FocusOngoingModule>('FocusOngoing');
