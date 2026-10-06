import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuthSession } from './auth';
import { Invite, myInvites } from './rooms';
import { syncPushToken } from './push';
import { Person, Social, isFriend, mySocial } from './social';

// 로그인 상태(이메일 계정), 친구 목록을 한 곳에서 관리한다.
// 친구/그룹 기능은 로그인한 계정만 쓸 수 있다. 예전 테스트용 게스트(익명) 세션은 로그인 안 한 것으로 본다.
export function useAccount() {
  const session = useAuthSession();
  const user = session && !session.user.is_anonymous ? session.user : null;
  const userId = user?.id ?? null;
  const [socialData, setSocialData] = useState<Social | null>(null);
  const social = userId ? socialData : null; // 로그아웃하면 바로 비운다

  const refreshSocial = useCallback(async () => {
    if (!userId) return;
    const r = await mySocial();
    if (r.ok) setSocialData(r.data);
  }, [userId]);

  // 로그인하면(또는 계정이 바뀌면) 친구 목록을 불러온다
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    mySocial().then((r) => {
      if (alive && r.ok) setSocialData(r.data);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  // 상대가 나를 팔로우해도 보이도록: 앱이 열려 있는 동안 10초마다, 그리고 앱으로 돌아올 때 새로고침한다
  useEffect(() => {
    if (!userId) return;
    syncPushToken(userId);
    const id = setInterval(() => {
      if (AppState.currentState === 'active') refreshSocial();
    }, 10000);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        refreshSocial();
        syncPushToken(userId);
      }
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [userId, refreshSocial]);

  const friends: Person[] = social ? social.following.filter(isFriend) : [];

  return { session, userId, email: user?.email ?? null, social, friends, refreshSocial };
}

// 친구가 보낸 그룹 초대를 주기적으로 확인한다 (앱이 열려 있고 집중 중이 아닐 때만)
export function useInvites(userId: string | null, enabled: boolean) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    if (!userId || !enabled) return;
    let alive = true;
    const load = async () => {
      const r = await myInvites();
      if (alive && r.ok) setInvites(r.data);
    };
    load();
    const id = setInterval(load, 6000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [userId, enabled]);

  const visible = (userId && enabled ? invites : []).filter((i) => !dismissed.includes(i.room_id));
  return { invite: visible[0] ?? null, dismiss: (roomId: string) => setDismissed((d) => [...d, roomId]) };
}
