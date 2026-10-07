-- Towny: 이탈한 팀원에게 더 빨리, 더 넉넉하게 알려 준다
-- Supabase 대시보드 > SQL Editor 에 붙여 넣어 한 번 실행하세요. (여러 번 실행해도 안전합니다. 0001~0006 이 먼저 실행되어 있어야 합니다)
--
--  * 이탈로 보는 기준: 하트비트가 10초 끊김 -> 6초 끊김. (앱은 2.5초마다 하트비트를 보낸다)
--  * 넛지(알림 보내기)도 6초부터 가능하다.
--  * 피해가 시작되기까지의 유예: 15초 -> 30초. 넛지 알림이 닿고 돌아올 시간을 준다. (앱의 DAMAGE_START_SEC 와 같아야 한다)

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
        when rm.status = 'active' and v_room.status = 'running' and now() - rm.last_seen > interval '6 seconds'
             and (rm.locked_until is null or rm.locked_until <= now())
          then floor(extract(epoch from (now() - rm.last_seen)))::int
        else 0
      end as away_s
    from public.room_members rm
    left join public.profiles p on p.id = rm.user_id
    where rm.room_id = v_room.id
  ), e as (
    select m.*,
      least(45, m.damage_s + case when m.away_s > 0
        then greatest(0, floor(extract(epoch from (least(now(), coalesce(v_room.ends_at, now())) - m.last_seen)))::int - 30)
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
    'active_count', (select count(*) from public.room_members where room_id = v_room.id and status = 'active'),
    -- 초대한 친구들의 응답 상태
    'invites', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', i.to_id, 'name', p.name, 'status', i.status) order by i.created_at)
        from public.room_invites i left join public.profiles p on p.id = i.to_id
       where i.room_id = v_room.id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.nudge_away(p_room uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.room_members := public._require_member(p_room);
  v_room public.rooms;
  v_name text;
  v_target record;
  v_count int := 0;
begin
  select * into v_room from public.rooms where id = p_room;
  if v_room.status <> 'running' then raise exception 'NOT_RUNNING'; end if;
  if v_member.status <> 'active' then raise exception 'NOT_ACTIVE'; end if;

  select name into v_name from public.profiles where id = auth.uid();

  for v_target in
    select rm.user_id, pt.token
      from public.room_members rm
      left join public.push_tokens pt on pt.user_id = rm.user_id
     where rm.room_id = p_room
       and rm.status = 'active'
       and rm.user_id <> auth.uid()
       and now() - rm.last_seen > interval '6 seconds'
       and (rm.locked_until is null or rm.locked_until <= now())
       and (rm.nudged_at is null or now() - rm.nudged_at > interval '20 seconds')
  loop
    update public.room_members set nudged_at = now() where room_id = p_room and user_id = v_target.user_id;
    v_count := v_count + 1;
    if v_target.token is not null then
      begin
        perform net.http_post(
          url := 'https://exp.host/--/api/v2/push/send',
          body := jsonb_build_object(
            'to', v_target.token,
            'title', 'Psst, come back!',
            'body', coalesce(v_name, 'Your team') || ' is waiting for you. The team building is taking damage!',
            'sound', 'default',
            'priority', 'high',
            'channelId', 'default',
            'ttl', 60,
            'data', jsonb_build_object('type', 'nudge', 'room', p_room)
          ),
          headers := jsonb_build_object('Content-Type', 'application/json')
        );
      exception when others then
        null; -- 알림 전송에 실패해도 넛지 자체는 성공으로 친다 (pg_net 이 없는 로컬 시험 환경 포함)
      end;
    end if;
  end loop;

  return v_count;
end;
$$;
