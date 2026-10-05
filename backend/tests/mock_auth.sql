-- 로컬 PostgreSQL에서 Supabase 없이 마이그레이션을 시험하기 위한 최소 모형 (auth 스키마와 역할)
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
