-- Compatibility boundary for existing mobile clients: accept their legitimate
-- progress transitions, but never arbitrary streak/freezes/tier jumps.
-- This does NOT prove a human completed a quiz: legacy sessions are still
-- client-authored. Full anti-cheat requires a separate issued-session contract.
set lock_timeout='2s';
set statement_timeout='10s';
create or replace function public.guard_profile_progress_fields()
returns trigger language plpgsql security invoker set search_path='' as $fn$
declare
  gap integer;
  expected_streak integer;
  expected_frozen date[];
  recorded_distinct bigint;
begin
  if current_user not in ('anon','authenticated') or public.is_admin() then return new; end if;
  if row(new.current_streak,new.longest_streak,new.last_active_date,new.streak_freezes,new.frozen_dates)
     is distinct from row(old.current_streak,old.longest_streak,old.last_active_date,old.streak_freezes,old.frozen_dates) then
    if new.streak_freezes is null or new.streak_freezes<0 then
      raise exception 'Invalid freeze balance' using errcode='22023';
    end if;
    if row(new.streak_freezes,new.frozen_dates) is distinct from row(old.streak_freezes,old.frozen_dates) then
      -- Existing clients spend exactly the missed days and move last activity
      -- to local yesterday. Allow global timezone boundaries, not arbitrary dates.
      gap:=new.last_active_date-old.last_active_date;
      if gap is null or gap<1 or gap>coalesce(old.streak_freezes,0)
         or coalesce(old.current_streak,0)<1
         or new.last_active_date not between (now() at time zone 'UTC')::date-2 and (now() at time zone 'UTC')::date
         or new.streak_freezes<>old.streak_freezes-gap then
        raise exception 'Invalid freeze consumption' using errcode='22023';
      end if;
      select coalesce(array_agg(x.day order by x.ord),'{}'::date[]) into expected_frozen
      from (select day,ord from unnest(coalesce(old.frozen_dates,'{}'::date[]) ||
        array(select old.last_active_date+i from generate_series(1,gap) i)) with ordinality as a(day,ord)
        order by ord desc limit 60) x;
      expected_streak:=old.current_streak+gap;
      if new.frozen_dates is distinct from expected_frozen then
        raise exception 'Invalid frozen dates' using errcode='22023';
      end if;
    else
      if new.last_active_date is null or new.last_active_date not between
          (now() at time zone 'UTC')::date-1 and (now() at time zone 'UTC')::date+1
          or (old.last_active_date is not null and new.last_active_date<old.last_active_date) then
        raise exception 'Invalid activity date' using errcode='22023';
      end if;
      expected_streak:=case when old.last_active_date=new.last_active_date then coalesce(old.current_streak,0)
        when old.last_active_date=new.last_active_date-1 then coalesce(old.current_streak,0)+1 else 1 end;
    end if;
    if new.current_streak is distinct from expected_streak
       or new.longest_streak is distinct from greatest(coalesce(old.longest_streak,0),expected_streak) then
      raise exception 'Invalid streak transition' using errcode='22023';
    end if;
  end if;
  if row(new.tier,new.tier_score) is distinct from row(old.tier,old.tier_score) then
    -- tierScore never exceeds distinct answered IDs. No bank scan; indexed
    -- lookup of this user's saved sessions only. Preserve historical ranks.
    select count(distinct qid) into recorded_distinct
    from public.quiz_sessions s cross join lateral unnest(s.question_ids) qid where s.user_id=old.id;
    if new.tier_score is null or new.tier is null or new.tier<coalesce(old.tier,0)
       or new.tier_score<coalesce(old.tier_score,0)
       or new.tier_score>greatest(coalesce(old.tier_score,0),recorded_distinct)
       or (new.tier>coalesce(old.tier,0) and 10::numeric*new.tier*(new.tier+1::numeric)>new.tier_score) then
      raise exception 'Tier exceeds recorded progress' using errcode='22023';
    end if;
  end if;
  return new;
end $fn$;
revoke all on function public.guard_profile_progress_fields() from public,anon,authenticated;
create trigger guard_profile_progress_fields before update on public.user_profiles
for each row execute function public.guard_profile_progress_fields();

-- Restrictive rules remain AND-ed with all permissive policies, including
-- admin policies; do not accidentally turn these into permissive OR checks.
alter policy strict_audit_clearance_questions on public.questions_base
using (exists(select 1 from public.audit_serving_clearance s where s.content_type='question' and s.content_id=questions_base.id)
  and not exists(select 1 from public.content_quarantine q where q.content_type='question' and q.content_id=questions_base.id));
alter policy strict_audit_clearance_cases on public.case_studies_base
using (exists(select 1 from public.audit_serving_clearance s where s.content_type='case_study' and s.content_id=case_studies_base.id)
  and not exists(select 1 from public.content_quarantine q where q.content_type='case_study' and q.content_id=case_studies_base.id));

-- These DDL capabilities have no app API use; RLS does not govern TRUNCATE.
revoke truncate,references,trigger on all tables in schema public from public,anon,authenticated;
