-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE LAB · 1v1 DUELS — STAGED MIGRATION (DO NOT APPLY YET)
--
-- Async head-to-head: two users of the SAME profession get the SAME frozen
-- 10-question set; each runs a rapid-fire-style timed session within 24h.
-- Higher score wins; ties broken by lower total time. Pride only — duels
-- credit NO XP anywhere (no user_profiles.xp, no league_standings), so the
-- league cannot be farmed through rematch spam.
--
-- Additive only. Namespaced duel_*. RLS on, owner-scoped reads; ALL writes go
-- through SECURITY DEFINER RPCs (search_path pinned, EXECUTE revoked from
-- anon/public, granted to authenticated only).
--
-- Depends on existing live tables: user_profiles(profession, full_name,
-- avatar_url, level, last_active_date), questions, user_question_history.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Table ───────────────────────────────────────────────────────────────────

create table if not exists duel_matches (
  id uuid primary key default gen_random_uuid(),
  challenger uuid not null references user_profiles(id) on delete cascade,
  opponent uuid not null references user_profiles(id) on delete cascade,
  profession text not null,
  -- Frozen at creation — both players answer the exact same set.
  question_ids uuid[] not null,
  status text not null default 'pending'
    check (status in ('pending', 'p1_done', 'p2_done', 'complete', 'expired')),
  challenger_score integer,
  challenger_ms integer,
  challenger_done_at timestamptz,
  opponent_score integer,
  opponent_ms integer,
  opponent_done_at timestamptz,
  -- null while unfinished, and stays null on a dead-even draw
  winner uuid references user_profiles(id) on delete set null,
  rematch_of uuid references duel_matches(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  check (challenger <> opponent)
);

create index if not exists duel_matches_challenger_idx on duel_matches (challenger, created_at desc);
create index if not exists duel_matches_opponent_idx on duel_matches (opponent, created_at desc);

alter table duel_matches enable row level security;

-- Participants can read their own duels; nobody writes directly (RPCs only).
drop policy if exists "Participants read own duels" on duel_matches;
create policy "Participants read own duels" on duel_matches
  for select using (auth.uid() = challenger or auth.uid() = opponent);

revoke all on duel_matches from public, anon, authenticated;
grant select on duel_matches to authenticated;

-- ─── Private helper: compose the shared 10-question set ─────────────────────
-- Recall/application mix (5+5 where taggable), excluding questions EITHER
-- player has answered before where feasible, backfilling random from the full
-- bank so the set always fills. Medicine MCQs are untagged (cognitive_type
-- null) — they land in the "application" bucket + backfill, which is fine.

create or replace function duel_compose_questions(p_a uuid, p_b uuid, p_profession text)
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ids uuid[];
begin
  with seen as (
    select question_id from user_question_history where user_id in (p_a, p_b)
  ),
  fresh as (
    select q.id, q.cognitive_type from questions q
    where q.question_type = 'mcq'
      and q.professions && array[p_profession, 'general']::text[]
      and not exists (select 1 from seen s where s.question_id = q.id)
  ),
  recall as (
    select id from fresh where cognitive_type = 'recall' order by random() limit 5
  ),
  applied as (
    select id from fresh
    where cognitive_type is distinct from 'recall'
      and id not in (select id from recall)
    order by random() limit 5
  )
  select coalesce(array_agg(id), '{}') into v_ids
  from (select id from recall union all select id from applied) picks;

  -- Fallback: both players have seen (nearly) everything — fill randomly.
  if coalesce(array_length(v_ids, 1), 0) < 10 then
    v_ids := v_ids || array(
      select q.id from questions q
      where q.question_type = 'mcq'
        and q.professions && array[p_profession, 'general']::text[]
        and not (q.id = any (v_ids))
      order by random()
      limit 10 - coalesce(array_length(v_ids, 1), 0)
    );
  end if;

  return v_ids;
end;
$$;

revoke all on function duel_compose_questions(uuid, uuid, text) from public, anon, authenticated;

-- ─── duel_create(p_opponent, p_rematch_of) → uuid ────────────────────────────
-- Validates same-profession opponent, dedupes to an existing LIVE duel between
-- the same pair (so double-taps and crossed challenges don't stack), freezes
-- the question set, returns the duel id.

create or replace function duel_create(p_opponent uuid, p_rematch_of uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_prof text;
  v_opp_prof text;
  v_existing uuid;
  v_ids uuid[];
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_opponent = v_uid then raise exception 'cannot duel yourself'; end if;

  select profession into v_prof from user_profiles where id = v_uid;
  select profession into v_opp_prof from user_profiles where id = p_opponent;
  if v_opp_prof is null then raise exception 'opponent not found'; end if;
  if v_opp_prof <> v_prof then raise exception 'opponent is in a different field'; end if;

  -- Anti-spam: at most 10 duels created per hour.
  if (select count(*) from duel_matches
      where challenger = v_uid and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'too many duels created — try again later';
  end if;

  -- One live duel per pair: return it instead of stacking a second.
  select id into v_existing from duel_matches
  where status in ('pending', 'p1_done', 'p2_done')
    and expires_at > now()
    and ((challenger = v_uid and opponent = p_opponent)
      or (challenger = p_opponent and opponent = v_uid))
  limit 1;
  if v_existing is not null then return v_existing; end if;

  v_ids := duel_compose_questions(v_uid, p_opponent, v_prof);
  if coalesce(array_length(v_ids, 1), 0) < 4 then
    raise exception 'not enough questions available for a duel';
  end if;

  insert into duel_matches (challenger, opponent, profession, question_ids, rematch_of)
  values (v_uid, p_opponent, v_prof, v_ids, p_rematch_of)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function duel_create(uuid, uuid) from public, anon;
grant execute on function duel_create(uuid, uuid) to authenticated;

-- ─── duel_random() → uuid ────────────────────────────────────────────────────
-- "Random rival": a same-profession user, preferring the recently active
-- (last 14 days) so challenges land on people who'll actually answer.
-- Returns null when the caller is the only one in their field.

create or replace function duel_random()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_prof text;
  v_opp uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select profession into v_prof from user_profiles where id = v_uid;

  select id into v_opp from user_profiles
  where id <> v_uid and profession = v_prof
  order by (coalesce(last_active_date, date '1970-01-01') >= current_date - 14) desc, random()
  limit 1;

  if v_opp is null then return null; end if;
  return duel_create(v_opp);
end;
$$;

revoke all on function duel_random() from public, anon;
grant execute on function duel_random() to authenticated;

-- ─── duel_search_opponents(p_query) → rows ───────────────────────────────────
-- Name search within the caller's profession. SECURITY DEFINER because
-- user_profiles RLS is own-row only; returns PUBLIC columns only (no email).

create or replace function duel_search_opponents(p_query text)
returns table (id uuid, full_name text, avatar_url text, level integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_prof text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if length(trim(coalesce(p_query, ''))) < 2 then return; end if;
  select profession into v_prof from user_profiles where id = v_uid;

  return query
  select u.id, u.full_name, u.avatar_url, u.level
  from user_profiles u
  where u.id <> v_uid
    and u.profession = v_prof
    and u.full_name ilike '%' || trim(p_query) || '%'
  order by u.last_active_date desc nulls last, u.full_name
  limit 10;
end;
$$;

revoke all on function duel_search_opponents(text) from public, anon;
grant execute on function duel_search_opponents(text) to authenticated;

-- ─── Private helper: role-aware jsonb view of one duel ──────────────────────
-- "you" is the caller's side. The opponent's score/time stay HIDDEN until the
-- caller has submitted (knowing the target mid-run would be an unfair pacer).

create or replace function duel_to_json(m duel_matches, p_viewer uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_is_challenger boolean := (m.challenger = p_viewer);
  v_them uuid := case when v_is_challenger then m.opponent else m.challenger end;
  v_me_done boolean;
  v_them_done boolean;
  v_them_row record;
begin
  v_me_done := case when v_is_challenger then m.challenger_done_at is not null
                    else m.opponent_done_at is not null end;
  v_them_done := case when v_is_challenger then m.opponent_done_at is not null
                      else m.challenger_done_at is not null end;
  select full_name, avatar_url, level into v_them_row from user_profiles where id = v_them;

  return jsonb_build_object(
    'id', m.id,
    'status', m.status,
    'created_at', m.created_at,
    'expires_at', m.expires_at,
    'rematch_of', m.rematch_of,
    'total', coalesce(array_length(m.question_ids, 1), 0),
    'is_challenger', v_is_challenger,
    'you', jsonb_build_object(
      'done', v_me_done,
      'score', case when v_is_challenger then m.challenger_score else m.opponent_score end,
      'ms', case when v_is_challenger then m.challenger_ms else m.opponent_ms end
    ),
    'them', jsonb_build_object(
      'id', v_them,
      'name', coalesce(v_them_row.full_name, 'Rival'),
      'avatar_url', v_them_row.avatar_url,
      'level', v_them_row.level,
      'done', v_them_done,
      'score', case when v_me_done or m.status in ('complete', 'expired')
                    then (case when v_is_challenger then m.opponent_score else m.challenger_score end) end,
      'ms', case when v_me_done or m.status in ('complete', 'expired')
                 then (case when v_is_challenger then m.opponent_ms else m.challenger_ms end) end
    ),
    'winner', m.winner,
    'you_won', (m.winner is not null and m.winner = p_viewer),
    'draw', (m.status = 'complete' and m.winner is null)
  );
end;
$$;

revoke all on function duel_to_json(duel_matches, uuid) from public, anon, authenticated;

-- ─── duel_get(p_id) → jsonb ──────────────────────────────────────────────────
-- Lazily expires an overdue duel, returns the role-aware view. The frozen
-- question rows ride along ONLY while the caller still has a run to play
-- (content lockdown: capped at the 10 frozen ids, participants only).

create or replace function duel_get(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  m duel_matches;
  v_me_done boolean;
  v_qs jsonb := null;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into m from duel_matches where id = p_id;
  if m.id is null or (v_uid <> m.challenger and v_uid <> m.opponent) then
    raise exception 'duel not found';
  end if;

  -- Lazy expiry sweep for this duel
  if m.status in ('pending', 'p1_done', 'p2_done') and m.expires_at < now() then
    update duel_matches set status = 'expired' where id = m.id;
    m.status := 'expired';
  end if;

  v_me_done := case when m.challenger = v_uid then m.challenger_done_at is not null
                    else m.opponent_done_at is not null end;

  if not v_me_done and m.status not in ('expired', 'complete') then
    select jsonb_agg(jsonb_build_object(
      'id', q.id, 'question_text', q.question_text, 'options', q.options,
      'correct_answer', q.correct_answer, 'explanation', q.explanation,
      'topic', q.topic, 'category', q.category, 'subtopic', q.subtopic,
      'difficulty', q.difficulty
    ) order by array_position(m.question_ids, q.id))
    into v_qs
    from questions q where q.id = any (m.question_ids);
  end if;

  return duel_to_json(m, v_uid) || jsonb_build_object('questions', v_qs);
end;
$$;

revoke all on function duel_get(uuid) from public, anon;
grant execute on function duel_get(uuid) to authenticated;

-- ─── duel_submit(p_id, p_score, p_ms) → jsonb ───────────────────────────────
-- Records the caller's run once (first submit wins; re-submits are rejected),
-- transitions status, and settles winner when both sides are in.
-- Score/time are client-reported — acceptable because duels pay NO XP.

create or replace function duel_submit(p_id uuid, p_score integer, p_ms integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  m duel_matches;
  v_total integer;
  v_score integer;
  v_ms integer;
  v_winner uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  -- Row lock: two devices submitting the same side can't double-write.
  select * into m from duel_matches where id = p_id for update;
  if m.id is null or (v_uid <> m.challenger and v_uid <> m.opponent) then
    raise exception 'duel not found';
  end if;
  if m.status = 'complete' then raise exception 'duel already complete'; end if;
  if m.status = 'expired' or m.expires_at < now() then
    update duel_matches set status = 'expired' where id = m.id and status <> 'expired';
    raise exception 'duel expired';
  end if;

  v_total := coalesce(array_length(m.question_ids, 1), 0);
  v_score := least(greatest(coalesce(p_score, 0), 0), v_total);
  v_ms := least(greatest(coalesce(p_ms, 0), 0), 86400000);

  if v_uid = m.challenger then
    if m.challenger_done_at is not null then raise exception 'already submitted'; end if;
    update duel_matches
       set challenger_score = v_score, challenger_ms = v_ms, challenger_done_at = now(),
           status = case when opponent_done_at is not null then 'complete' else 'p1_done' end
     where id = m.id;
  else
    if m.opponent_done_at is not null then raise exception 'already submitted'; end if;
    update duel_matches
       set opponent_score = v_score, opponent_ms = v_ms, opponent_done_at = now(),
           status = case when challenger_done_at is not null then 'complete' else 'p2_done' end
     where id = m.id;
  end if;

  select * into m from duel_matches where id = p_id;
  if m.status = 'complete' then
    -- Higher score wins; tie → faster total time; dead even → draw (null).
    v_winner := case
      when m.challenger_score > m.opponent_score then m.challenger
      when m.opponent_score > m.challenger_score then m.opponent
      when m.challenger_ms < m.opponent_ms then m.challenger
      when m.opponent_ms < m.challenger_ms then m.opponent
      else null end;
    update duel_matches set winner = v_winner where id = m.id;
    m.winner := v_winner;
  end if;

  return duel_to_json(m, v_uid);
end;
$$;

revoke all on function duel_submit(uuid, integer, integer) from public, anon;
grant execute on function duel_submit(uuid, integer, integer) to authenticated;

-- ─── duel_list() → jsonb ─────────────────────────────────────────────────────
-- The caller's duels, newest first (last 30), after a lazy expiry sweep of
-- their overdue ones. Same hidden-score rules as duel_get.

create or replace function duel_list()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_out jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  update duel_matches
     set status = 'expired'
   where (challenger = v_uid or opponent = v_uid)
     and status in ('pending', 'p1_done', 'p2_done')
     and expires_at < now();

  -- Direct table alias (not a subquery row) so the composite type matches
  -- duel_to_json's duel_matches parameter.
  select coalesce(jsonb_agg(t.j order by t.ca desc), '[]')
    into v_out
    from (
      select duel_to_json(d, v_uid) as j, d.created_at as ca
      from duel_matches d
      where d.challenger = v_uid or d.opponent = v_uid
      order by d.created_at desc
      limit 30
    ) t;
  return v_out;
end;
$$;

revoke all on function duel_list() from public, anon;
grant execute on function duel_list() to authenticated;

-- ─── Rollback (manual) ───────────────────────────────────────────────────────
-- drop function if exists duel_list(), duel_submit(uuid,integer,integer),
--   duel_get(uuid), duel_to_json(duel_matches,uuid), duel_search_opponents(text),
--   duel_random(), duel_create(uuid,uuid), duel_compose_questions(uuid,uuid,text);
-- drop table if exists duel_matches;
