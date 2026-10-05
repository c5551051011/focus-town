-- Focus Town: 사용자 프로필(이름 + 캐릭터)과 계정 삭제
-- Supabase 대시보드 > SQL Editor 에 붙여 넣어 한 번 실행하세요. (여러 번 실행해도 안전합니다)

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 12),
  species text not null,
  color text not null,
  hat text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 로그인한 사용자는 프로필을 볼 수 있다 (그룹에서 서로의 이름/캐릭터를 보여주기 위해)
drop policy if exists "profiles are viewable by signed-in users" on public.profiles;
create policy "profiles are viewable by signed-in users"
  on public.profiles for select to authenticated using (true);

-- 자기 프로필만 만들고 고칠 수 있다
drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- 계정 삭제 (App Store 필수 요건: 앱 안에서 계정 삭제 가능해야 함)
-- 로그인한 본인의 계정만 지울 수 있고, 프로필은 on delete cascade 로 같이 지워진다.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
