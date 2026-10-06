\set ON_ERROR_STOP 0
\pset tuples_only on
-- 0001~0005 를 올린 뒤 실행한다.
truncate public.push_tokens, public.room_invites, public.join_votes, public.room_members, public.rooms, public.follows, public.profiles cascade;
delete from auth.users;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b');
insert into public.profiles (id,name,species,color,hat) values
 ('00000000-0000-0000-0000-00000000000a','Alice','bear','brown','none'),
 ('00000000-0000-0000-0000-00000000000b','Bob','cat','orange','bow');
create or replace function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000'||u,false) $$;
create temp table ctx(k text primary key, v text);
create or replace function pg_temp.bob() returns jsonb language sql as $$
  select m from jsonb_array_elements(public.get_room_state((select v::uuid from ctx where k='room')) -> 'members') m where m ->> 'name' = 'Bob' $$;

insert into public.follows (follower_id, followee_id) select a.id, b.id from public.profiles a, public.profiles b where a.id <> b.id;
select pg_temp.as_user('a');
insert into ctx select 'room', (public.create_room_with_invites(25, 'STUDY', array['00000000-0000-0000-0000-00000000000b']::uuid[])->'room'->>'id');
select pg_temp.as_user('b'); select public.accept_invite((select v::uuid from ctx where k='room')) is not null;

\echo '--- Bob 이 40초째 신호 없음 (화면을 잠금 안 함): 자리 비움 + 초과 피해 (expect away_s>=40, damage_s>=25)'
update public.room_members set last_seen = now() - interval '40 seconds' where user_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.as_user('a');
select (pg_temp.bob()->>'away_s')::int >= 40 as away, (pg_temp.bob()->>'damage_s')::int >= 24 as damaged;

\echo '--- Bob 이 화면 잠금을 알림: 자리 비움 아님, 피해 없음 (expect 0 / 0)'
select pg_temp.as_user('b'); select public.set_locked((select v::uuid from ctx where k='room'), true);
select pg_temp.as_user('a');
select (pg_temp.bob()->>'away_s')::int as away, (pg_temp.bob()->>'damage_s')::int as damage;

\echo '--- 잠겨 있는 동안 넛지는 대상이 아니다 (expect 0)'
select public.nudge_away((select v::uuid from ctx where k='room'));

\echo '--- Bob 이 앱으로 돌아와 하트비트: 잠금 해제 (expect null)'
select pg_temp.as_user('b'); select (public.heartbeat((select v::uuid from ctx where k='room'), 0) ->> 'server_now') is not null;
select locked_until is null as cleared from public.room_members where user_id = '00000000-0000-0000-0000-00000000000b';

\echo '--- 해제 후 다시 신호가 끊기면 정상적으로 자리 비움 (expect true)'
update public.room_members set last_seen = now() - interval '20 seconds' where user_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.as_user('a');
select (pg_temp.bob()->>'away_s')::int >= 20 as away_again;

\echo '--- 방에 없는 사람이 잠금을 시도 (expect NOT_A_MEMBER)'
delete from public.room_members where user_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.as_user('b'); select public.set_locked((select v::uuid from ctx where k='room'), true);
