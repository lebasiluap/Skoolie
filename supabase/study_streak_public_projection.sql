-- Read-only projection for public profile/league cards. Viewing another user
-- never consumes their freezes or changes their progress.
create or replace function app_private.visible_study_streak(p_user uuid) returns integer
language sql stable security invoker set search_path='' as $fn$
 with days as (
  select day,kind,day-(row_number() over(order by day))::int as island
  from app_private.study_streak_days where user_id=p_user
  and day<=(now() at time zone 'UTC')::date
 ), latest as (
  select max(day) as last_day,count(*) filter(where kind='study')::int as earned
  from days group by island order by max(day) desc limit 1
 ) select coalesce((select case when l.last_day>=(now() at time zone 'UTC')::date-1
  or (now() at time zone 'UTC')::date-l.last_day-1<=coalesce(p.streak_freezes,0)
  then l.earned else 0 end from latest l join public.user_profiles p on p.id=p_user),0);
$fn$;
revoke all on function app_private.visible_study_streak(uuid) from public,anon,authenticated;
do $patch$
declare body text; signature text;
begin
 signature:='public.get_public_profile(uuid)';body:=pg_get_functiondef(signature::regprocedure);
 if strpos(body,'xp, level, current_streak, avatar_url')=0 then raise exception 'Unexpected profile contract';end if;
 execute replace(body,'xp, level, current_streak, avatar_url','xp, level, app_private.visible_study_streak(id) as current_streak, avatar_url');
 signature:='public.get_leaderboard(integer)';body:=pg_get_functiondef(signature::regprocedure);
 if strpos(body,'select id, full_name, xp, level, current_streak, last_active_date, avatar_url')=0 then raise exception 'Unexpected leaderboard contract';end if;
 execute replace(body,'select id, full_name, xp, level, current_streak, last_active_date, avatar_url',
 'select id, full_name, xp, level, app_private.visible_study_streak(id) as current_streak, last_active_date, avatar_url');
 signature:='public.get_weekly_league()';body:=pg_get_functiondef(signature::regprocedure);
 if strpos(body,'p.current_streak, p.last_active_date')=0 then raise exception 'Unexpected weekly contract';end if;
 execute replace(body,'p.current_streak, p.last_active_date','app_private.visible_study_streak(p.id) as current_streak, p.last_active_date');
end $patch$;
