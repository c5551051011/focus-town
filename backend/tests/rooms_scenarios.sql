\set ON_ERROR_STOP 0
\pset tuples_only on
truncate public.join_votes, public.room_members, public.rooms, public.profiles cascade;
delete from auth.users;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b'),('00000000-0000-0000-0000-00000000000c'),('00000000-0000-0000-0000-00000000000d'),('00000000-0000-0000-0000-00000000000e');
insert into public.profiles (id,name,species,color,hat) select id, 'U'||right(id::text,1), 'bear','brown','none' from auth.users;
create temp table ctx(k text primary key, v text);

create or replace function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000'||u,false) $$;
create or replace function pg_temp.summary(s jsonb) returns text language sql as $$
  select (s->'room'->>'status')||' dur='||coalesce(s->>'durability_now','?')||' tier='||coalesce(s->'room'->>'building_tier','-')||' members='||(
    select string_agg((m->>'name')||':'||(m->>'status')||'/'||(m->>'damage_s'), ', ' order by m->>'name') from jsonb_array_elements(s->'members') m) $$;

\echo '--- 1. create / join / ready / start'
select pg_temp.as_user('a');
select pg_temp.summary(public.create_room(1, 'STUDY')) ;
insert into ctx select 'room', id::text from public.rooms limit 1;
insert into ctx select 'code', code from public.rooms limit 1;
select pg_temp.as_user('b');
select pg_temp.summary(public.join_room((select v from ctx where k='code')));
select pg_temp.as_user('c');
select pg_temp.summary(public.join_room(lower((select v from ctx where k='code'))));
select pg_temp.as_user('b'); select pg_temp.summary(public.set_ready((select v::uuid from ctx where k='room'), true));
\echo '--- non-host cannot start'
select pg_temp.as_user('b'); select public.start_room((select v::uuid from ctx where k='room'));
\echo '--- host starts (a,b active; c waiting)'
select pg_temp.as_user('a'); select pg_temp.summary(public.start_room((select v::uuid from ctx where k='room')));

\echo '--- 2. late join within window by c'
select pg_temp.as_user('c'); select pg_temp.summary(public.late_join((select v::uuid from ctx where k='room')));

\echo '--- 3. new user d joins after window -> pending; need votes from a,b,c'
update public.rooms set started_at = now() - interval '4 minutes', ends_at = now() + interval '56 seconds' where id=(select v::uuid from ctx where k='room');
select pg_temp.as_user('d'); select pg_temp.summary(public.join_room((select v from ctx where k='code')));
select pg_temp.as_user('a'); select pg_temp.summary(public.respond_join((select v::uuid from ctx where k='room'),'00000000-0000-0000-0000-00000000000d',true));
select pg_temp.as_user('b'); select pg_temp.summary(public.respond_join((select v::uuid from ctx where k='room'),'00000000-0000-0000-0000-00000000000d',true));
\echo '(after 2 of 3 votes: d still pending)'
select pg_temp.as_user('c'); select pg_temp.summary(public.respond_join((select v::uuid from ctx where k='room'),'00000000-0000-0000-0000-00000000000d',true));
\echo '(after 3 of 3: d active)'

\echo '--- 4. away estimation: b last_seen 40s ago -> damage (40-15)=25 -> dur 58'
update public.room_members set last_seen = now() where room_id=(select v::uuid from ctx where k='room');
update public.room_members set last_seen = now() - interval '40 seconds' where user_id='00000000-0000-0000-0000-00000000000b';
select pg_temp.as_user('a'); select pg_temp.summary(public.heartbeat((select v::uuid from ctx where k='room'), 0));

\echo '--- 5. c heartbeat reports 20s damage -> dur drops more'
select pg_temp.as_user('c'); select pg_temp.summary(public.heartbeat((select v::uuid from ctx where k='room'), 20));

\echo '--- 6. b away 100s -> eff capped 45 -> dropped in state'
update public.room_members set last_seen = now() - interval '100 seconds' where user_id='00000000-0000-0000-0000-00000000000b';
select pg_temp.as_user('a'); select pg_temp.summary(public.heartbeat((select v::uuid from ctx where k='room'), 0));

\echo '--- 7. finish too early does nothing'
select pg_temp.as_user('a'); select pg_temp.summary(public.finish_room((select v::uuid from ctx where k='room')));
\echo '--- 8. time up -> finish (idempotent, 2nd caller same result)'
update public.rooms set ends_at = now() - interval '1 second' where id=(select v::uuid from ctx where k='room');
select pg_temp.as_user('a'); select pg_temp.summary(public.finish_room((select v::uuid from ctx where k='room')));
select pg_temp.as_user('c'); select pg_temp.summary(public.finish_room((select v::uuid from ctx where k='room')));

\echo '--- 9. denied late join: new room'
select pg_temp.as_user('a'); select pg_temp.summary(public.create_room(30,'WORK'));
insert into ctx select 'room2', id::text from public.rooms where status='lobby' limit 1;
insert into ctx select 'code2', code from public.rooms where status='lobby' limit 1;
select pg_temp.as_user('b'); select pg_temp.summary(public.join_room((select v from ctx where k='code2')));
select pg_temp.as_user('a'); select pg_temp.summary(public.start_room((select v::uuid from ctx where k='room2')));
update public.rooms set started_at = now() - interval '5 minutes' where id=(select v::uuid from ctx where k='room2');
select pg_temp.as_user('b'); select pg_temp.summary(public.late_join((select v::uuid from ctx where k='room2')));
select pg_temp.as_user('a'); select pg_temp.summary(public.respond_join((select v::uuid from ctx where k='room2'),'00000000-0000-0000-0000-00000000000b',false));

\echo '--- 10. errors: full room, bad code, closed room'
select pg_temp.as_user('e'); select public.join_room('ZZZZZZ');
select pg_temp.as_user('e'); select public.join_room((select v from ctx where k='code'));
\echo '--- 11. leave running room -> left; my_open_room'
select pg_temp.as_user('b'); select public.my_open_room();
select pg_temp.as_user('a'); select public.my_open_room() is not null as a_has_room;
select pg_temp.as_user('a'); select public.leave_room((select v::uuid from ctx where k='room2'));
select pg_temp.as_user('a'); select public.my_open_room() is not null as a_has_room_after_leave;
\echo '--- 12. host leaves lobby -> promote; last leaves -> closed'
select pg_temp.as_user('d'); select pg_temp.summary(public.create_room(10,'REST'));
insert into ctx select 'code3', code from public.rooms where host_id='00000000-0000-0000-0000-00000000000d' and status='lobby';
select pg_temp.as_user('e'); select pg_temp.summary(public.join_room((select v from ctx where k='code3')));
select pg_temp.as_user('d'); select public.leave_room((select id from public.rooms where code=(select v from ctx where k='code3')));
select 'host now', name from public.rooms r join public.profiles p on p.id=r.host_id where code=(select v from ctx where k='code3');
select pg_temp.as_user('e'); select public.leave_room((select id from public.rooms where code=(select v from ctx where k='code3')));
select 'status', status from public.rooms where code=(select v from ctx where k='code3');
