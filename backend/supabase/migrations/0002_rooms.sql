-- Focus Town: 그룹 방(함께 집중하기)
-- Supabase 대시보드 > SQL Editor 에 붙여 넣어 한 번 실행하세요. (여러 번 실행해도 안전합니다. 0001 먼저 실행되어 있어야 합니다)
--
-- 규칙 요약
--  * 방장이 방을 만들고(2~4인) 6자리 코드를 공유한다. 준비(READY)한 사람들로 방장이 시작한다.
--  * 시작 후 late_join_seconds(기본 180초) 안에는 누구나 늦게 참여할 수 있다. 그 뒤에는 현재 참여자 "전원"이 허용해야 참여할 수 있다.
--  * 팀 건물은 내구성 100%로 시작한다. 누군가 15초를 넘겨 앱을 벗어나 있으면, 초과한 1초마다 내구성이 100/60 % 줄어든다.
--  * 한 사람의 초과 이탈이 45초(= 총 60초 이탈)에 이르면 그 사람은 탈락(dropped)하고 팀은 계속 간다.
--  * 종료 시 내구성이 70% 이상이면 원래 건물, 40~69%면 한 단계 작은 건물, 1~39%면 오두막, 0%면 붕괴.
--  * 모든 읽기/쓰기는 아래 RPC 함수로만 한다 (테이블에는 직접 접근 정책이 없다).

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users (id) on delete cascade,
  minutes int not null check (minutes between 1 and 120),
  tag text not null default 'STUDY',
  status text not null default 'lobby' check (status in ('lobby', 'running', 'done', 'collapsed', 'closed')),
  max_members int not null default 4,
  late_join_seconds int not null default 180,
  started_at timestamptz,
  ends_at timestamptz,
  durability int,      -- 종료 시 확정되는 최종 내구성(%)
  building_tier int,   -- 0 = 원래 건물, -1 = 한 단계 작게, -2 = 오두막
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'pending', 'dropped', 'left')),
  ready boolean not null default false,
  damage_s int not null default 0,         -- 이 사람이 정산한 초과 이탈(초). 최대 45
  last_seen timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  active_since timestamptz,                -- 실제로 집중에 참여하기 시작한 시각
  primary key (room_id, user_id)
);

create table if not exists public.join_votes (
  room_id uuid not null,
  joiner_id uuid not null,
  voter_id uuid not null,
  allow boolean not null,
  primary key (room_id, joiner_id, voter_id),
  foreign key (room_id, joiner_id) references public.room_members (room_id, user_id) on delete cascade
);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.join_votes enable row level security;
-- (정책을 만들지 않으므로 앱에서 테이블 직접 접근은 모두 거부된다. 아래 함수만 사용)

create index if not exists room_members_user_idx on public.room_members (user_id);

-- ───────────────────────────── 내부 함수 ─────────────────────────────

-- 방 전체 상태를 JSON으로 만든다 (호출자가 방 멤버일 때만 사용)
create or replace function public._room_state(p_room uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_room public.rooms;
  v_me uuid := auth.uid();
  v_members jsonb;
  v_dur int;
begin
  select * into v_room from public.rooms where id = p_room;
  if not found then
    return null;
  end if;

  with m as (
    select rm.*, p.name, p.species, p.color, p.hat,
      case
        when rm.status = 'active' and v_room.status = 'running' and now() - rm.last_seen > interval '10 seconds'
          then floor(extract(epoch from (now() - rm.last_seen)))::int
        else 0
      end as away_s
    from public.room_members rm
    left join public.profiles p on p.id = rm.user_id
    where rm.room_id = v_room.id
  ), e as (
    select m.*,
      least(45, m.damage_s + case when m.away_s > 0
        then greatest(0, floor(extract(epoch from (least(now(), coalesce(v_room.ends_at, now())) - m.last_seen)))::int - 15)
        else 0 end) as eff
    from m
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'user_id', e.user_id,
      'name', e.name, 'species', e.species, 'color', e.color, 'hat', e.hat,
      'status', case when e.status = 'active' and e.eff >= 45 then 'dropped' else e.status end,
      'ready', e.ready,
      'is_host', e.user_id = v_room.host_id,
      'damage_s', e.eff,
      'away_s', e.away_s,
      'joined_at', e.joined_at,
      'active_since', e.active_since,
      'votes_allow', (select count(*) from public.join_votes v where v.room_id = e.room_id and v.joiner_id = e.user_id and v.allow),
      'my_vote', (select v.allow from public.join_votes v where v.room_id = e.room_id and v.joiner_id = e.user_id and v.voter_id = v_me)
    ) order by e.joined_at), '[]'::jsonb),
    greatest(0, 100 - round(coalesce(sum(e.eff) filter (where e.status in ('active', 'dropped', 'left')), 0) * 100 / 60.0))::int
  into v_members, v_dur
  from e;

  return jsonb_build_object(
    'server_now', now(),
    'room', jsonb_build_object(
      'id', v_room.id, 'code', v_room.code, 'host_id', v_room.host_id, 'minutes', v_room.minutes,
      'tag', v_room.tag, 'status', v_room.status, 'max_members', v_room.max_members,
      'late_join_seconds', v_room.late_join_seconds, 'started_at', v_room.started_at,
      'ends_at', v_room.ends_at, 'durability', v_room.durability, 'building_tier', v_room.building_tier
    ),
    'members', v_members,
    'durability_now', case when v_room.status in ('done', 'collapsed') then coalesce(v_room.durability, v_dur) else v_dur end,
    -- 현재 참여자 수(허용 투표 기준)
    'active_count', (select count(*) from public.room_members where room_id = v_room.id and status = 'active')
  );
end;
$$;

-- 호출자가 방의 (나간 사람이 아닌) 멤버인지 확인하고 멤버 행을 돌려준다
create or replace function public._require_member(p_room uuid)
returns public.room_members
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_member public.room_members;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  select * into v_member from public.room_members where room_id = p_room and user_id = auth.uid();
  if not found then
    raise exception 'NOT_A_MEMBER';
  end if;
  return v_member;
end;
$$;

-- ───────────────────────────── 앱에서 쓰는 함수 ─────────────────────────────

create or replace function public.create_room(p_minutes int, p_tag text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_room uuid;
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not exists (select 1 from public.profiles where id = v_uid) then raise exception 'PROFILE_REQUIRED'; end if;
  if p_minutes < 1 or p_minutes > 120 then raise exception 'BAD_MINUTES'; end if;

  -- 진행 중인 방이 있으면 새로 만들 수 없다. 대기 중(lobby)인 방은 자동으로 나간다.
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

  insert into public.rooms (code, host_id, minutes, tag)
  values (v_code, v_uid, p_minutes, left(coalesce(nullif(trim(p_tag), ''), 'STUDY'), 12))
  returning id into v_room;

  insert into public.room_members (room_id, user_id, status, ready) values (v_room, v_uid, 'waiting', true);
  return public._room_state(v_room);
end;
$$;

-- 대기 중인 방에서 나간다 (방장이면 다음 사람에게 넘기고, 아무도 없으면 방을 닫는다)
create or replace function public._leave_lobbies(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_next uuid;
begin
  for r in
    select rm.room_id, rm2.host_id from public.room_members rm
    join public.rooms rm2 on rm2.id = rm.room_id
    where rm.user_id = p_user and rm2.status = 'lobby'
  loop
    delete from public.room_members where room_id = r.room_id and user_id = p_user;
    if r.host_id = p_user then
      select user_id into v_next from public.room_members where room_id = r.room_id order by joined_at limit 1;
      if v_next is null then
        update public.rooms set status = 'closed' where id = r.room_id;
      else
        update public.rooms set host_id = v_next where id = r.room_id;
        update public.room_members set ready = true where room_id = r.room_id and user_id = v_next;
      end if;
    end if;
  end loop;
end;
$$;

create or replace function public.join_room(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms;
  v_existing public.room_members;
  v_count int;
  v_elapsed numeric;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not exists (select 1 from public.profiles where id = v_uid) then raise exception 'PROFILE_REQUIRED'; end if;

  select * into v_room from public.rooms where code = upper(trim(p_code));
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.status not in ('lobby', 'running') then raise exception 'ROOM_CLOSED'; end if;

  -- 이미 이 방의 멤버면 그대로 돌려준다 (다시 들어오기)
  select * into v_existing from public.room_members where room_id = v_room.id and user_id = v_uid;
  if found and v_existing.status in ('waiting', 'active', 'pending') then
    return public._room_state(v_room.id);
  end if;
  if found and v_existing.status in ('dropped', 'left') then
    raise exception 'ROOM_CLOSED';
  end if;

  select count(*) into v_count from public.room_members where room_id = v_room.id and status in ('waiting', 'active', 'pending');
  if v_count >= v_room.max_members then raise exception 'ROOM_FULL'; end if;

  -- 다른 방에서 진행 중이면 참여 불가, 대기 중이면 자동으로 나감
  if exists (
    select 1 from public.room_members rm join public.rooms r on r.id = rm.room_id
    where rm.user_id = v_uid and r.status = 'running' and rm.status in ('active', 'pending')
  ) then
    raise exception 'ALREADY_IN_ROOM';
  end if;
  perform public._leave_lobbies(v_uid);

  if v_room.status = 'lobby' then
    insert into public.room_members (room_id, user_id, status, ready) values (v_room.id, v_uid, 'waiting', false);
  else
    v_elapsed := extract(epoch from (now() - v_room.started_at));
    if v_elapsed <= v_room.late_join_seconds then
      insert into public.room_members (room_id, user_id, status, ready, active_since) values (v_room.id, v_uid, 'active', true, now());
    else
      insert into public.room_members (room_id, user_id, status, ready) values (v_room.id, v_uid, 'pending', false);
    end if;
  end if;
  return public._room_state(v_room.id);
end;
$$;

create or replace function public.set_ready(p_room uuid, p_ready boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.room_members := public._require_member(p_room);
  v_room public.rooms;
begin
  select * into v_room from public.rooms where id = p_room;
  if v_room.status <> 'lobby' then raise exception 'NOT_IN_LOBBY'; end if;
  update public.room_members set ready = p_ready where room_id = p_room and user_id = v_member.user_id;
  return public._room_state(p_room);
end;
$$;

-- 방장이 시작한다: 준비한 사람은 참여자(active)가 되고, 준비하지 않은 사람은 대기(waiting) 상태로 남아 늦게 참여할 수 있다
create or replace function public.start_room(p_room uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.room_members := public._require_member(p_room);
  v_room public.rooms;
begin
  select * into v_room from public.rooms where id = p_room for update;
  if v_room.host_id <> v_member.user_id then raise exception 'NOT_HOST'; end if;
  if v_room.status <> 'lobby' then raise exception 'NOT_IN_LOBBY'; end if;

  update public.room_members
     set status = 'active', active_since = now(), last_seen = now()
   where room_id = p_room and ready and status = 'waiting';
  update public.rooms
     set status = 'running', started_at = now(), ends_at = now() + make_interval(mins => v_room.minutes)
   where id = p_room;
  return public._room_state(p_room);
end;
$$;

-- 시작 후 대기 중이던 사람이 참여한다. 제한 시간 안이면 바로 참여, 지나면 현재 참여자 전원의 허용이 필요하다.
create or replace function public.late_join(p_room uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.room_members := public._require_member(p_room);
  v_room public.rooms;
begin
  select * into v_room from public.rooms where id = p_room;
  if v_room.status <> 'running' then raise exception 'NOT_RUNNING'; end if;
  if v_member.status <> 'waiting' then return public._room_state(p_room); end if;

  if extract(epoch from (now() - v_room.started_at)) <= v_room.late_join_seconds then
    update public.room_members set status = 'active', ready = true, active_since = now(), last_seen = now()
     where room_id = p_room and user_id = v_member.user_id;
  else
    update public.room_members set status = 'pending' where room_id = p_room and user_id = v_member.user_id;
  end if;
  return public._room_state(p_room);
end;
$$;

-- 참여자가 늦은 참여 요청을 허용/거절한다. 전원이 허용하면 참여, 한 명이라도 거절하면 대기(waiting)로 돌아간다.
create or replace function public.respond_join(p_room uuid, p_joiner uuid, p_allow boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.room_members := public._require_member(p_room);
  v_active int;
  v_allow int;
begin
  if v_member.status <> 'active' then raise exception 'NOT_ACTIVE'; end if;
  if not exists (select 1 from public.room_members where room_id = p_room and user_id = p_joiner and status = 'pending') then
    return public._room_state(p_room);
  end if;

  insert into public.join_votes (room_id, joiner_id, voter_id, allow) values (p_room, p_joiner, v_member.user_id, p_allow)
  on conflict (room_id, joiner_id, voter_id) do update set allow = excluded.allow;

  if not p_allow then
    delete from public.join_votes where room_id = p_room and joiner_id = p_joiner;
    update public.room_members set status = 'left' where room_id = p_room and user_id = p_joiner;
  else
    select count(*) into v_active from public.room_members where room_id = p_room and status = 'active';
    select count(*) into v_allow from public.join_votes v
      join public.room_members rm on rm.room_id = v.room_id and rm.user_id = v.voter_id and rm.status = 'active'
     where v.room_id = p_room and v.joiner_id = p_joiner and v.allow;
    if v_allow >= v_active then
      update public.room_members set status = 'active', ready = true, active_since = now(), last_seen = now()
       where room_id = p_room and user_id = p_joiner;
      delete from public.join_votes where room_id = p_room and joiner_id = p_joiner;
    end if;
  end if;
  return public._room_state(p_room);
end;
$$;

-- 집중 중 5초 안팎으로 호출한다: "앱이 떠 있음"을 알리고, 내가 정산한 초과 이탈(초)을 올린 뒤 최신 상태를 돌려준다
create or replace function public.heartbeat(p_room uuid, p_damage_s int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.room_members := public._require_member(p_room);
  v_room public.rooms;
  v_damage int;
begin
  select * into v_room from public.rooms where id = p_room;
  if v_room.status = 'running' and v_member.status = 'active' then
    v_damage := greatest(v_member.damage_s, least(45, greatest(0, coalesce(p_damage_s, 0))));
    update public.room_members
       set last_seen = now(),
           damage_s = v_damage,
           status = case when v_damage >= 45 then 'dropped' else status end
     where room_id = p_room and user_id = v_member.user_id;
  end if;
  return public._room_state(p_room);
end;
$$;

-- 시간이 끝나면 아무 멤버나 호출한다. 처음 호출한 사람이 결과를 확정하고, 이후에는 같은 결과를 돌려준다.
create or replace function public.finish_room(p_room uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.room_members := public._require_member(p_room);
  v_room public.rooms;
  v_state jsonb;
  v_dur int;
begin
  select * into v_room from public.rooms where id = p_room for update;
  if v_room.status = 'running' and now() >= v_room.ends_at - interval '1 second' then
    v_state := public._room_state(p_room);
    v_dur := (v_state ->> 'durability_now')::int;

    -- 마지막으로 계산된 초과 이탈(초)을 각자의 기록으로 확정
    update public.room_members rm
       set damage_s = least(45, greatest(rm.damage_s, coalesce(
             (select (m ->> 'damage_s')::int from jsonb_array_elements(v_state -> 'members') m where (m ->> 'user_id')::uuid = rm.user_id), 0)))
     where rm.room_id = p_room and rm.status in ('active', 'dropped', 'left');

    -- 탈락자 확정, 아직 대기/요청 중이던 사람은 정리
    update public.room_members rm
       set status = 'dropped'
     where rm.room_id = p_room and rm.status = 'active'
       and (select (m ->> 'status') = 'dropped' from jsonb_array_elements(v_state -> 'members') m where (m ->> 'user_id')::uuid = rm.user_id);
    update public.room_members set status = 'left' where room_id = p_room and status in ('pending', 'waiting');

    update public.rooms
       set status = case when v_dur <= 0 then 'collapsed' else 'done' end,
           durability = v_dur,
           building_tier = case when v_dur >= 70 then 0 when v_dur >= 40 then -1 else -2 end
     where id = p_room;
  end if;
  return public._room_state(p_room);
end;
$$;

-- 방에서 나간다 (대기 중이면 목록에서 빠지고, 진행 중이면 탈락 처리되며 팀은 계속 간다)
create or replace function public.leave_room(p_room uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.room_members := public._require_member(p_room);
  v_room public.rooms;
begin
  select * into v_room from public.rooms where id = p_room;
  if v_room.status = 'lobby' then
    perform public._leave_lobbies(v_member.user_id);
  elsif v_room.status = 'running' and v_member.status in ('active', 'pending', 'waiting') then
    update public.room_members set status = 'left' where room_id = p_room and user_id = v_member.user_id;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_room_state(p_room uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.room_members := public._require_member(p_room);
begin
  return public._room_state(p_room);
end;
$$;

-- 앱을 다시 켰을 때 진행 중인 내 방이 있으면 방 id를 돌려준다
create or replace function public.my_open_room()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select r.id
    from public.room_members rm
    join public.rooms r on r.id = rm.room_id
   where rm.user_id = auth.uid()
     and rm.status in ('waiting', 'active', 'pending')
     and (
       (r.status = 'lobby' and r.created_at > now() - interval '6 hours')
       or (r.status = 'running' and r.ends_at > now() - interval '15 minutes')
     )
   order by r.created_at desc
   limit 1;
$$;

-- 권한: 로그인한 사용자만 호출할 수 있다 (내부 함수는 막아 둔다)
revoke all on function public._room_state(uuid) from public, anon, authenticated;
revoke all on function public._require_member(uuid) from public, anon, authenticated;
revoke all on function public._leave_lobbies(uuid) from public, anon, authenticated;
revoke all on function public.create_room(int, text) from public, anon;
revoke all on function public.join_room(text) from public, anon;
revoke all on function public.set_ready(uuid, boolean) from public, anon;
revoke all on function public.start_room(uuid) from public, anon;
revoke all on function public.late_join(uuid) from public, anon;
revoke all on function public.respond_join(uuid, uuid, boolean) from public, anon;
revoke all on function public.heartbeat(uuid, int) from public, anon;
revoke all on function public.finish_room(uuid) from public, anon;
revoke all on function public.leave_room(uuid) from public, anon;
revoke all on function public.get_room_state(uuid) from public, anon;
revoke all on function public.my_open_room() from public, anon;

grant execute on function public.create_room(int, text) to authenticated;
grant execute on function public.join_room(text) to authenticated;
grant execute on function public.set_ready(uuid, boolean) to authenticated;
grant execute on function public.start_room(uuid) to authenticated;
grant execute on function public.late_join(uuid) to authenticated;
grant execute on function public.respond_join(uuid, uuid, boolean) to authenticated;
grant execute on function public.heartbeat(uuid, int) to authenticated;
grant execute on function public.finish_room(uuid) to authenticated;
grant execute on function public.leave_room(uuid) to authenticated;
grant execute on function public.get_room_state(uuid) to authenticated;
grant execute on function public.my_open_room() to authenticated;
