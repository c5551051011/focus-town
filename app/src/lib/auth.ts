import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { forgetPushToken } from './push';

// 이메일 코드(OTP) 로그인. 이메일로 6자리 코드를 보내고, 입력하면 로그인된다. 비밀번호는 없다.
export async function sendCode(email: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  return error ? error.message : null;
}

export async function verifyCode(email: string, token: string): Promise<string | null> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  return error ? error.message : null;
}

// 게스트 계정: 이메일 없이 이 기기에서만 쓰는 계정. 친구/그룹은 그대로 쓸 수 있다.
// (Supabase 대시보드에서 Authentication > Sign In / Providers > "Allow anonymous sign-ins" 를 켜야 한다)
export async function signInGuest(): Promise<{ userId: string } | { error: string }> {
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      const msg = error?.message ?? '';
      if (/anonymous/i.test(msg)) return { error: 'Guest accounts are not enabled on the server yet.' };
      if (/network|fetch/i.test(msg)) return { error: 'Network problem. Check your connection.' };
      return { error: 'Could not create your account. Please try again.' };
    }
    return { userId: data.user.id };
  } catch {
    return { error: 'Network problem. Check your connection.' };
  }
}

// 계정 삭제: 서버의 delete_my_account() 함수가 본인 계정과 프로필을 지운다
export async function deleteAccount(): Promise<string | null> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) return error.message;
  await supabase.auth.signOut();
  return null;
}

export async function signOut(): Promise<void> {
  // 이 기기로 더는 팀원 알림이 오지 않도록 푸시 토큰을 지운다 (실패해도 로그아웃은 진행)
  try {
    await supabase.rpc('clear_push_token');
    forgetPushToken();
  } catch {
    // ignore
  }
  await supabase.auth.signOut();
}

// 현재 로그인 세션 (없으면 null)
export function useAuthSession(): Session | null {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}
