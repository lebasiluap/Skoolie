-- Small, bounded telemetry writes; never called from an Auth trigger.
create table public.app_presence (
 user_id uuid not null references auth.users(id) on delete cascade,
 platform text not null check(platform in ('ios','android','web')),
 version text not null check(length(version) between 1 and 32),
 build text not null check(length(build) between 1 and 32),
 last_seen_at timestamptz not null default now(),
 primary key(user_id,platform)
);
create table public.app_client_metrics (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null, platform text not null, version text not null, build text not null,
 operation text not null, calls bigint not null, failures bigint not null,
 total_ms bigint not null, max_ms integer not null,
 primary key(user_id,day,platform,version,build,operation)
);
alter table public.app_presence enable row level security;
alter table public.app_client_metrics enable row level security;
revoke all on public.app_presence,public.app_client_metrics from public,anon,authenticated;
grant select on public.app_presence,public.app_client_metrics to authenticated;
create policy "Admin activity visibility" on public.app_presence for select to authenticated using ((select public.is_admin()));
create policy "Admin performance visibility" on public.app_client_metrics for select to authenticated using ((select public.is_admin()));

create or replace function public.record_app_presence(p_platform text,p_version text,p_build text,p_metrics jsonb default '[]')
returns void language plpgsql security definer set search_path='' set statement_timeout='2s' as $fn$
declare uid uuid:=auth.uid(); m jsonb; previous_seen timestamptz;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_platform is null or p_platform not in ('ios','android','web') or p_version is null or length(p_version) not between 1 and 32 or p_build is null or length(p_build) not between 1 and 32
 or jsonb_typeof(p_metrics) is distinct from 'array' or jsonb_array_length(p_metrics)>9 then raise exception 'Invalid telemetry' using errcode='22023'; end if;
 -- Serialize only this user's tiny record and throttle to one write / 30 s.
 -- No bank scan, auth-table write, client-supplied user id or timestamp.
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':presence',0));
 select last_seen_at into previous_seen from public.app_presence where user_id=uid and platform=p_platform;
 if previous_seen>now()-interval '30 seconds' then return; end if;
 for m in select value from jsonb_array_elements(p_metrics) loop
  if m->>'operation' is null or m->>'operation' not in ('auth_request','profile_read','practice_counts','topic_counts','mcq_load','question_load','flashcard_load','case_load','rapid_fire_load')
   or coalesce(m->>'calls','') !~ '^[0-9]{1,4}$' or coalesce(m->>'failures','') !~ '^[0-9]{1,4}$'
   or coalesce(m->>'total_ms','') !~ '^[0-9]{1,9}$' or coalesce(m->>'max_ms','') !~ '^[0-9]{1,6}$'
   then raise exception 'Invalid metric' using errcode='22023'; end if;
  if (m->>'calls')::int not between 1 and 1000 or (m->>'failures')::int>(m->>'calls')::int or (m->>'max_ms')::int>120000 or (m->>'total_ms')::bigint>120000*(m->>'calls')::int then raise exception 'Invalid metric bounds' using errcode='22023'; end if;
  insert into public.app_client_metrics as c values(uid,(now() at time zone 'UTC')::date,p_platform,p_version,p_build,m->>'operation',(m->>'calls')::int,(m->>'failures')::int,(m->>'total_ms')::bigint,(m->>'max_ms')::int)
  on conflict(user_id,day,platform,version,build,operation) do update set calls=c.calls+excluded.calls,failures=c.failures+excluded.failures,total_ms=c.total_ms+excluded.total_ms,max_ms=greatest(c.max_ms,excluded.max_ms);
 end loop;
 insert into public.app_presence values(uid,p_platform,p_version,p_build,now()) on conflict(user_id,platform) do update set version=excluded.version,build=excluded.build,last_seen_at=excluded.last_seen_at;
 update public.user_profiles set last_seen_at=now() where id=uid and (last_seen_at is null or last_seen_at<now()-interval '30 seconds');
 -- Bounded per-user retention. No periodic full-table cleanup on login.
 delete from public.app_client_metrics where user_id=uid and day<(now() at time zone 'UTC')::date-30;
end $fn$;
revoke all on function public.record_app_presence(text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.record_app_presence(text,text,text,jsonb) to authenticated;

create or replace function public.admin_app_activity() returns jsonb language plpgsql security definer
set search_path='' set statement_timeout='3s' as $fn$
declare result jsonb;
begin
 if public.is_admin() is distinct from true then raise exception 'Admin access required' using errcode='42501'; end if;
 select jsonb_build_object('measured_at',now(),
 'people',(select coalesce(jsonb_agg(x order by last_sign_in_at desc nulls last),'[]') from (
  select p.id,p.full_name,u.last_sign_in_at,p.last_seen_at,
   (select max(a.last_seen_at) from public.app_presence a where a.user_id=p.id) app_last_seen_at
  from public.user_profiles p join auth.users u on u.id=p.id
  order by u.last_sign_in_at desc nulls last limit 500)x),
 'builds',(select coalesce(jsonb_agg(x order by last_seen_at desc),'[]') from (
  select platform,version,build,count(*) users,max(last_seen_at) last_seen_at,
   count(*) filter(where last_seen_at>=now()-interval '5 minutes') recently_active
  from public.app_presence where last_seen_at>=now()-interval '30 days' group by platform,version,build)x),
 'performance',(select coalesce(jsonb_agg(x order by operation,platform),'[]') from (
  select operation,platform,version,build,sum(calls) calls,sum(failures) failures,
   round(sum(total_ms)::numeric/nullif(sum(calls),0)) mean_ms,max(max_ms) max_ms
  from public.app_client_metrics where day>=(now() at time zone 'UTC')::date-6 group by operation,platform,version,build)x),
 'bots',(select jsonb_build_object('total',count(*),'active',count(*) filter(where active),'usernames',count(*) filter(where first_name ~ '[_.0-9]'),'full_names',count(*) filter(where first_name like '% %')) from public.league_bots)) into result;
 return result;
end $fn$;
revoke all on function public.admin_app_activity() from public,anon,authenticated;
grant execute on function public.admin_app_activity() to authenticated;
