import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { notify } from './haptics';
import { playSound } from './sounds';
import { cancelReturnWarning, scheduleAwayNotifications } from './notifications';

export const GRACE_SECONDS = 15;

export type Phase = 'running' | 'warning' | 'success' | 'collapsed';

// 남은 시간은 종료 시각 기준으로 계산하므로 백그라운드에서도 정확하다.
// 앱이 background로 가면 이탈. GRACE_SECONDS 안에 돌아오면 정상화, 넘기면 붕괴.
export function useFocusSession(minutes: number) {
  const [endAt] = useState(() => Date.now() + minutes * 60 * 1000);
  const leftAt = useRef<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(minutes * 60 * 1000);
  const [phase, setPhase] = useState<Phase>('running');
  const [recovered, setRecovered] = useState(false);
  const phaseRef = useRef<Phase>('running');

  const update = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useEffect(() => {
    const id = setInterval(() => {
      if (phaseRef.current === 'success' || phaseRef.current === 'collapsed') return;
      const left = endAt - Date.now();
      if (left <= 0 && leftAt.current === null) {
        setRemainingMs(0);
        update('success');
        notify('success');
        playSound('success');
      } else {
        setRemainingMs(Math.max(0, left));
      }
    }, 500);
    return () => clearInterval(id);
  }, [endAt]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (phaseRef.current === 'success' || phaseRef.current === 'collapsed') return;
      if (state === 'background') {
        leftAt.current = Date.now();
        update('warning');
        scheduleAwayNotifications(GRACE_SECONDS);
      } else if (state === 'active' && leftAt.current !== null) {
        const awaySec = (Date.now() - leftAt.current) / 1000;
        leftAt.current = null;
        cancelReturnWarning();
        if (awaySec > GRACE_SECONDS) {
          update('collapsed');
          notify('error');
          playSound('collapse');
        } else {
          update('running');
          playSound('warn');
          setRecovered(true);
          setTimeout(() => setRecovered(false), 3000);
        }
      }
    });
    return () => sub.remove();
  }, []);

  const giveUp = () => {
    update('collapsed');
    playSound('collapse');
  };

  return { phase, remainingMs, recovered, giveUp };
}
