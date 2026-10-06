import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { signInGuest, useAuthSession } from './auth';
import { Character } from './character';
import { saveProfile } from './profile';
import { Invite, myInvites } from './rooms';
import { Person, Social, isFriend, mySocial } from './social';

// 계정 상태(게스트/이메일), 친구 목록, 받은 초대를 한 곳에서 관리한다.
export function useAccount(character: Character | null, ready: boolean) {
  const session = useAuthSession();
  const userId = session?.user.id ?? null;
  const [socialData, setSocialData] = useState<Social | null>(null);
  const social = userId ? socialData : null; // 로그아웃하면 바로 비운다
  const triedGuest = useRef(false);

  const refreshSocial = useCallback(async () => {
    if (!userId) return;
    const r = await mySocial();
    if (r.ok) setSocialData(r.data);
  }, [userId]);

  // 캐릭터를 만들고 나면 조용히 게스트 계정을 만든다 (실패해도 혼자 하기는 그대로 쓸 수 있다)
  useEffect(() => {
    if (!ready || !character || userId || triedGuest.current) return;
    triedGuest.current = true;
    signInGuest().then((r) => {
      if ('userId' in r) saveProfile(r.userId, character).then(refreshSocial);
    });
  }, [ready, character, userId, refreshSocial]);

  // 계정이 생기면(또는 바뀌면) 친구 목록을 불러온다
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
    const id = setInterval(() => {
      if (AppState.currentState === 'active') refreshSocial();
    }, 10000);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') refreshSocial();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [userId, refreshSocial]);

  // 친구/그룹 기능을 쓰는 순간 계정이 없으면 만든다. 성공하면 사용자 id를 돌려준다.
  const ensureAccount = useCallback(async (): Promise<{ userId: string } | { error: string }> => {
    if (userId) return { userId };
    if (!character) return { error: 'Create your character first.' };
    const r = await signInGuest();
    if ('error' in r) return r;
    await saveProfile(r.userId, character);
    return r;
  }, [userId, character]);

  const friends: Person[] = social ? social.following.filter(isFriend) : [];

  return {
    session,
    userId,
    isGuest: session?.user.is_anonymous ?? false,
    email: session?.user.email ?? null,
    social,
    friends,
    refreshSocial,
    ensureAccount,
  };
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
