import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { cancelReturnWarning, scheduleAwayNotifications } from './notifications';
import { showAway, showBack } from './liveProgress';
import { DAMAGE_START_SEC, DROP_DAMAGE_SEC, RoomResult, RoomState, clockOffset, finishRoom, getRoomState, heartbeat, msUntilEnd, setLocked } from './rooms';
import { LOCK_CHECK_MS, awayExcludingLock, isLockSince, lockInfo } from './lockState';

// 그룹 방 상태를 서버와 맞추는 훅.
//  - 대기실에서는 2초, 집중 중에는 4초마다 서버와 통신한다 (집중 중 통신은 "앱이 떠 있음" 신호도 겸한다)
//  - 앱을 벗어났다 돌아오면 15초를 넘긴 만큼을 내 "초과 이탈"로 정산해 서버에 올린다
//  - 시간이 끝나면 finish_room 을 호출해 결과를 확정한다
export function useGroupSession(roomId: string, initial: RoomState, myId: string) {
  const [state, setState] = useState<RoomState>(initial);
  const stateRef = useRef(initial);
  const offset = useRef(clockOffset(initial));
  const [offsetMs, setOffsetMs] = useState(() => clockOffset(initial));
  const damage = useRef(initial.members.find((m) => m.user_id === myId)?.damage_s ?? 0);
  const leftAt = useRef<number | null>(null);
  const finishing = useRef(false);
  const [away, setAway] = useState(false); // 지금 내가 앱을 벗어나 있음
  const [remainingMs, setRemainingMs] = useState(() => msUntilEnd(initial, clockOffset(initial)));

  const apply = useCallback((r: RoomResult) => {
    if (!r.ok) return false;
    stateRef.current = r.data;
    offset.current = clockOffset(r.data);
    setOffsetMs(offset.current);
    setState(r.data);
    return true;
  }, []);

  const me = () => stateRef.current.members.find((m) => m.user_id === myId);

  const sync = useCallback(async () => {
    const s = stateRef.current;
    const mine = s.members.find((m) => m.user_id === myId);
    if (s.room.status === 'running' && mine?.status === 'active') apply(await heartbeat(roomId, damage.current));
    else apply(await getRoomState(roomId));
  }, [apply, myId, roomId]);

  // 주기적 동기화
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      if (!alive) return;
      if (AppState.currentState === 'active' && leftAt.current === null) await sync();
      const status = stateRef.current.room.status;
      if (!alive || status === 'done' || status === 'collapsed' || status === 'closed') return;
      timer = setTimeout(loop, status === 'lobby' ? 2000 : 2500);
    };
    timer = setTimeout(loop, 1500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [sync]);

  // 남은 시간 갱신 + 끝나면 결과 확정
  useEffect(() => {
    const id = setInterval(async () => {
      const s = stateRef.current;
      if (s.room.status !== 'running') return;
      const left = msUntilEnd(s, offset.current);
      setRemainingMs(Math.max(0, left));
      if (left <= 0 && !finishing.current) {
        finishing.current = true;
        const r = await finishRoom(roomId);
        if (!apply(r)) finishing.current = false; // 실패하면 다시 시도
      }
    }, 500);
    return () => clearInterval(id);
  }, [apply, roomId]);

  // 앱을 벗어났다 돌아오면 15초를 넘긴 만큼 정산
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      const s = stateRef.current;
      const active = s.room.status === 'running' && me()?.status === 'active';
      if (!active) return;
      if (st === 'background' && leftAt.current === null) {
        const t = Date.now();
        leftAt.current = t;
        // 화면을 잠근 것(배터리 절약)은 이탈이 아니다. Android 는 백그라운드에서 JS 타이머가 멈추므로 먼저 바로 확인한다.
        let base = t; // 이탈이 (다시) 시작된 시각. 잠금을 풀고 다른 앱으로 가면 풀린 시각부터 다시 센다
        let lockedNow = false;
        if (isLockSince(base)) {
          lockedNow = true;
          setLocked(roomId, true); // 서버에도 알려서 팀원 화면에 "자리 비움"으로 보이지 않게 한다
        } else {
          // 잠근 것인지 잠깐 확인한 뒤에 경고와 카운트다운을 켠다 (잠근 직후에 카운트다운이 번쩍 보이지 않도록)
          setTimeout(() => {
            if (leftAt.current !== base || lockedNow) return;
            setAway(true);
            scheduleAwayNotifications(DAMAGE_START_SEC - 2, true);
            showAway(t + DAMAGE_START_SEC * 1000);
          }, LOCK_CHECK_MS);
        }
        // 돌아올 때까지 계속 확인한다. iOS 는 잠금 신호가 몇 초 늦게 올 수 있고, 잠금을 풀자마자 다른 앱을 열 수도 있다.
        const poll = setInterval(() => {
          if (leftAt.current !== base) {
            clearInterval(poll);
            return;
          }
          const info = lockInfo();
          if (!info) return;
          if (!lockedNow) {
            if (!isLockSince(base)) return;
            lockedNow = true;
            setAway(false);
            cancelReturnWarning();
            showBack();
            setLocked(roomId, true);
          } else if (!info.locked && info.unlockedAt > info.lockedAt) {
            // 잠금이 풀렸는데 아직 앱으로 돌아오지 않았다 = 다른 앱을 쓰는 중. 풀린 시각부터 이탈로 센다
            lockedNow = false;
            base = info.unlockedAt;
            leftAt.current = base;
            setLocked(roomId, false);
            setAway(true);
            scheduleAwayNotifications(DAMAGE_START_SEC, true);
            showAway(base + DAMAGE_START_SEC * 1000);
          }
        }, 500);
      } else if (st === 'active' && leftAt.current !== null) {
        const sec = awayExcludingLock(leftAt.current, Date.now()) / 1000;
        leftAt.current = null;
        setAway(false);
        cancelReturnWarning();
        showBack();
        damage.current = Math.min(DROP_DAMAGE_SEC, damage.current + Math.max(0, Math.floor(sec - DAMAGE_START_SEC)));
        sync(); // 하트비트가 서버의 잠금 표시도 풀어 준다
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync]);

  return { state, apply, remainingMs, away, offset: offsetMs, sync };
}
