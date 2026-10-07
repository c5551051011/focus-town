-- Focus Town: 그룹 초대를 받으면 앱이 꺼져 있어도 푸시 알림으로 알려 준다
-- Supabase 대시보드 > SQL Editor 에 붙여 넣어 한 번 실행하세요. (여러 번 실행해도 안전합니다. 0001~0004 가 먼저 실행되어 있어야 합니다)
--
--  * room_invites 에 새 초대가 들어오면 초대받은 사람의 푸시 토큰(push_tokens)으로 알림을 보낸다.
--  * 넛지(0004)와 같은 방식이다: 데이터베이스가 Expo 푸시 서비스로 직접 보낸다 (pg_net).
--  * 알림 전송에 실패해도 초대 자체는 정상적으로 만들어진다.

create or replace function public._push_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_name text;
begin
  if new.status <> 'pending' then return new; end if;

  select token into v_token from public.push_tokens where user_id = new.to_id;
  if v_token is null then return new; end if;

  select name into v_name from public.profiles where id = new.from_id;

  begin
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := jsonb_build_object(
        'to', v_token,
        'title', 'Focus together?',
        'body', coalesce(v_name, 'A friend') || ' invited you to build together. Open Towny to join!',
        'sound', 'default',
        'priority', 'high',
        'channelId', 'default',
        'ttl', 300,
        'data', jsonb_build_object('type', 'invite', 'room', new.room_id)
      ),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  exception when others then
    null; -- 알림을 못 보내도 초대는 성공으로 친다 (pg_net 이 없는 로컬 시험 환경 포함)
  end;

  return new;
end;
$$;

revoke all on function public._push_invite() from public, anon, authenticated;

drop trigger if exists room_invites_push on public.room_invites;
create trigger room_invites_push
  after insert on public.room_invites
  for each row execute function public._push_invite();
