import { supabase } from './supabase';
import { Character, MAX_NAME_LENGTH, isValidCharacter } from './character';

// 로그인한 사용자의 프로필(이름 + 캐릭터)을 서버와 주고받는다. 실패해도 앱은 계속 동작한다(기기에 저장돼 있음).
export type SaveResult = { ok: boolean; name: string; renamed: boolean };

// 닉네임은 중복될 수 없다. 서버에서 같은 이름이 이미 있으면 뒤에 숫자를 붙여 다시 시도하고, 실제로 저장된 이름을 돌려준다.
export async function saveProfile(userId: string, c: Character): Promise<SaveResult> {
  let name = c.name;
  try {
    for (let attempt = 0; attempt < 6; attempt++) {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, name, species: c.species, color: c.color, hat: c.hat, updated_at: new Date().toISOString() });
      if (!error) return { ok: true, name, renamed: name !== c.name };
      if (error.code !== '23505') return { ok: false, name: c.name, renamed: false };
      name = c.name.slice(0, MAX_NAME_LENGTH - 2) + String(Math.floor(Math.random() * 90) + 10);
    }
  } catch {
    // 아래에서 실패로 돌려준다
  }
  return { ok: false, name: c.name, renamed: false };
}

// 다른 사람이 이미 쓰는 이름인지 (인터넷이 안 되면 확인하지 못하므로 false: 서버가 나중에 막는다)
export async function isNameTaken(name: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('name_taken', { p_name: name });
    return !error && data === true;
  } catch {
    return false;
  }
}

export async function fetchProfile(userId: string): Promise<Character | null> {
  try {
    const { data, error } = await supabase.from('profiles').select('name, species, color, hat').eq('id', userId).maybeSingle();
    if (error || !data) return null;
    return isValidCharacter(data) ? (data as Character) : null;
  } catch {
    return null;
  }
}
