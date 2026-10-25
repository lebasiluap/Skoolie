-- One UTC study day per immutable verified completion. Freezes bridge gaps,
-- never earn days. No Auth triggers, question serving changes or bank scans.
set lock_timeout='2s';
set statement_timeout='15s';
create table if not exists app_private.streak_legacy_snapshot as
select id,current_streak,longest_streak,last_active_date,streak_freezes,frozen_dates,
 clock_timestamp() as captured_at from public.user_profiles;
alter table app_private.streak_legacy_snapshot enable row level security;
revoke all on app_private.streak_legacy_snapshot from public,anon,authenticated;
create table if not exists app_private.study_streak_days (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null,
 kind text not null check(kind in ('study','freeze')),
 primary key(user_id,day)
);
alter table app_private.study_streak_days enable row level security;
revoke all on app_private.study_streak_days from public,anon,authenticated;

-- Existing verified receipts are the only evidence that can earn study days.
insert into app_private.study_streak_days(user_id,day,kind)
select distinct s.user_id,(s.completed_at at time zone 'UTC')::date,'study'
from app_private.verified_sessions s
join app_private.reward_receipts r on r.session_id=s.id and r.user_id=s.user_id
join public.quiz_sessions q on q.id=r.quiz_session_id and q.user_id=s.user_id
where s.completed_at is not null and q.completed_at is not null
on conflict(user_id,day) do update set kind='study';
insert into app_private.study_streak_days(user_id,day,kind)
select p.id,d,'freeze' from public.user_profiles p cross join lateral unnest(p.frozen_dates) d
where d<(clock_timestamp() at time zone 'UTC')::date
on conflict do nothing;

create or replace function app_private.reconcile_study_streak(p_user uuid) returns void
language plpgsql security invoker set search_path='' as $fn$
declare p public.user_profiles%rowtype; today date:=(clock_timestamp() at time zone 'UTC')::date;
 last_past date; chain_start date; gap integer; earned integer; best integer;
 last_event date; last_study date; frozen date[];
begin
 if auth.uid() is null or auth.uid()<>p_user then raise exception 'Profile ownership required' using errcode='42501'; end if;
 select * into p from public.user_profiles where id=p_user for update;
 if not found then return; end if;
 insert into app_private.study_streak_days(user_id,day,kind)
 select distinct s.user_id,(s.completed_at at time zone 'UTC')::date,'study'
 from app_private.verified_sessions s
 join app_private.reward_receipts r on r.session_id=s.id and r.user_id=s.user_id
 join public.quiz_sessions q on q.id=r.quiz_session_id and q.user_id=s.user_id
 where s.user_id=p_user and s.completed_at is not null and q.completed_at is not null
 on conflict(user_id,day) do update set kind='study' where study_streak_days.kind<>'study';
 select max(day) into last_past from app_private.study_streak_days where user_id=p_user and day<today;
 if last_past is not null then
  select max(d.day) into chain_start from app_private.study_streak_days d
  where d.user_id=p_user and d.day<=last_past and not exists(
   select 1 from app_private.study_streak_days prev where prev.user_id=p_user and prev.day=d.day-1);
  gap:=today-last_past-1;
  if gap>0 and gap<=coalesce(p.streak_freezes,0) and exists(
   select 1 from app_private.study_streak_days where user_id=p_user and kind='study' and day between chain_start and last_past) then
   insert into app_private.study_streak_days(user_id,day,kind)
    select p_user,last_past+i,'freeze' from generate_series(1,gap) i on conflict do nothing;
   p.streak_freezes:=p.streak_freezes-gap;
  end if;
 end if;
 with numbered as (
  select day,kind,day-(row_number() over(order by day))::int as island
  from app_private.study_streak_days where user_id=p_user and day<=today
 ), groups as (
  select max(day) as last_day,count(*) filter(where kind='study')::int as study_count
  from numbered group by island
 ) select coalesce(max(study_count) filter(where last_day>=today-1),0),coalesce(max(study_count),0),max(last_day)
 into earned,best,last_event from groups;
 select max(day) filter(where kind='study') into last_study from app_private.study_streak_days where user_id=p_user;
 select coalesce(array_agg(day order by day),'{}'::date[]) into frozen from (
  select day from app_private.study_streak_days where user_id=p_user and kind='freeze' order by day desc) f;
 update public.user_profiles set current_streak=earned,longest_streak=best,last_active_date=last_study,
 streak_freezes=p.streak_freezes,frozen_dates=frozen where id=p_user
 and row(current_streak,longest_streak,last_active_date,streak_freezes,frozen_dates)
 is distinct from row(earned,best,last_study,p.streak_freezes,frozen);
end $fn$;
revoke all on function app_private.reconcile_study_streak(uuid) from public,anon,authenticated;

create or replace function app_private.advance_study_streak(p_user uuid) returns void
language plpgsql security invoker set search_path='' as $fn$
begin perform app_private.reconcile_study_streak(p_user); end $fn$;
revoke all on function app_private.advance_study_streak(uuid) from public,anon,authenticated;

-- Run streak accounting AFTER the receipt and completion exist, in the same
-- transaction. Abort migration if the known completion contract has changed.
do $patch$
declare body text:=pg_get_functiondef('public.finish_verified_session(uuid,jsonb)'::regprocedure);
 old_call text:='perform app_private.advance_study_streak(uid);';
 tail text:='update app_private.verified_sessions set answers=p_answers,completed_at=completed where id=s.id;';
begin
 if strpos(body,old_call)=0 or strpos(body,tail)=0 then raise exception 'Unexpected completion contract';end if;
 body:=replace(body,old_call,'');
 body:=replace(body,tail,tail||E'\n perform app_private.advance_study_streak(uid);');
 execute body;
end $patch$;

-- Keep profile editing/onboarding intact, but reject client-authored streaks.
create or replace function public.guard_study_streak_v2() returns trigger
language plpgsql security invoker set search_path='' as $fn$
begin
 if current_user in ('anon','authenticated') and
 row(new.current_streak,new.longest_streak,new.last_active_date,new.streak_freezes,new.frozen_dates)
 is distinct from row(old.current_streak,old.longest_streak,old.last_active_date,old.streak_freezes,old.frozen_dates)
 then raise exception 'Study streaks are server verified' using errcode='42501';end if;
 return new;
end $fn$;
revoke all on function public.guard_study_streak_v2() from public,anon,authenticated;
create trigger guard_study_streak_v2 before update on public.user_profiles
for each row execute function public.guard_study_streak_v2();

create or replace function public.get_study_streak() returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='3s' as $fn$
declare uid uuid:=auth.uid(); result jsonb;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501';end if;
 perform app_private.reconcile_study_streak(uid);
 select jsonb_build_object('current_streak',current_streak,'longest_streak',longest_streak,
 'last_active_date',last_active_date,'streak_freezes',streak_freezes,'frozen_dates',frozen_dates,
 'today',(clock_timestamp() at time zone 'UTC')::date,
 'study_days',(select coalesce(jsonb_agg(day order by day),'[]'::jsonb)
 from app_private.study_streak_days where user_id=uid and kind='study'
 and day>=(clock_timestamp() at time zone 'UTC')::date-7)) into result
 from public.user_profiles where id=uid;
 return result;
end $fn$;
revoke all on function public.get_study_streak() from public,anon,authenticated;
grant execute on function public.get_study_streak() to authenticated;

-- Correct existing counters only from durable evidence; preserve old values
-- in the private snapshot. Never manufacture completions for legacy rows.
do $backfill$
declare uid uuid; old_sub text:=current_setting('request.jwt.claim.sub',true);
begin
 for uid in select id from public.user_profiles loop
  perform set_config('request.jwt.claim.sub',uid::text,true);
  perform app_private.reconcile_study_streak(uid);
 end loop;
 perform set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
end $backfill$;
