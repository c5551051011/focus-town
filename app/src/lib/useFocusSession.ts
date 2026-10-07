import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { notify } from './haptics';
import { playSound } from './sounds';
import { cancelReturnWarning, scheduleAwayNotifications } from './notifications';
import { patchActive } from './activeSession';
import { isPassAvailable, consumePass } from './callPass';
import { setLiveEnd, showAway, showBack, stopLive } from './liveProgress';
import { awayExcludingLock, isLockSince, lockInfo } from './lockState';

export const GRACE_SECONDS = 15;

export type Phase = 'running' | 'warning' | 'callPrompt' | 'success' | 'collapsed';
export type EndReason = 'completed' | 'left_app' | 'gave_up' | 'app_closed';

// 남은 시간은 종료 시각 기준으로 계산하므로 백그라운드에서도 정확하다.
// 앱이 background로 가면 이탈. GRACE_SECONDS 안에 돌아오면 정상화, 넘기면 붕괴.
// 단, 하루 1회 "통화 패스"를 쓰면 벗어나 있던 시간만큼 타이머를 멈춘 것으로 처리한다.
export function useFocusSession(minutes: number, initialEndAt: number) {
  const [endAt, setEndAt] = useState(initialEndAt);
  const endAtRef = useRef(initialEndAt);
  const leftAt = useRef<number | null>(null);
  const awayMs = useRef(0);
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, initialEndAt - Date.now()));
  const [phase, setPhase] = useState<Phase>('running');
  const [recovered, setRecovered] = useState(false);
  const [endReason, setEndReason] = useState<EndReason | null>(null);
  const [awaySeconds, setAwaySeconds] = useState(0);
  const phaseRef = useRef<Phase>('running');
  const lockedRef = useRef(false); // 화면 잠금 때문에 백그라운드로 간 상태

  const update = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const isOver = () => phaseRef.current === 'success' || phaseRef.current === 'collapsed';

  const collapse = (reason: EndReason) => {
    update('collapsed');
    setEndReason(reason);
    notify('error');
    playSound('collapse');
    stopLive('collapsed');
  };

  // 1초에 두 번 남은 시간을 갱신하고, 5초마다 "앱이 떠 있음" 표시를 저장한다 (강제 종료 복구용)
  useEffect(() => {
    let ticks = 0;
    const id = setInterval(() => {
      if (isOver() || phaseRef.current === 'callPrompt') return;
      const left = endAtRef.current - Date.now();
      if (left <= 0 && leftAt.current === null) {
        setRemainingMs(0);
        update('success');
        setEndReason('completed');
        notify('success');
        playSound('success');
        stopLive('complete');
      } else {
        setRemainingMs(Math.max(0, left));
        if (leftAt.current === null && ++ticks % 10 === 0) patchActive({ seenAt: Date.now() });
      }
    }, 500);
    return () => clearInterval(id);
  }, [endAt]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (isOver() || phaseRef.current === 'callPrompt') return;
      // iOS: 제어 센터/앱 전환 화면처럼 "곧 떠날 수 있는" 순간에도 붉은 경고를 보여준다 (바로 돌아오면 아무 일 없다)
      if (state === 'inactive') {
        if (leftAt.current === null && phaseRef.current === 'running') update('warning');
        return;
      }
      if (state === 'active' && leftAt.current === null && phaseRef.current === 'warning') {
        update('running');
        return;
      }
      if (state === 'background') {
        if (leftAt.current !== null) return;
        const t = Date.now();
        leftAt.current = t;
        patchActive({ leftAt: t });
        // 화면을 잠근 것(배터리 절약)은 이탈이 아니다. Android 는 백그라운드에서 JS 타이머가 멈추므로 먼저 바로 확인한다.
        let base = t; // 이탈이 (다시) 시작된 시각. 잠금을 풀고 다른 앱으로 가면 풀린 시각부터 다시 센다
        if (isLockSince(base)) {
          lockedRef.current = true;
          patchActive({ leftAt: null, lockedAt: t, seenAt: t });
        } else {
          update('warning');
          scheduleAwayNotifications(GRACE_SECONDS);
          showAway(t + GRACE_SECONDS * 1000);
        }
        // 돌아올 때까지 계속 확인한다. iOS 는 잠금 신호가 몇 초 늦게 올 수 있고, 잠금을 풀자마자 다른 앱을 열 수도 있다.
        const poll = setInterval(() => {
          if (leftAt.current !== base || isOver()) {
            clearInterval(poll);
            return;
          }
          const info = lockInfo();
          if (!info) return;
          if (!lockedRef.current) {
            if (!isLockSince(base)) return;
            // 잠긴 것: 켜 둔 경고를 거둔다
            lockedRef.current = true;
            cancelReturnWarning();
            showBack();
            patchActive({ leftAt: null, lockedAt: base, seenAt: Date.now() });
            update('running');
          } else if (!info.locked && info.unlockedAt > info.lockedAt) {
            // 잠금이 풀렸는데 아직 앱으로 돌아오지 않았다 = 다른 앱을 쓰는 중. 풀린 시각부터 이탈로 센다
            lockedRef.current = false;
            base = info.unlockedAt;
            leftAt.current = base;
            patchActive({ leftAt: base, lockedAt: null });
            update('warning');
            scheduleAwayNotifications(GRACE_SECONDS);
            showAway(base + GRACE_SECONDS * 1000);
          }
        }, 500);
      } else if (state === 'active' && leftAt.current !== null) {
        const away = awayExcludingLock(leftAt.current, Date.now());
        const wasLocked = lockedRef.current;
        lockedRef.current = false;
        leftAt.current = null;
        cancelReturnWarning();
        patchActive({ leftAt: null, lockedAt: null, seenAt: Date.now() });
        if (away / 1000 <= GRACE_SECONDS) {
          update('running');
          showBack();
          // 화면을 잠갔다가 바로 풀고 돌아온 것이면 조용히 이어간다 (경고음/붉은 깜빡임 없음)
          if (!(wasLocked && away <= 3000)) {
            playSound('warn');
            setRecovered(true);
            setTimeout(() => setRecovered(false), 3000);
          }
        } else if (await isPassAvailable(away / 1000)) {
          awayMs.current = away;
          setAwaySeconds(Math.round(away / 1000));
          update('callPrompt');
        } else {
          collapse('left_app');
        }
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 통화 패스 사용: 벗어나 있던 시간만큼 종료 시각을 뒤로 민다
  const acceptPass = async () => {
    await consumePass();
    const next = endAtRef.current + awayMs.current;
    endAtRef.current = next;
    setEndAt(next);
    setRemainingMs(Math.max(0, next - Date.now()));
    patchActive({ endAt: next });
    setLiveEnd(next);
    update('running');
    setRecovered(true);
    setTimeout(() => setRecovered(false), 3000);
  };
  const declinePass = () => collapse('left_app');

  const giveUp = () => {
    update('collapsed');
    setEndReason('gave_up');
    playSound('collapse');
    stopLive('left');
  };

  return { phase, remainingMs, recovered, endReason, awaySeconds, giveUp, acceptPass, declinePass };
}
