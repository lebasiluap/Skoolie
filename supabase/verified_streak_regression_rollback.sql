-- Server UTC-day streak accounting. All fixtures roll back.
begin;
set local statement_timeout='10s';
do $test$
declare
 u uuid; p public.user_profiles%rowtype;
 today date:=(clock_timestamp() at time zone 'UTC')::date;
begin
 select up.id into u from public.user_profiles up where not exists(
  select 1 from app_private.verified_sessions vs where vs.user_id=up.id and vs.completed_at is not null) limit 1;
 if u is null then raise exception 'No profile fixture'; end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 delete from app_private.study_streak_days where user_id=u;
 insert into app_private.study_streak_days select u,today-i,'study' from generate_series(3,5) i;
 update public.user_profiles set streak_freezes=2 where id=u;
 perform app_private.advance_study_streak(u);
 select * into p from public.user_profiles where id=u;
 if p.current_streak<>3 or p.longest_streak<>3 or p.streak_freezes<>0 or cardinality(p.frozen_dates)<>2
    or p.last_active_date<>today-3 then raise exception 'Freeze coverage invented a day'; end if;
 insert into app_private.study_streak_days values(u,today,'study');
 perform app_private.advance_study_streak(u);
 select * into p from public.user_profiles where id=u;
 if p.current_streak<>4 or p.longest_streak<>4 then raise exception 'Study completion did not add exactly one';end if;
 perform app_private.advance_study_streak(u);
 select * into p from public.user_profiles where id=u;
 if p.current_streak<>4 or p.streak_freezes<>0 then raise exception 'Same-day replay failed'; end if;
 delete from app_private.study_streak_days where user_id=u;
 insert into app_private.study_streak_days select u,today-i,'study' from generate_series(3,5) i;
 insert into app_private.study_streak_days values(u,today,'study');
 update public.user_profiles set streak_freezes=1 where id=u;
 perform app_private.advance_study_streak(u);
 select * into p from public.user_profiles where id=u;
 if p.current_streak<>1 or p.streak_freezes<>1 then raise exception 'Insufficient freezes failed'; end if;
end $test$;
select 'PASS: freeze coverage, same-day replay, insufficient-freeze reset; ALL rolled back' result;
rollback;
