-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE LAB · DAILY QUESTS + WEEKLY CHEST — STAGED MIGRATION (DO NOT APPLY)
--
-- 3 quests/day, deterministically seeded per (user, day) from a template
-- pool. Progress is computed SERVER-side from existing tables (quiz_sessions,
-- challenge_claims) inside quest_today() — the client renders, never counts,
-- so nothing can drift. Completing all 3 marks the day in quest_days; 5+
-- marked days inside a league week (ISO Monday, matching date_trunc('week'))
-- unlocks the weekly chest, granted ONCE by quest_week_chest(): +100 XP
-- (profile credit-style: xp + level, XP_PER_LEVEL=400) and +1 streak freeze.
--
-- Chest XP is deliberately LEAGUE-NEUTRAL (no league_standings write) — it's
-- a meta-reward like trophy XP, not practice, so it can't tilt weekly boards.
--
-- "Day" here is the server's current_date (UTC) — the same boundary for
-- everyone, immune to device-clock games. Additive only; namespaced quest_*;
-- RLS owner-scoped; writes only via SECURITY DEFINER RPCs (search_path
-- pinned, EXECUTE revoked from anon/public).
--
-- Depends on live tables: quiz_sessions (question_ids, score, xp_earned,
-- mode, started_at), challenge_claims (user_id, day), user_profiles
-- (xp, level, streak_freezes).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Tables ──────────────────────────────────────────────────────────────────

-- One row per fully-completed quest day (all 3 done). Written by quest_today().
create table if not exists quest_days (
  user_id uuid not null references user_profiles(id) on delete cascade,
  day date not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- One chest per user per league week — the primary key IS the idempotency.
create table if not exists quest_chest_claims (
  user_id uuid not null references user_profiles(id) on delete cascade,
  week_start date not null,
  xp_granted integer not null,
  freezes_granted integer not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table quest_days enable row level security;
alter table quest_chest_claims enable row level security;

drop policy if exists "Own quest days" on quest_days;
create policy "Own quest days" on quest_days for select using (auth.uid() = user_id);
drop policy if exists "Own chest claims" on quest_chest_claims;
create policy "Own chest claims" on quest_chest_claims for select using (auth.uid() = user_id);

revoke all on quest_days from public, anon, authenticated;
revoke all on quest_chest_claims from public, anon, authenticated;
grant select on quest_days to authenticated;
grant select on quest_chest_claims to authenticated;

-- ─── quest_today() → jsonb ───────────────────────────────────────────────────
-- Returns today's 3 quests with LIVE progress + the week/chest state, and (as
-- a side effect) marks the day in quest_days the moment all 3 are complete.
--
-- Template pool (kind → measured from quiz_sessions unless noted):
--   answered  · questions answered today        (sum of question_ids lengths)
--   correct   · correct answers today           (sum of score)
--   cases     · case-study sessions finished    (mode = 'case_study')
--   rapid     · rapid-fire/barrage runs         (mode in rapid_fire|barrage)
--   xp        · XP earned today                 (sum of xp_earned)
--   challenge · Today's Challenge completed     (challenge_claims)
--
-- Seeding: md5(uid:day || template key) orders the pool; DISTINCT ON (kind)
-- first (so "Answer 15" and "Answer 25" never appear together), then the top
-- 3 kinds win. Same user + same day = same 3 quests on every call/device.

create or replace function quest_today()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := current_date;
  v_seed text;
  v_week date := date_trunc('week', current_date)::date;
  -- today's tallies (one pass over quiz_sessions)
  v_answered integer := 0;
  v_correct integer := 0;
  v_cases integer := 0;
  v_rapid integer := 0;
  v_xp integer := 0;
  v_challenge boolean := false;
  v_quests jsonb;
  v_all_done boolean;
  v_week_days jsonb;
  v_days_count integer;
  v_chest_claimed boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  v_seed := v_uid::text || ':' || v_day::text;

  select
    coalesce(sum(coalesce(array_length(question_ids, 1), 0)), 0),
    coalesce(sum(score), 0),
    count(*) filter (where mode = 'case_study'),
    count(*) filter (where mode in ('rapid_fire', 'barrage')),
    coalesce(sum(xp_earned), 0)
  into v_answered, v_correct, v_cases, v_rapid, v_xp
  from quiz_sessions
  where user_id = v_uid and started_at >= v_day;

  v_challenge := exists (
    select 1 from challenge_claims where user_id = v_uid and day = v_day
  );

  -- Pick 3 templates deterministically, attach live progress.
  with tpl(key, title, target, kind) as (values
    ('answer_15',  'Answer 15 questions',        15, 'answered'),
    ('answer_25',  'Answer 25 questions',        25, 'answered'),
    ('correct_8',  'Get 8 answers correct',       8, 'correct'),
    ('correct_12', 'Get 12 answers correct',     12, 'correct'),
    ('case_1',     'Finish 1 case study',         1, 'cases'),
    ('rapid_1',    'Complete a Rapid Fire run',   1, 'rapid'),
    ('xp_50',      'Earn 50 XP',                 50, 'xp'),
    ('challenge_1','Complete Today''s Challenge', 1, 'challenge')
  ),
  one_per_kind as (
    select distinct on (kind) key, title, target, kind
    from tpl
    order by kind, md5(v_seed || key)
  ),
  picked as (
    select key, title, target, kind
    from one_per_kind
    order by md5(v_seed || key)
    limit 3
  ),
  live as (
    select p.key, p.title, p.target, p.kind,
      least(p.target, case p.kind
        when 'answered'  then v_answered
        when 'correct'   then v_correct
        when 'cases'     then v_cases
        when 'rapid'     then v_rapid
        when 'xp'        then v_xp
        when 'challenge' then (case when v_challenge then 1 else 0 end)
        else 0 end) as progress
    from picked p
  )
  select
    jsonb_agg(jsonb_build_object(
      'key', key, 'title', title, 'kind', kind,
      'target', target, 'progress', progress,
      'done', progress >= target
    ) order by md5(v_seed || key)),
    bool_and(progress >= target)
  into v_quests, v_all_done
  from live;

  -- All 3 done → mark the day (idempotent; the mark is what feeds the chest).
  if coalesce(v_all_done, false) then
    insert into quest_days (user_id, day) values (v_uid, v_day)
    on conflict do nothing;
  end if;

  -- Week strip: which days of the current league week are quest-complete.
  select coalesce(jsonb_agg(to_char(day, 'YYYY-MM-DD') order by day), '[]'), count(*)::int
  into v_week_days, v_days_count
  from quest_days
  where user_id = v_uid and day >= v_week and day < v_week + 7;

  v_chest_claimed := exists (
    select 1 from quest_chest_claims where user_id = v_uid and week_start = v_week
  );

  return jsonb_build_object(
    'day', to_char(v_day, 'YYYY-MM-DD'),
    'quests', coalesce(v_quests, '[]'),
    'all_done', coalesce(v_all_done, false),
    'week', jsonb_build_object(
      'week_start', to_char(v_week, 'YYYY-MM-DD'),
      'days', v_week_days,
      'count', v_days_count,
      'chest', jsonb_build_object(
        'needed', 5,
        'eligible', v_days_count >= 5,
        'claimed', v_chest_claimed
      )
    )
  );
end;
$$;

revoke all on function quest_today() from public, anon;
grant execute on function quest_today() to authenticated;

-- ─── quest_week_chest() → jsonb ──────────────────────────────────────────────
-- Grants this week's chest exactly once: +100 XP (profile credit-style update,
-- level = floor(xp/400)+1) and +1 streak freeze. Idempotent under races via
-- INSERT .. ON CONFLICT DO NOTHING — the reward only pays when the claim row
-- actually lands.

create or replace function quest_week_chest()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_week date := date_trunc('week', current_date)::date;
  v_days integer;
  v_inserted boolean := false;
  c_xp constant integer := 100;
  c_freezes constant integer := 1;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select count(*)::int into v_days
  from quest_days
  where user_id = v_uid and day >= v_week and day < v_week + 7;

  if v_days < 5 then
    return jsonb_build_object('granted', false, 'reason', 'not_enough_days',
                              'days_count', v_days, 'needed', 5);
  end if;

  -- The claim row IS the lock: concurrent calls race on the PK and only the
  -- winner sees an inserted row (and therefore pays the reward).
  insert into quest_chest_claims (user_id, week_start, xp_granted, freezes_granted)
  values (v_uid, v_week, c_xp, c_freezes)
  on conflict (user_id, week_start) do nothing;
  v_inserted := found;

  if not v_inserted then
    return jsonb_build_object('granted', false, 'reason', 'already_claimed');
  end if;

  update user_profiles
     set xp = xp + c_xp,
         level = floor((xp + c_xp) / 400.0)::int + 1,
         streak_freezes = coalesce(streak_freezes, 0) + c_freezes
   where id = v_uid;

  return jsonb_build_object('granted', true, 'xp', c_xp, 'freezes', c_freezes,
                            'days_count', v_days);
end;
$$;

revoke all on function quest_week_chest() from public, anon;
grant execute on function quest_week_chest() to authenticated;

-- ─── Rollback (manual) ───────────────────────────────────────────────────────
-- drop function if exists quest_week_chest();
-- drop function if exists quest_today();
-- drop table if exists quest_chest_claims;
-- drop table if exists quest_days;
