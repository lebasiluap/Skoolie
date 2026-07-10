-- ════════════════════════════════════════════════════════════════════════════
-- COURSES FEATURE LAB — STAGED MIGRATION 2/2 (content RPCs)
-- STATUS: STAGED ONLY. Do NOT apply to any database until the feature ships.
--
-- Three SECURITY DEFINER functions, matching the app's content-lockdown
-- posture (direct SELECT on questions/case_studies is revoked from clients;
-- ALL content flows through capped SECURITY DEFINER RPCs):
--   get_courses_catalog       — counts-only aggregation (get_question_counts style)
--   get_course_unit_questions — capped MCQ reader with band-preference blending
--   get_course_unit_cases     — capped case reader for boss checkpoints
--
-- BEFORE APPLYING, verify against the live schema (this file was written from
-- repo conventions, not a live introspection):
--   * questions.access_key / case_studies.access_key column names
--   * case_studies.professions (text[]) and case_studies.clinical_vignette
--   * questions.category / questions.cognitive_type
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Courses catalog ───────────────────────────────────────────────────────
-- Derives the available courses for a profession live from the bank:
-- per-topic MCQ totals split by difficulty band, plus the case-study count
-- (boss checkpoints degrade to hard MCQs when case_cnt = 0). The client
-- decides qualification (MIN_COURSE_QUESTIONS) so tuning needs no re-deploy.
-- Counts only — no content leaves the database through this function.
create or replace function public.get_courses_catalog(
  p_profession text,
  p_access_key text default null
)
returns table (
  topic      text,
  total      bigint,
  easy_cnt   bigint,
  medium_cnt bigint,
  hard_cnt   bigint,
  case_cnt   bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with mcq as (
    select q.topic,
           count(*)::bigint                                        as total,
           count(*) filter (where q.difficulty = 'easy')::bigint   as easy_cnt,
           count(*) filter (where q.difficulty = 'medium')::bigint as medium_cnt,
           count(*) filter (where q.difficulty = 'hard')::bigint   as hard_cnt
    from questions q
    where q.question_type = 'mcq'
      and q.professions @> array[p_profession]
      and (q.access_key is null or q.access_key = p_access_key)
    group by q.topic
  ),
  cs as (
    select c.topic, count(*)::bigint as case_cnt
    from case_studies c
    where c.professions @> array[p_profession]
      and (c.access_key is null or c.access_key = p_access_key)
    group by c.topic
  )
  select m.topic, m.total, m.easy_cnt, m.medium_cnt, m.hard_cnt,
         coalesce(cs.case_cnt, 0) as case_cnt
  from mcq m
  left join cs on cs.topic = m.topic
  order by m.total desc;
$$;

revoke execute on function public.get_courses_catalog(text, text) from public, anon;
grant execute on function public.get_courses_catalog(text, text) to authenticated;

-- ── 2. Unit question composer ────────────────────────────────────────────────
-- Evaluates a unit's RULE at session time. p_difficulties is an ORDERED
-- preference: rows from the first (primary) band sort first, adjacent bands
-- backfill only when the primary is thin — that's the "blend adjacent bands"
-- graceful degradation, done server-side in one query. p_cognitive_types is a
-- soft preference (ORDER BY, never WHERE) so banks with untagged
-- cognitive_type (e.g. medicine) still fill sessions.
-- Hard cap 40 rows per call, matching the content-lockdown LEAST(cap) policy.
create or replace function public.get_course_unit_questions(
  p_profession      text,
  p_topic           text,
  p_difficulties    text[],
  p_cognitive_types text[] default null,
  p_access_key      text   default null,
  p_limit           int    default 12
)
returns table (
  id                       uuid,
  question_text            text,
  options                  jsonb,
  correct_answer           text,
  explanation              text,
  distractor_explanations  jsonb,
  topic                    text,
  category                 text,
  subtopic                 text,
  difficulty               text,
  cognitive_type           text,
  high_yield               boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select q.id, q.question_text, q.options, q.correct_answer, q.explanation,
         q.distractor_explanations, q.topic, q.category, q.subtopic,
         q.difficulty, q.cognitive_type, q.high_yield
  from questions q
  where q.question_type = 'mcq'
    and q.professions @> array[p_profession]
    and q.topic = p_topic
    and q.difficulty = any (p_difficulties)
    and (q.access_key is null or q.access_key = p_access_key)
  order by
    array_position(p_difficulties, q.difficulty),                    -- band preference
    case when p_cognitive_types is null
           or q.cognitive_type = any (p_cognitive_types) then 0
         else 1 end,                                                 -- soft cognitive preference
    random()
  limit least(greatest(coalesce(p_limit, 12), 1), 40);
$$;

revoke execute on function public.get_course_unit_questions(text, text, text[], text[], text, int) from public, anon;
grant execute on function public.get_course_unit_questions(text, text, text[], text[], text, int) to authenticated;

-- ── 3. Boss checkpoint cases ─────────────────────────────────────────────────
-- Random whole cases for a topic; the client flattens their questions into
-- runner items (composite '<caseId>:<qIdx>' ids, the app-wide convention).
-- Hard cap 6 cases per call.
create or replace function public.get_course_unit_cases(
  p_profession text,
  p_topic      text,
  p_access_key text default null,
  p_limit      int  default 2
)
returns table (
  id                 uuid,
  title              text,
  clinical_vignette  text,
  topic              text,
  difficulty         text,
  questions          jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.id, c.title, c.clinical_vignette, c.topic, c.difficulty, c.questions
  from case_studies c
  where c.professions @> array[p_profession]
    and c.topic = p_topic
    and (c.access_key is null or c.access_key = p_access_key)
    and jsonb_typeof(c.questions) = 'array'
    and jsonb_array_length(c.questions) > 0
  order by random()
  limit least(greatest(coalesce(p_limit, 2), 1), 6);
$$;

revoke execute on function public.get_course_unit_cases(text, text, text, int) from public, anon;
grant execute on function public.get_course_unit_cases(text, text, text, int) to authenticated;
