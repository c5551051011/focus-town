-- Focus Town: 이탈한 팀원에게 "돌아와요!" 알림 보내기 (넛지)
-- Supabase 대시보드 > SQL Editor 에 붙여 넣어 한 번 실행하세요. (여러 번 실행해도 안전합니다. 0001~0003 이 먼저 실행되어 있어야 합니다)
--
--  * 앱이 푸시 토큰을 push_tokens 에 올려 둔다 (set_push_token). 이 테이블은 정책이 없어 다른 사람은 읽을 수 없다.
--  * 집중 중인 팀원이 화면을 탭하면 nudge_away 가 호출된다. 지금 앱을 벗어난 팀원(10초 넘게 신호가 없는 사람)에게만 알림이 간다.
--  * 같은 사람에게는 20초에 한 번만 보낸다 (연타 방지).
--  * 알림은 Expo 푸시 서비스로 보낸다. 데이터베이스에서 직접 호출하므로 Supabase 의 pg_net 확장(기본 켜져 있음)을 쓴다.
--    푸시 알림이 실제로 기기에 닿으려면 Android 는 FCM 설정이 필요하다 (docs: https://docs.expo.dev/push-notifications/fcm-credentials/).

create table if not exists public.push_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token text not null,
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
-- (정책이 없으므로 테이블 직접 접근은 거부된다. 아래 함수만 사용)

alter table public.room_members add column if not exists nudged_at timestamptz;

create or replace function public.set_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_token is null or length(p_token) < 10 or length(p_token) > 300 then return; end if;
  insert into public.push_tokens (user_id, token, updated_at) values (auth.uid(), p_token, now())
  on conflict (user_id) do update set token = excluded.token, updated_at = now();
end;
$$;

create or replace function public.clear_push_token()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  delete from public.push_tokens where user_id = auth.uid();
end;
$$;

-- 이탈 중인 팀원에게 알림을 보낸다. 알림을 보낸 사람 수를 돌려준다. (0 이면 이탈 중인 사람이 없거나 방금 보냈다는 뜻)
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
       and now() - rm.last_seen > interval '10 seconds'
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

revoke all on function public.set_push_token(text) from public, anon;
revoke all on function public.clear_push_token() from public, anon;
revoke all on function public.nudge_away(uuid) from public, anon;
grant execute on function public.set_push_token(text) to authenticated;
grant execute on function public.clear_push_token() to authenticated;
grant execute on function public.nudge_away(uuid) to authenticated;
