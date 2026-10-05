import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { cancelReturnWarning, scheduleAwayNotifications } from './notifications';
import { showAway, showBack } from './liveProgress';
import { DAMAGE_START_SEC, DROP_DAMAGE_SEC, RoomResult, RoomState, clockOffset, finishRoom, getRoomState, heartbeat, msUntilEnd } from './rooms';

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
      timer = setTimeout(loop, status === 'lobby' ? 2000 : 4000);
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
        leftAt.current = Date.now();
        setAway(true);
        scheduleAwayNotifications(DAMAGE_START_SEC, true);
        showAway(Date.now() + DAMAGE_START_SEC * 1000);
      } else if (st === 'active' && leftAt.current !== null) {
        const sec = (Date.now() - leftAt.current) / 1000;
        leftAt.current = null;
        setAway(false);
        cancelReturnWarning();
        showBack();
        damage.current = Math.min(DROP_DAMAGE_SEC, damage.current + Math.max(0, Math.floor(sec - DAMAGE_START_SEC)));
        sync();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync]);

  return { state, apply, remainingMs, away, offset: offsetMs, sync };
}
