\pset tuples_only on
truncate public.join_votes, public.room_members, public.rooms cascade;
create temp table ctx(k text primary key, v text);
create or replace function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000'||u,false) $$;
create or replace function pg_temp.run(dmg_a int, dmg_b int) returns text language plpgsql as $$
declare r uuid; s jsonb; c text;
begin
  perform pg_temp.as_user('a'); s := public.create_room(5,'STUDY'); r := (s->'room'->>'id')::uuid; c := s->'room'->>'code';
  perform pg_temp.as_user('b'); perform public.join_room(c); perform public.set_ready(r,true);
  perform pg_temp.as_user('a'); perform public.start_room(r);
  perform pg_temp.as_user('a'); perform public.heartbeat(r, dmg_a);
  perform pg_temp.as_user('b'); perform public.heartbeat(r, dmg_b);
  update public.rooms set ends_at = now() where id = r;
  perform pg_temp.as_user('a'); s := public.finish_room(r);
  perform pg_temp.as_user('a'); perform public.leave_room(r);
  update public.rooms set status='closed' where id=r;
  return dmg_a||'+'||dmg_b||' => '||(s->'room'->>'status')||' durability='||(s->'room'->>'durability')||' tier='||(s->'room'->>'building_tier');
end $$;
select pg_temp.run(0,0);
select pg_temp.run(10,0);
select pg_temp.run(20,10);
select pg_temp.run(30,0);
select pg_temp.run(45,0);
select pg_temp.run(45,15);
