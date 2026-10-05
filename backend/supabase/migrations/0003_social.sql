-- Focus Town: 친구(팔로우)와 친구 초대로 그룹 만들기
-- Supabase 대시보드 > SQL Editor 에 붙여 넣어 한 번 실행하세요. (여러 번 실행해도 안전합니다. 0001, 0002 가 먼저 실행되어 있어야 합니다)
--
--  * 팔로우(following / followers): 누구든 이름으로 찾거나 친구 코드(링크)로 팔로우할 수 있다.
--  * 서로 팔로우하면 "친구"가 된다. 그룹 초대는 친구에게만 보낼 수 있다 (스팸 방지).
--  * 그룹은 방장이 시작하는 즉시 진행된다 (READY 대기 없음). 초대받은 친구는 앱에서 초대를 보고 참여한다.
--    시작 후 3분 안에는 바로 참여, 그 뒤에는 현재 참여자 전원의 허용이 필요하다.

-- ───────────────────────────── 친구 코드 ─────────────────────────────
alter table public.profiles add column if not exists friend_code text;
update public.profiles set friend_code = upper(substr(md5(random()::text || id::text), 1, 8)) where friend_code is null;
alter table public.profiles alter column friend_code set default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
alter table public.profiles alter column friend_code set not null;
create unique index if not exists profiles_friend_code_key on public.profiles (friend_code);
create index if not exists profiles_name_idx on public.profiles (lower(name));

-- ───────────────────────────── 팔로우 ─────────────────────────────
create table if not exists public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);
alter table public.follows enable row level security;
-- (정책이 없으므로 테이블 직접 접근은 거부된다. 아래 함수만 사용)

-- 사람 한 명의 공개 정보 + 나와의 관계
create or replace function public._person(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id, 'name', p.name, 'species', p.species, 'color', p.color, 'hat', p.hat,
    'friend_code', p.friend_code,
    'i_follow', exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = p.id),
    'follows_me', exists (select 1 from public.follows f where f.follower_id = p.id and f.followee_id = auth.uid())
  )
  from public.profiles p where p.id = p_user;
$$;

-- 이름(일부)으로 찾기. 8자리 친구 코드를 넣으면 정확히 그 사람을 찾는다.
create or replace function public.search_profiles(p_query text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_q text := trim(coalesce(p_query, ''));
  v_pat text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_q ~ '^[0-9A-Fa-f]{8}$' then
    return coalesce((select jsonb_agg(public._person(p.id)) from public.profiles p where p.friend_code = upper(v_q) and p.id <> auth.uid()), '[]'::jsonb);
  end if;
  if char_length(v_q) < 2 then return '[]'::jsonb; end if;
  v_pat := replace(replace(replace(lower(v_q), '\', '\\'), '%', '\%'), '_', '\_');
  return coalesce((
    select jsonb_agg(public._person(x.id))
      from (
        select p.id from public.profiles p
         where p.id <> auth.uid() and lower(p.name) like '%' || v_pat || '%'
         order by (lower(p.name) like v_pat || '%') desc, p.name
         limit 20
      ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.follow_user(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_user = auth.uid() then raise exception 'CANNOT_FOLLOW_SELF'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'USER_NOT_FOUND'; end if;
  insert into public.follows (follower_id, followee_id) values (auth.uid(), p_user) on conflict do nothing;
  return public._person(p_user);
end;
$$;

-- 친구 코드(공유 링크에 들어 있는 값)로 팔로우
create or replace function public.follow_by_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select id into v_id from public.profiles where friend_code = upper(trim(p_code));
  if v_id is null then raise exception 'CODE_NOT_FOUND'; end if;
  return public.follow_user(v_id);
end;
$$;

create or replace function public.unfollow_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  delete from public.follows where follower_id = auth.uid() and followee_id = p_user;
end;
$$;

-- 내 프로필 화면용: 내 정보, 내가 팔로우하는 사람, 나를 팔로우하는 사람
create or replace function public.my_social()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  return jsonb_build_object(
    'me', public._person(auth.uid()),
    'following', coalesce((select jsonb_agg(public._person(f.followee_id) order by p.name)
                             from public.follows f join public.profiles p on p.id = f.followee_id
                            where f.follower_id = auth.uid()), '[]'::jsonb),
    'followers', coalesce((select jsonb_agg(public._person(f.follower_id) order by p.name)
                             from public.follows f join public.profiles p on p.id = f.follower_id
                            where f.followee_id = auth.uid()), '[]'::jsonb)
  );
end;
$$;

-- ───────────────────────────── 친구 초대로 그룹 만들기 ─────────────────────────────

-- 방을 만들자마자 시작한다(READY 대기 없음). 서로 팔로우하는 친구만 초대할 수 있다 (최대 3명).
create or replace function public.create_room_with_invites(p_minutes int, p_tag text, p_invitees uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room uuid;
  v_code text;
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_friend uuid;
  v_count int := 0;
  i int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not exists (select 1 from public.profiles where id = v_uid) then raise exception 'PROFILE_REQUIRED'; end if;
  if p_minutes < 1 or p_minutes > 120 then raise exception 'BAD_MINUTES'; end if;
  if exists (
    select 1 from public.room_members rm join public.rooms r on r.id = rm.room_id
    where rm.user_id = v_uid and r.status = 'running' and rm.status in ('active', 'pending')
  ) then
    raise exception 'ALREADY_IN_ROOM';
  end if;
  perform public._leave_lobbies(v_uid);

  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms where code = v_code);
  end loop;

  insert into public.rooms (code, host_id, minutes, tag, status, started_at, ends_at)
  values (v_code, v_uid, p_minutes, left(coalesce(nullif(trim(p_tag), ''), 'STUDY'), 12), 'running', now(), now() + make_interval(mins => p_minutes))
  returning id into v_room;

  insert into public.room_members (room_id, user_id, status, ready, active_since) values (v_room, v_uid, 'active', true, now());

  foreach v_friend in array coalesce(p_invitees, '{}'::uuid[]) loop
    exit when v_count >= 3;
    -- 서로 팔로우하는 친구에게만
    if v_friend <> v_uid
       and exists (select 1 from public.follows where follower_id = v_uid and followee_id = v_friend)
       and exists (select 1 from public.follows where follower_id = v_friend and followee_id = v_uid) then
      insert into public.room_invites (room_id, from_id, to_id) values (v_room, v_uid, v_friend) on conflict do nothing;
      v_count := v_count + 1;
    end if;
  end loop;

  return public._room_state(v_room);
end;
$$;

-- 나에게 온 초대 (아직 진행 중인 방만)
create or replace function public.my_invites()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'room_id', r.id, 'minutes', r.minutes, 'tag', r.tag,
      'host_name', p.name, 'host_species', p.species, 'host_color', p.color, 'host_hat', p.hat,
      'started_ago_s', floor(extract(epoch from (now() - r.started_at)))::int,
      'free_join_left_s', greatest(0, r.late_join_seconds - floor(extract(epoch from (now() - r.started_at)))::int),
      'ends_in_s', floor(extract(epoch from (r.ends_at - now())))::int
    ) order by r.started_at desc)
    from public.room_invites i
    join public.rooms r on r.id = i.room_id
    left join public.profiles p on p.id = i.from_id
    where i.to_id = auth.uid() and i.status = 'pending'
      and r.status = 'running' and r.ends_at > now() + interval '30 seconds'
  ), '[]'::jsonb);
end;
$$;

-- 초대를 수락한다: 시작 후 3분 안이면 바로 참여, 지났으면 전원 허용을 기다리는 상태가 된다 (join_room 규칙과 동일)
create or replace function public.accept_invite(p_room uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not exists (select 1 from public.room_invites where room_id = p_room and to_id = auth.uid() and status = 'pending') then
    raise exception 'INVITE_NOT_FOUND';
  end if;
  select code into v_code from public.rooms where id = p_room;
  update public.room_invites set status = 'accepted' where room_id = p_room and to_id = auth.uid();
  return public.join_room(v_code);
end;
$$;

create or replace function public.decline_invite(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  update public.room_invites set status = 'declined' where room_id = p_room and to_id = auth.uid() and status = 'pending';
end;
$$;

-- ───────────────────────────── 권한 ─────────────────────────────
revoke all on function public._person(uuid) from public, anon, authenticated;
revoke all on function public.search_profiles(text) from public, anon;
revoke all on function public.follow_user(uuid) from public, anon;
revoke all on function public.follow_by_code(text) from public, anon;
revoke all on function public.unfollow_user(uuid) from public, anon;
revoke all on function public.my_social() from public, anon;
revoke all on function public.create_room_with_invites(int, text, uuid[]) from public, anon;
revoke all on function public.my_invites() from public, anon;
revoke all on function public.accept_invite(uuid) from public, anon;
revoke all on function public.decline_invite(uuid) from public, anon;

grant execute on function public.search_profiles(text) to authenticated;
grant execute on function public.follow_user(uuid) to authenticated;
grant execute on function public.follow_by_code(text) to authenticated;
grant execute on function public.unfollow_user(uuid) to authenticated;
grant execute on function public.my_social() to authenticated;
grant execute on function public.create_room_with_invites(int, text, uuid[]) to authenticated;
grant execute on function public.my_invites() to authenticated;
grant execute on function public.accept_invite(uuid) to authenticated;
grant execute on function public.decline_invite(uuid) to authenticated;
