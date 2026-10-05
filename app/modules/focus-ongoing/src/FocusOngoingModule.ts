import { NativeModule, requireNativeModule } from 'expo';

declare class FocusOngoingModule extends NativeModule<Record<never, never>> {
  /** 알림 영역에 카운트다운 카드를 띄우거나 갱신한다. 알림 권한이 없으면 false. */
  show(title: string, text: string, endAtMs: number, timeoutMs: number): boolean;
  cancel(): void;
}

export default requireNativeModule<FocusOngoingModule>('FocusOngoing');
