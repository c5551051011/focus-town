\set ON_ERROR_STOP 0
\pset tuples_only on
-- 0001~0004 를 올린 뒤 실행한다.
truncate public.push_tokens, public.room_invites, public.join_votes, public.room_members, public.rooms, public.follows, public.profiles cascade;
delete from auth.users;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b'),('00000000-0000-0000-0000-00000000000c');
insert into public.profiles (id,name,species,color,hat) values
 ('00000000-0000-0000-0000-00000000000a','Alice','bear','brown','none'),
 ('00000000-0000-0000-0000-00000000000b','Bob','cat','orange','bow'),
 ('00000000-0000-0000-0000-00000000000c','Carol','fox','pink','none');
create or replace function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000'||u,false) $$;
create temp table ctx(k text primary key, v text);

-- 모두 서로 팔로우, Alice 가 Bob·Carol 을 초대해 시작, 둘 다 수락
insert into public.follows (follower_id, followee_id) select a.id, b.id from public.profiles a, public.profiles b where a.id <> b.id;
select pg_temp.as_user('a');
insert into ctx select 'room', (public.create_room_with_invites(25, 'STUDY', array['00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000c']::uuid[])->'room'->>'id');
select pg_temp.as_user('b'); select public.accept_invite((select v::uuid from ctx where k='room')) is not null;
select pg_temp.as_user('c'); select public.accept_invite((select v::uuid from ctx where k='room')) is not null;

\echo '--- 푸시 토큰: 저장, 덮어쓰기, 너무 짧은 값은 무시, 다른 사람은 읽을 수 없음'
select pg_temp.as_user('b'); select public.set_push_token('ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]');
select pg_temp.as_user('b'); select public.set_push_token('ExponentPushToken[bbbbbbbbbbbbbbbbbbbbb2]');
select pg_temp.as_user('b'); select public.set_push_token('x');
select count(*) || ' token row(s), value=' || max(token) from public.push_tokens;
set role authenticated;
select count(*) as rows_visible_to_client_expect_permission_denied from (select 1 from public.push_tokens) t;
reset role;

\echo '--- 모두 앱을 켜 둔 상태: 넛지해도 아무도 안 간다 (expect 0)'
select pg_temp.as_user('a'); select public.nudge_away((select v::uuid from ctx where k='room'));

\echo '--- Bob 이 20초째 이탈: Alice 가 넛지 (expect 1), 바로 다시 (expect 0, 연타 방지)'
update public.room_members set last_seen = now() - interval '20 seconds' where user_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.as_user('a'); select public.nudge_away((select v::uuid from ctx where k='room'));
select public.nudge_away((select v::uuid from ctx where k='room'));

\echo '--- 21초 뒤에는 다시 보낼 수 있다 (expect 1)'
update public.room_members set nudged_at = now() - interval '25 seconds' where user_id = '00000000-0000-0000-0000-00000000000b';
select public.nudge_away((select v::uuid from ctx where k='room'));

\echo '--- Bob·Carol 둘 다 이탈 (Carol 은 토큰 없음): 둘 다 센다 (expect 2)'
update public.room_members set last_seen = now() - interval '30 seconds', nudged_at = null where user_id in ('00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000c');
select public.nudge_away((select v::uuid from ctx where k='room'));

\echo '--- 이탈한 사람 본인이 넛지하면: 자기 자신은 대상이 아니다 (expect 0, Alice 는 앱을 켜고 있음)'
select pg_temp.as_user('b'); select public.nudge_away((select v::uuid from ctx where k='room'));

\echo '--- 방에 없는 사람/탈락한 사람은 못 한다 (expect NOT_A_MEMBER / NOT_ACTIVE)'
delete from public.room_members where user_id = '00000000-0000-0000-0000-00000000000c';
select pg_temp.as_user('c'); select public.nudge_away((select v::uuid from ctx where k='room'));
update public.room_members set status = 'dropped' where user_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.as_user('b'); select public.nudge_away((select v::uuid from ctx where k='room'));

\echo '--- 로그인하지 않은 상태 (expect NOT_AUTHENTICATED)'
select set_config('request.jwt.claim.sub','',false);
select public.set_push_token('ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]');
