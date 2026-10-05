import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

// 이메일 코드(OTP) 로그인. 이메일로 6자리 코드를 보내고, 입력하면 로그인된다. 비밀번호는 없다.
export async function sendCode(email: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  return error ? error.message : null;
}

export async function verifyCode(email: string, token: string): Promise<string | null> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  return error ? error.message : null;
}

// 계정 삭제: 서버의 delete_my_account() 함수가 본인 계정과 프로필을 지운다
export async function deleteAccount(): Promise<string | null> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) return error.message;
  await supabase.auth.signOut();
  return null;
}

export async function signOut(): Promise<void> {
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
