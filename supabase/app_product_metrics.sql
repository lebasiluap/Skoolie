-- Isolated first-party usage aggregates. Never read by Auth, serving or rewards.
create table app_private.app_metrics_control(singleton boolean primary key default true check(singleton),enabled boolean not null default false);
insert into app_private.app_metrics_control(singleton,enabled) values(true,false);
alter table app_private.app_metrics_control enable row level security;
revoke all on app_private.app_metrics_control from public,anon,authenticated;
create table app_private.app_usage_daily (
 user_id uuid not null references auth.users(id) on delete cascade,
 activity_date date not null,
 platform text not null,
 version text not null,
 build text not null,
 screen text not null,
 recent_seconds numeric not null default 0,
 quiet_seconds numeric not null default 0,
 idle_seconds numeric not null default 0,
 views bigint not null default 0,
 touches bigint not null default 0,
 answers bigint not null default 0,
 flips bigint not null default 0,
 completions bigint not null default 0,
 primary key(user_id,activity_date,platform,version,build,screen)
);
create index app_usage_retention on app_private.app_usage_daily(activity_date);
alter table app_private.app_usage_daily enable row level security;
revoke all on app_private.app_usage_daily from public,anon,authenticated;
create table app_private.app_usage_cursors (
 session_id uuid primary key references app_private.beta_activity_sessions(id) on delete cascade,
 last_sequence integer not null,
 last_received_at timestamptz not null
);
create index app_usage_cursor_retention on app_private.app_usage_cursors(last_received_at);
alter table app_private.app_usage_cursors enable row level security;
revoke all on app_private.app_usage_cursors from public,anon,authenticated;

create function public.record_app_metrics(p_session_id uuid,p_sequence integer,p_rows jsonb)
returns void language plpgsql security definer set search_path='' set statement_timeout='1500ms' as $fn$
declare uid uuid:=auth.uid(); t timestamptz:=clock_timestamp(); s app_private.beta_activity_sessions;
 c app_private.app_usage_cursors; r jsonb; k text; elapsed numeric; total_ms numeric:=0; factor numeric;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501';end if;
 if not coalesce((select enabled from app_private.app_metrics_control where singleton),false) then return;end if;
 if p_session_id is null or p_sequence is null or p_sequence not between 1 and 100000
 or p_rows is null or jsonb_typeof(p_rows)<>'array' or octet_length(p_rows::text)>8000
 or jsonb_array_length(p_rows) not between 1 and 16 then raise exception 'Invalid metrics' using errcode='22023';end if;
 for r in select value from jsonb_array_elements(p_rows) loop
  if jsonb_typeof(r)<>'object' or (select count(*) from jsonb_object_keys(r))<>9
  or not(r ?& array['screen','recent_ms','quiet_ms','idle_ms','views','touches','answers','flips','completions'])
  or coalesce(r->>'screen','') not in ('dashboard','practice','mcq','flashcards','rapid-fire','cases','progress','insights','leaderboard','profile','settings','history','bookmarks','other') then
   raise exception 'Invalid metric fields' using errcode='22023';end if;
  foreach k in array array['recent_ms','quiet_ms','idle_ms','views','touches','answers','flips','completions'] loop
   if jsonb_typeof(r->k)<>'number' or (r->>k)!~'^[0-9]{1,6}$' then raise exception 'Invalid metric value' using errcode='22023';end if;
   if k in ('views','touches','answers','flips','completions') and (r->>k)::int>1000 then raise exception 'Metric count limit' using errcode='22023';end if;
  end loop;
  total_ms:=total_ms+(r->>'recent_ms')::numeric+(r->>'quiet_ms')::numeric+(r->>'idle_ms')::numeric;
 end loop;
 if total_ms>90000 or (select count(distinct value->>'screen') from jsonb_array_elements(p_rows))<>jsonb_array_length(p_rows) then
  raise exception 'Metric bounds exceeded' using errcode='22023';end if;
 -- Never wait behind other activity work; dropping a sample is safer than a queue.
 if not pg_try_advisory_xact_lock(hashtextextended(uid::text||':beta-activity',0)) then return;end if;
 select * into s from app_private.beta_activity_sessions where id=p_session_id;
 if not found or s.user_id<>uid then raise exception 'Metrics ownership mismatch' using errcode='42501';end if;
 if s.end_reason='superseded' or s.last_seen_at<t-interval '90 seconds' then return;end if;
 select * into c from app_private.app_usage_cursors where session_id=p_session_id;
 if found and p_sequence<=c.last_sequence then return;end if;
 elapsed:=extract(epoch from t-coalesce(c.last_received_at,s.started_at));
 -- Accept one short final background sample; regular writes are rate limited.
 if elapsed<10 and not(s.ended_at is not null and t-s.ended_at<interval '15 seconds' and (c.last_received_at is null or c.last_received_at<s.ended_at)) then return;end if;
 insert into app_private.app_usage_cursors values(p_session_id,p_sequence,t)
 on conflict(session_id) do update set last_sequence=excluded.last_sequence,last_received_at=excluded.last_received_at;
 -- Suspension/network gaps are unknown, not credited as activity.
 if elapsed>90 then return;end if;
 factor:=case when total_ms>0 then least(1,elapsed*1000/total_ms) else 0 end;
  insert into app_private.app_usage_daily(user_id,activity_date,platform,version,build,screen,recent_seconds,quiet_seconds,idle_seconds,views,touches,answers,flips,completions)
  select uid,(t at time zone 'UTC')::date,s.platform,s.version,s.build,x.screen,
   x.recent_ms*factor/1000,x.quiet_ms*factor/1000,x.idle_ms*factor/1000,x.views,x.touches,x.answers,x.flips,x.completions
  from jsonb_to_recordset(p_rows) as x(screen text,recent_ms numeric,quiet_ms numeric,idle_ms numeric,views bigint,touches bigint,answers bigint,flips bigint,completions bigint)
  on conflict(user_id,activity_date,platform,version,build,screen) do update set
   recent_seconds=app_usage_daily.recent_seconds+excluded.recent_seconds,
   quiet_seconds=app_usage_daily.quiet_seconds+excluded.quiet_seconds,
   idle_seconds=app_usage_daily.idle_seconds+excluded.idle_seconds,
   views=app_usage_daily.views+excluded.views,touches=app_usage_daily.touches+excluded.touches,
   answers=app_usage_daily.answers+excluded.answers,flips=app_usage_daily.flips+excluded.flips,completions=app_usage_daily.completions+excluded.completions;
end $fn$;
revoke all on function public.record_app_metrics(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.record_app_metrics(uuid,integer,jsonb) to authenticated;

create function public.admin_app_metrics(p_days integer default 7)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='2s' as $fn$
declare cutoff date;
begin
 if public.is_admin() is distinct from true then raise exception 'Admin access required' using errcode='42501';end if;
 if p_days is null or p_days not between 1 and 30 then raise exception 'Invalid period' using errcode='22023';end if;
 cutoff:=(clock_timestamp() at time zone 'UTC')::date-(p_days-1);
 return jsonb_build_object('measured_at',clock_timestamp(),'days',p_days,'collection_enabled',(select enabled from app_private.app_metrics_control where singleton),
 'oldest_summary_date',(select min(activity_date) from app_private.app_usage_daily),
 'oldest_foreground_session',(select min(last_seen_at) from app_private.beta_activity_sessions),'summary',(
  select jsonb_build_object('users',count(distinct user_id),'recent_seconds',coalesce(sum(recent_seconds),0),'quiet_seconds',coalesce(sum(quiet_seconds),0),'idle_seconds',coalesce(sum(idle_seconds),0),'views',coalesce(sum(views),0),'answers',coalesce(sum(answers),0),'flips',coalesce(sum(flips),0),'completions',coalesce(sum(completions),0))
  from app_private.app_usage_daily where activity_date>=cutoff
 ),'screens',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
  select screen,count(distinct user_id) users,sum(recent_seconds) recent_seconds,sum(quiet_seconds) quiet_seconds,sum(idle_seconds) idle_seconds,sum(views) views,sum(touches) touches,sum(answers) answers,sum(flips) flips,sum(completions) completions
  from app_private.app_usage_daily where activity_date>=cutoff group by screen order by screen)x),
 'daily',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
  select activity_date,count(distinct user_id) users,sum(recent_seconds) recent_seconds,sum(quiet_seconds) quiet_seconds,sum(idle_seconds) idle_seconds
  from app_private.app_usage_daily where activity_date>=cutoff group by activity_date order by activity_date)x));
end $fn$;
revoke all on function public.admin_app_metrics(integer) from public,anon,authenticated;
grant execute on function public.admin_app_metrics(integer) to authenticated;

create function app_private.purge_app_metrics() returns void language plpgsql security definer
set search_path='' set statement_timeout='2s' as $fn$
declare started timestamptz:=clock_timestamp(); n integer; total integer;
begin
 loop
 total:=0;
 delete from app_private.app_usage_daily where (user_id,activity_date,platform,version,build,screen) in (
  select user_id,activity_date,platform,version,build,screen from app_private.app_usage_daily
  where activity_date<(clock_timestamp() at time zone 'UTC')::date-29 order by activity_date limit 1000);
 get diagnostics n=row_count;total:=total+n;
 delete from app_private.app_usage_cursors where session_id in (
  select session_id from app_private.app_usage_cursors where last_received_at<clock_timestamp()-interval '30 days' order by last_received_at limit 1000);
 get diagnostics n=row_count;total:=total+n;
 delete from app_private.beta_interaction_batches where (session_id,sequence) in (
  select session_id,sequence from app_private.beta_interaction_batches where received_at<clock_timestamp()-interval '30 days' order by received_at limit 1000);
 get diagnostics n=row_count;total:=total+n;
 delete from app_private.beta_activity_sessions where id in (
  select id from app_private.beta_activity_sessions where started_at<clock_timestamp()-interval '30 days'
  and last_seen_at<clock_timestamp()-interval '30 days' order by started_at limit 100);
 get diagnostics n=row_count;total:=total+n;
 exit when total=0 or clock_timestamp()-started>interval '1 second';
 end loop;
end $fn$;
revoke all on function app_private.purge_app_metrics() from public,anon,authenticated;
select cron.schedule('purge-app-metrics','*/15 * * * *','select app_private.purge_app_metrics()');
