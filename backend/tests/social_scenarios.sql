\set ON_ERROR_STOP 0
\pset tuples_only on
truncate public.room_invites, public.join_votes, public.room_members, public.rooms, public.follows, public.profiles cascade;
delete from auth.users;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b'),('00000000-0000-0000-0000-00000000000c'),('00000000-0000-0000-0000-00000000000d');
insert into public.profiles (id,name,species,color,hat) values
 ('00000000-0000-0000-0000-00000000000a','Alice','bear','brown','none'),
 ('00000000-0000-0000-0000-00000000000b','Bob','cat','orange','bow'),
 ('00000000-0000-0000-0000-00000000000c','Carol_100%','fox','pink','none'),
 ('00000000-0000-0000-0000-00000000000d','Alicia','rabbit','white','cap');
create or replace function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000'||u,false) $$;
create temp table ctx(k text primary key, v text);

\echo '--- friend codes unique & 8 chars'
select count(distinct friend_code) = 4 and bool_and(length(friend_code) = 8) as codes_ok from public.profiles;

\echo '--- search: "ali" (Alice, Alicia; not self), "bob", "100%" literal, too short, by code'
select pg_temp.as_user('a');
select string_agg(x->>'name', ',' order by x->>'name') from jsonb_array_elements(public.search_profiles('ali')) x;
select pg_temp.as_user('d');
select string_agg(x->>'name', ',' order by x->>'name') from jsonb_array_elements(public.search_profiles('ali')) x;
select pg_temp.as_user('a');
select string_agg(x->>'name', ',') from jsonb_array_elements(public.search_profiles('BOB')) x;
select string_agg(x->>'name', ',') from jsonb_array_elements(public.search_profiles('100%')) x;
select string_agg(x->>'name', ',') from jsonb_array_elements(public.search_profiles('%')) x;
select jsonb_array_length(public.search_profiles('b'));
insert into ctx select 'bcode', friend_code from public.profiles where name='Bob';
select string_agg(x->>'name', ',') from jsonb_array_elements(public.search_profiles((select lower(v) from ctx where k='bcode'))) x;

\echo '--- follow: a follows b (by code), a follows c, b not following back yet'
select pg_temp.as_user('a');
select public.follow_by_code((select v from ctx where k='bcode'))->>'name' as followed, (public.follow_by_code((select v from ctx where k='bcode'))->>'i_follow') as idempotent_i_follow;
select public.follow_user('00000000-0000-0000-0000-00000000000c')->>'name';
select public.follow_user('00000000-0000-0000-0000-00000000000a');
select public.follow_by_code('ZZZZZZZZ');
select pg_temp.as_user('b');
select 'b sees followers=' || jsonb_array_length(s->'followers') || ' following=' || jsonb_array_length(s->'following') || ' follower0.follows_me=' || (s->'followers'->0->>'follows_me') || ' i_follow=' || (s->'followers'->0->>'i_follow') from (select public.my_social() s) t;
select public.follow_user('00000000-0000-0000-0000-00000000000a')->>'i_follow';
select 'a mutual with b: ' || (x->>'i_follow') || '/' || (x->>'follows_me') from jsonb_array_elements((select public.my_social()->'following')) x where x->>'name'='Alice';

\echo '--- unfollow'
select pg_temp.as_user('a'); select public.unfollow_user('00000000-0000-0000-0000-00000000000c');
select jsonb_array_length(public.my_social()->'following') as a_following_after_unfollow;
select public.follow_user('00000000-0000-0000-0000-00000000000c')->>'name' as refollow;

\echo '--- group with invites: a invites b (mutual), c (one-way) and a stranger d'
select pg_temp.as_user('a');
select (s->'room'->>'status')||' invites='||(select string_agg((i->>'name')||':'||(i->>'status'), ',') from jsonb_array_elements(s->'invites') i) from (select public.create_room_with_invites(25,'STUDY', array['00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000d']::uuid[]) s) t;
insert into ctx select 'room', id::text from public.rooms limit 1;
\echo '(only mutual friend b was invited)'
select pg_temp.as_user('b'); select jsonb_array_length(public.my_invites()) as b_invites;
select pg_temp.as_user('c'); select jsonb_array_length(public.my_invites()) as c_invites;
select pg_temp.as_user('b'); select (x->>'host_name')||' '||(x->>'minutes')||'min free_left>0='||((x->>'free_join_left_s')::int > 0) from jsonb_array_elements(public.my_invites()) x;

\echo '--- b accepts within window -> active'
select pg_temp.as_user('b');
select (select string_agg((m->>'name')||':'||(m->>'status'), ',' order by m->>'name') from jsonb_array_elements(s->'members') m) from (select public.accept_invite((select v::uuid from ctx where k='room')) s) t;
select jsonb_array_length(public.my_invites()) as b_invites_after_accept;

\echo '--- second room, invite after window: accept -> pending'
select pg_temp.as_user('a'); select public.leave_room((select v::uuid from ctx where k='room'));
update public.rooms set status='closed';
select pg_temp.as_user('b'); select public.follow_user('00000000-0000-0000-0000-00000000000a') is not null;
select pg_temp.as_user('a');
select public.create_room_with_invites(30,'WORK', array['00000000-0000-0000-0000-00000000000b']::uuid[])->'room'->>'status';
update public.rooms set started_at = now() - interval '5 minutes' where status='running';
select pg_temp.as_user('b');
select (x->>'free_join_left_s') as free_left from jsonb_array_elements(public.my_invites()) x;
select (select string_agg((m->>'name')||':'||(m->>'status'), ',' order by m->>'name') from jsonb_array_elements(s->'members') m) from (select public.accept_invite((select id from public.rooms where status='running')) s) t;
\echo '--- decline path & double-accept error'
select pg_temp.as_user('a'); select public.leave_room((select id from public.rooms where status='running'));
update public.rooms set status='closed';
select public.create_room_with_invites(10,'REST', array['00000000-0000-0000-0000-00000000000b']::uuid[])->'room'->>'status';
select pg_temp.as_user('b'); select public.decline_invite((select id from public.rooms where status='running'));
select jsonb_array_length(public.my_invites()) as b_invites_after_decline;
select public.accept_invite((select id from public.rooms where status='running'));
