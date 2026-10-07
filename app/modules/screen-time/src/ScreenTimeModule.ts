import { NativeModule, requireNativeModule } from 'expo';

export type ScreenTimeAuthStatus = 'notDetermined' | 'denied' | 'approved';

declare class ScreenTimeModule extends NativeModule<Record<never, never>> {
  authorizationStatus(): ScreenTimeAuthStatus;
  /** 시스템 허용 창을 띄운다. Apple 이 Family Controls 를 승인하지 않은 빌드에서는 오류. */
  requestAuthorization(): Promise<ScreenTimeAuthStatus>;
  /** 앱 선택 화면을 열고, 닫히면 고른(허용할) 항목 수를 돌려준다. */
  pickApps(): Promise<number>;
  selectedCount(): number;
  /** 허용한 앱과 Towny·전화를 뺀 나머지를 모두 잠근다. Towny 토큰을 못 만들면 false. */
  block(): boolean;
  unblock(): void;
}

export default requireNativeModule<ScreenTimeModule>('ScreenTime');
