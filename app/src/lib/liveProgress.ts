import { Platform } from 'react-native';
import { prefs } from './prefs';

// 앱을 벗어났을 때 화면 밖에서 진행 상황을 보여준다.
//  - iOS: 잠금 화면 / Dynamic Island 의 "라이브 액티비티" (expo-live-activity)
//  - Android: 알림 영역의 "진행 카드" — 시스템이 카운트다운을 직접 그린다 (modules/focus-ongoing)
// 둘 다 네이티브 코드라서 Expo Go 에서는 동작하지 않는다. 그때는 아무 일도 하지 않는다(앱은 정상 동작).

type IosModule = typeof import('expo-live-activity');
type AndroidModule = { show(title: string, text: string, endAtMs: number, timeoutMs: number): boolean; cancel(): void };

let ios: IosModule | null = null;
let android: AndroidModule | null = null;
try {
  /* eslint-disable @typescript-eslint/no-require-imports */
  if (Platform.OS === 'ios') ios = require('expo-live-activity') as IosModule;
  else if (Platform.OS === 'android') android = (require('../../modules/focus-ongoing') as { default: AndroidModule }).default;
  /* eslint-enable @typescript-eslint/no-require-imports */
} catch {
  // 네이티브 모듈이 없는 환경(Expo Go 등)
}

export type LiveSession = {
  kind: 'solo' | 'group';
  tag: string; // 집중 모드 이름
  buildingId: string; // 스프라이트 이름 (hut, house, ...)
  buildingName: string;
  startedAt: number;
  endAt: number;
};

const COLORS = {
  backgroundColor: '#1e1c2a',
  titleColor: '#ff79c6',
  subtitleColor: '#f8f8f2',
  progressViewTint: '#ff79c6',
  progressViewLabelColor: '#f1fa8c',
};

let session: LiveSession | null = null;
let activityId: string | undefined;

const enabled = () => prefs.liveProgress && (!!ios || !!android);

// 카드에 번갈아 보여줄 응원 문구 (카드를 새로 그릴 때마다 하나를 고른다)
const CHEERS = [
  (b: string) => `Tap tap tap! Your ${b} is growing.`,
  (b: string) => `Your tiny builders are cheering for you!`,
  (b: string) => `You're doing great. Keep going!`,
  (b: string) => `Quiet minds build tall towers. Keep going!`,
];
const TEAM_CHEERS = [
  (b: string) => `Building the ${b} together. Go team!`,
  (b: string) => `Your friends are building with you. Keep it up!`,
];
let cheerIndex = 0;
const cheer = (s: LiveSession) => {
  const list = s.kind === 'group' ? TEAM_CHEERS : CHEERS;
  return list[cheerIndex++ % list.length](s.buildingName);
};

function normalState(s: LiveSession) {
  return {
    title: s.kind === 'group' ? `Towny · Team · ${s.tag}` : `Towny · ${s.tag}`,
    subtitle: cheer(s),
    progressBar: { date: s.endAt },
    imageName: `b_${s.buildingId}`,
    dynamicIslandImageName: `b_${s.buildingId}`,
  };
}

function awayState(s: LiveSession, graceEndAt: number) {
  return s.kind === 'group'
    ? { title: 'Towny · Your team misses you!', subtitle: 'Your friends are still building. Hop back soon!', progressBar: { date: graceEndAt }, imageName: 'b_ruins', dynamicIslandImageName: 'b_ruins' }
    : { title: 'Towny · Psst, come back!', subtitle: 'Your tiny builders miss you! Hurry back!', progressBar: { date: graceEndAt }, imageName: 'b_ruins', dynamicIslandImageName: 'b_ruins' };
}

function render(state: ReturnType<typeof normalState>, endAt: number, timeoutMs: number) {
  try {
    if (ios) {
      if (activityId) ios.updateActivity(activityId, state);
      else activityId = ios.startActivity(state, { ...COLORS, timerType: 'digital', imagePosition: 'right' }) ?? undefined;
    } else if (android) {
      android.show(state.title, state.subtitle, endAt, timeoutMs);
    }
  } catch {}
}

// 세션이 시작되면 호출: 남은 시간 카드를 띄운다
export function startLive(s: LiveSession) {
  session = s;
  activityId = undefined;
  if (!enabled()) return;
  render(normalState(s), s.endAt, Math.max(0, s.endAt - Date.now() + 5000));
}

// 앱을 벗어남: 솔로는 "돌아오세요" 카운트다운(유예 시간), 그룹은 팀 안내를 보여준다
export function showAway(graceEndAt: number) {
  if (!session || !enabled()) return;
  const s = awayState(session, graceEndAt);
  // 솔로: 유예가 끝나면 카드가 사라지도록 시간 제한을 둔다. 그룹: 남은 시간 동안 유지
  const timeout = session.kind === 'solo' ? Math.max(0, graceEndAt - Date.now() + 1000) : Math.max(0, session.endAt - Date.now() + 5000);
  render(s, session.kind === 'solo' ? graceEndAt : session.endAt, timeout);
}

// 종료 시각이 바뀜(통화 패스 등): 카드의 남은 시간도 갱신
export function setLiveEnd(endAt: number) {
  if (!session) return;
  session = { ...session, endAt };
  showBack();
}

// 앱으로 돌아옴: 다시 남은 시간 카드
export function showBack() {
  if (!session || !enabled()) return;
  render(normalState(session), session.endAt, Math.max(0, session.endAt - Date.now() + 5000));
}

// 세션 종료/중단: 카드를 지운다
export function stopLive(result?: 'complete' | 'collapsed' | 'left') {
  try {
    if (ios && activityId) {
      const title = result === 'complete' ? 'Complete!' : result === 'collapsed' ? 'Collapsed' : 'Session ended';
      const subtitle = result === 'complete' ? 'Your building is ready' : 'Open the app to try again';
      ios.stopActivity(activityId, { title, subtitle, progressBar: { progress: result === 'complete' ? 1 : 0 }, imageName: result === 'complete' && session ? `b_${session.buildingId}` : 'b_ruins' });
    } else if (android) {
      android.cancel();
    }
  } catch {}
  activityId = undefined;
  session = null;
}
