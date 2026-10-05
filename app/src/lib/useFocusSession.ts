import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { notify } from './haptics';
import { playSound } from './sounds';
import { cancelReturnWarning, scheduleAwayNotifications } from './notifications';
import { patchActive } from './activeSession';
import { isPassAvailable, consumePass } from './callPass';
import { setLiveEnd, showAway, showBack, stopLive } from './liveProgress';

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
      if (state === 'background') {
        if (leftAt.current !== null) return;
        leftAt.current = Date.now();
        patchActive({ leftAt: leftAt.current });
        update('warning');
        scheduleAwayNotifications(GRACE_SECONDS);
        showAway(Date.now() + GRACE_SECONDS * 1000);
      } else if (state === 'active' && leftAt.current !== null) {
        const away = Date.now() - leftAt.current;
        leftAt.current = null;
        cancelReturnWarning();
        patchActive({ leftAt: null, seenAt: Date.now() });
        if (away / 1000 <= GRACE_SECONDS) {
          update('running');
          showBack();
          playSound('warn');
          setRecovered(true);
          setTimeout(() => setRecovered(false), 3000);
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
