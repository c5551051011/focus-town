import { supabase } from './supabase';
import { Character } from './character';

// 친구(팔로우). 모든 읽기/쓰기는 서버 RPC로 한다. backend/supabase/migrations/0003_social.sql 참고.
export type Person = Character & {
  id: string;
  friend_code: string;
  i_follow: boolean; // 내가 팔로우함
  follows_me: boolean; // 나를 팔로우함
};

export type Social = { me: Person | null; following: Person[]; followers: Person[] };
export type SocialResult<T> = { ok: true; data: T } | { ok: false; error: string };

const MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: 'Please set up your account first.',
  CANNOT_FOLLOW_SELF: "That's you!",
  USER_NOT_FOUND: 'That player was not found.',
  CODE_NOT_FOUND: 'No player with that friend code.',
};

function friendly(message?: string): string {
  const key = message ? Object.keys(MESSAGES).find((k) => message.includes(k)) : undefined;
  if (key) return MESSAGES[key];
  if (message && /network|fetch|timeout/i.test(message)) return 'Network problem. Check your connection.';
  return 'Something went wrong. Please try again.';
}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<SocialResult<T>> {
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) return { ok: false, error: friendly(error.message) };
    return { ok: true, data: data as T };
  } catch (e) {
    return { ok: false, error: friendly(e instanceof Error ? e.message : undefined) };
  }
}

export const mySocial = () => call<Social>('my_social');
export const searchProfiles = (q: string) => call<Person[]>('search_profiles', { p_query: q });
export const followUser = (id: string) => call<Person>('follow_user', { p_user: id });
export const followByCode = (code: string) => call<Person>('follow_by_code', { p_code: code });
export const unfollowUser = (id: string) => call<null>('unfollow_user', { p_user: id });

// 서로 팔로우하면 "친구". 그룹 초대는 친구에게만 보낼 수 있다.
export const isFriend = (p: Person) => p.i_follow && p.follows_me;

// ── 팔로우 링크 ──
const SITE = 'https://c5551051011.github.io/towny';
export const followLink = (code: string) => `${SITE}/follow.html?code=${code}`;
export const followAppLink = (code: string) => `towny://follow/${code}`;

// 붙여넣은 글에서 친구 코드(8자리)를 뽑는다: 링크 전체, towny://follow/CODE(예전 focustown:// 링크 포함), 코드만 모두 허용
export function parseFollowCode(input: string): string | null {
  const m = input.trim().match(/(?:code=|follow\/|^)([0-9A-Fa-f]{8})\b/);
  return m ? m[1].toUpperCase() : null;
}
