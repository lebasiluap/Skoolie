-- Additive, private telemetry. Never called by an Auth trigger or serving gate.
create table if not exists app_private.beta_tester_assignments (
 email text primary key check(email=lower(email)),
 platform text not null check(platform in ('Android','iOS')),
 session_one date not null,
 session_two date not null check(session_two>session_one)
);
alter table app_private.beta_tester_assignments enable row level security;
revoke all on app_private.beta_tester_assignments from public,anon,authenticated;
create table if not exists app_private.beta_activity_sessions (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 platform text not null check(platform in ('ios','android','web')),
 version text not null check(length(version) between 1 and 32),
 build text not null check(length(build) between 1 and 32),
 started_at timestamptz not null,
 last_seen_at timestamptz not null,
 ended_at timestamptz,
 end_reason text check(end_reason in ('background','superseded')),
 observed_seconds integer not null default 0 check(observed_seconds>=0)
);
create index if not exists beta_activity_user_time on app_private.beta_activity_sessions(user_id,started_at desc);
create index if not exists beta_activity_time on app_private.beta_activity_sessions(started_at desc);
alter table app_private.beta_activity_sessions enable row level security;
revoke all on app_private.beta_activity_sessions from public,anon,authenticated;

create or replace function public.record_beta_activity(p_session_id uuid,p_event text,p_platform text,p_version text,p_build text)
returns void language plpgsql security definer set search_path='' set statement_timeout='2s' as $fn$
declare uid uuid:=auth.uid(); t timestamptz:=clock_timestamp(); s app_private.beta_activity_sessions; gap numeric;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_session_id is null or p_event is null or p_event not in ('start','beat','end')
 or p_platform is null or p_platform not in ('ios','android','web')
 or p_version is null or length(p_version) not between 1 and 32
 or p_build is null or length(p_build) not between 1 and 32 then raise exception 'Invalid activity' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':beta-activity',0));
 select * into s from app_private.beta_activity_sessions where id=p_session_id for update;
 if found then
  if s.user_id<>uid or s.platform<>p_platform then raise exception 'Activity binding mismatch' using errcode='42501'; end if;
  if s.ended_at is not null or p_event='start' then return; end if;
  gap:=extract(epoch from t-s.last_seen_at);
  if p_event='beat' and gap<20 then return; end if;
  -- Gaps over 90 s are not credited. This measures observed foreground time,
  -- not attention, human identity or payment eligibility. No client timestamps.
  update app_private.beta_activity_sessions set last_seen_at=t,
   ended_at=case when p_event='end' then t else null end,
   end_reason=case when p_event='end' then 'background' else null end,
   observed_seconds=observed_seconds+case when gap between 0 and 90 then floor(gap)::int else 0 end
   where id=p_session_id;
 else
  if p_event<>'start' then return; end if;
  if (select count(*) from app_private.beta_activity_sessions where user_id=uid and started_at>=t-interval '24 hours')>=240 then
   raise exception 'Activity limit reached' using errcode='54000'; end if;
  -- Prevent concurrent devices from double-counting this user's observed time.
  update app_private.beta_activity_sessions set ended_at=last_seen_at,end_reason='superseded'
   where user_id=uid and ended_at is null;
  insert into app_private.beta_activity_sessions(id,user_id,platform,version,build,started_at,last_seen_at)
   values(p_session_id,uid,p_platform,p_version,p_build,t,t);
 end if;
end $fn$;
revoke all on function public.record_beta_activity(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.record_beta_activity(uuid,text,text,text,text) to authenticated;

create or replace function public.admin_beta_activity() returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='3s' as $fn$
begin
 if public.is_admin() is distinct from true then raise exception 'Admin access required' using errcode='42501'; end if;
 return jsonb_build_object('measured_at',clock_timestamp(),'assignments',(
  select coalesce(jsonb_agg(x order by session_one,email),'[]'::jsonb) from (
   select a.*,u.id is not null as registered,u.last_sign_in_at,
    (select max(s.last_seen_at) from app_private.beta_activity_sessions s where s.user_id=u.id) as last_tracked_at
   from app_private.beta_tester_assignments a left join auth.users u on lower(u.email)=a.email
  )x),'sessions',(
  select coalesce(jsonb_agg(x order by started_at desc),'[]'::jsonb) from (
   select s.id,u.email,p.full_name,s.platform,s.version,s.build,s.started_at,s.last_seen_at,s.ended_at,s.observed_seconds,
    case when s.end_reason='superseded' then 'Superseded (end = last seen)' when s.ended_at is not null then 'Ended' when s.last_seen_at>clock_timestamp()-interval '90 seconds' then 'Foreground recently' else 'Interrupted / end not recorded' end status
   from app_private.beta_activity_sessions s join auth.users u on u.id=s.user_id
   left join public.user_profiles p on p.id=s.user_id
   where s.started_at>=clock_timestamp()-interval '30 days'
   order by s.started_at desc limit 500
  )x));
end $fn$;
revoke all on function public.admin_beta_activity() from public,anon,authenticated;
grant execute on function public.admin_beta_activity() to authenticated;
