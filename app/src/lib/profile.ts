import { supabase } from './supabase';
import { Character, isValidCharacter } from './character';

// 로그인한 사용자의 프로필(이름 + 캐릭터)을 서버와 주고받는다. 실패해도 앱은 계속 동작한다(기기에 저장돼 있음).
export async function saveProfile(userId: string, c: Character): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, name: c.name, species: c.species, color: c.color, hat: c.hat, updated_at: new Date().toISOString() });
    return !error;
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
