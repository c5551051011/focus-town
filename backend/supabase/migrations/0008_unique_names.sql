-- Towny: 닉네임은 중복될 수 없다 (대소문자 구분 없음)
-- Supabase 대시보드 > SQL Editor 에 붙여 넣어 한 번 실행하세요. (여러 번 실행해도 안전합니다. 0001 이 먼저 실행되어 있어야 합니다)
--
--  * 이미 같은 이름이 여럿 있으면, 먼저 만든 한 명만 이름을 그대로 두고 나머지는 이름 뒤에 숫자를 붙여 구분한다.
--  * profiles.name 에 대소문자 무관 유일 인덱스를 건다. 같은 이름을 저장하려 하면 오류(23505)가 난다.
--  * name_taken(이름): 그 이름을 다른 사람이 쓰고 있는지 알려 준다. 가입 전(로그인 전)에도 부를 수 있다.

do $$
declare
  r record;
  v_new text;
  v_try int;
begin
  for r in
    select id, name from (
      select id, name,
             row_number() over (partition by lower(name) order by created_at, id) as rn
        from public.profiles
    ) d
    where d.rn > 1
  loop
    v_try := 0;
    loop
      v_try := v_try + 1;
      v_new := left(r.name, 12 - 2) || lpad((floor(random() * 100))::int::text, 2, '0');
      exit when not exists (select 1 from public.profiles where lower(name) = lower(v_new));
      if v_try > 50 then
        v_new := left(r.name, 12 - 4) || lpad((floor(random() * 10000))::int::text, 4, '0');
        exit;
      end if;
    end loop;
    update public.profiles set name = v_new where id = r.id;
  end loop;
end;
$$;

create unique index if not exists profiles_name_unique on public.profiles (lower(name));

create or replace function public.name_taken(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
     where lower(p.name) = lower(btrim(p_name))
       and p.id is distinct from auth.uid()
  );
$$;

revoke all on function public.name_taken(text) from public;
grant execute on function public.name_taken(text) to anon, authenticated;
