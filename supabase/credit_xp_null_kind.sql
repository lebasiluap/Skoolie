-- Preserve existing function identity, signature, permissions and reward formula.
-- SQL NOT IN yields NULL for a NULL input; explicitly reject that bypass.
CREATE OR REPLACE FUNCTION public.credit_xp(p_kind text, p_score integer, p_total integer, p_timed boolean DEFAULT false, p_bonus integer DEFAULT 0, p_slot integer DEFAULT 0)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_base int;
  v_xp int;
  v_slot smallint := least(greatest(coalesce(p_slot, 0), 0), 1);
  v_week date := date_trunc('week', now())::date;
  v_prev_week date := (date_trunc('week', now()) - interval '7 days')::date;
  v_league text := 'bronze';
  v_prof text;
  v_boost_until timestamptz;
  v_prev league_standings%rowtype;
  v_rank int;
  v_cohort int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_kind is null or p_kind not in ('mcq','case_study','rapid_fire','barrage','daily_challenge') then
    raise exception 'invalid kind %', p_kind;
  end if;
  if p_total is null or p_total < 1 or p_total > 60 then
    return 0;
  end if;

  if p_kind = 'barrage' then
    insert into barrage_claims (user_id, day, slot) values (v_uid, current_date, v_slot)
    on conflict (user_id, day, slot) do nothing;
    if not found then
      return 0;
    end if;
    if (select count(*) from barrage_claims where user_id = v_uid) % 5 = 0 then
      update user_profiles set streak_freezes = streak_freezes + 1 where id = v_uid;
    end if;
  end if;

  if p_kind = 'daily_challenge' then
    insert into challenge_claims (user_id, day, score, total, completed)
    values (v_uid, current_date, least(greatest(coalesce(p_score, 0), 0), p_total), p_total, true)
    on conflict (user_id, day) do update
      set score = excluded.score, total = excluded.total, completed = true
      where challenge_claims.completed = false;
    if not found then
      return 0;
    end if;
  end if;

  v_base := round((least(greatest(coalesce(p_score, 0), 0), p_total)::numeric / p_total) * 50);
  v_xp := case when coalesce(p_timed, false) then round(v_base * 1.10) else v_base end;
  if p_kind = 'barrage' then
    v_xp := v_xp * 2;
  end if;
  if p_kind in ('rapid_fire','barrage') then
    v_xp := v_xp + least(greatest(coalesce(p_bonus, 0), 0), 25);
  end if;
  if p_kind = 'daily_challenge' then
    v_xp := round((least(greatest(coalesce(p_score, 0), 0), p_total)::numeric / p_total) * 30) + 10;
  end if;

  select profession, xp_boost_until into v_prof, v_boost_until from user_profiles where id = v_uid;
  if v_boost_until is not null and v_boost_until > now() then
    v_xp := round(v_xp * 1.5);
  end if;

  if p_kind = 'daily_challenge' then
    update challenge_claims set xp = v_xp where user_id = v_uid and day = current_date;
  end if;
  if p_kind = 'barrage' then
    update barrage_claims set xp = v_xp where user_id = v_uid and day = current_date and slot = v_slot;
  end if;

  update user_profiles
     set xp = xp + v_xp,
         level = floor((xp + v_xp) / 400.0)::int + 1
   where id = v_uid;

  if not exists (select 1 from league_standings where user_id = v_uid and week_start = v_week) then
    select * into v_prev from league_standings where user_id = v_uid and week_start = v_prev_week;
    if found then
      v_league := v_prev.league;
      select count(*) + 1 into v_rank from league_standings ls
        join user_profiles up on up.id = ls.user_id
       where ls.week_start = v_prev_week and ls.league = v_prev.league
         and up.profession = v_prof
         and (ls.week_xp > v_prev.week_xp
              or (ls.week_xp = v_prev.week_xp and ls.updated_at < v_prev.updated_at));
      select count(*) into v_cohort from league_standings ls
        join user_profiles up on up.id = ls.user_id
       where ls.week_start = v_prev_week and ls.league = v_prev.league
         and up.profession = v_prof;
      if v_rank <= league_effective_promote(v_prev.league, v_cohort) and v_prev.week_xp > 0 then
        v_league := case v_prev.league
          when 'bronze' then 'silver' when 'silver' then 'gold' else 'diamond' end;
      elsif v_cohort >= 10 and v_rank > v_cohort - 3 then
        v_league := case v_prev.league
          when 'diamond' then 'gold' when 'gold' then 'silver' else 'bronze' end;
      end if;
    end if;
    insert into league_standings (user_id, week_start, league, week_xp)
    values (v_uid, v_week, v_league, v_xp)
    on conflict (user_id, week_start)
    do update set week_xp = league_standings.week_xp + excluded.week_xp, updated_at = now();
  else
    update league_standings
       set week_xp = week_xp + v_xp, updated_at = now()
     where user_id = v_uid and week_start = v_week;
  end if;

  return v_xp;
end;
$function$
;
