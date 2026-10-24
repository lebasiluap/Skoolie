-- Server UTC-day streak accounting. All fixtures roll back.
begin;
set local statement_timeout='10s';
do $test$
declare
 u uuid; p public.user_profiles%rowtype;
 today date:=(clock_timestamp() at time zone 'UTC')::date;
begin
 select id into u from public.user_profiles limit 1;
 if u is null then raise exception 'No profile fixture'; end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 update public.user_profiles set current_streak=3,longest_streak=3,
   last_active_date=today-3,streak_freezes=2,frozen_dates='{}' where id=u;
 perform app_private.advance_study_streak(u);
 select * into p from public.user_profiles where id=u;
 if p.current_streak<>6 or p.streak_freezes<>0 or cardinality(p.frozen_dates)<>2
    or p.last_active_date<>today then raise exception 'Freeze coverage failed'; end if;
 perform app_private.advance_study_streak(u);
 select * into p from public.user_profiles where id=u;
 if p.current_streak<>6 or p.streak_freezes<>0 then raise exception 'Same-day replay failed'; end if;
 update public.user_profiles set current_streak=3,longest_streak=3,
   last_active_date=today-3,streak_freezes=1,frozen_dates='{}' where id=u;
 perform app_private.advance_study_streak(u);
 select * into p from public.user_profiles where id=u;
 if p.current_streak<>1 or p.streak_freezes<>1 then raise exception 'Insufficient freezes failed'; end if;
end $test$;
select 'PASS: freeze coverage, same-day replay, insufficient-freeze reset; ALL rolled back' result;
rollback;
