-- ════════════════════════════════════════════════════════════════════════════
-- COURSES FEATURE LAB — STAGED MIGRATION 1/2 (course_progress table)
-- STATUS: STAGED ONLY. Do NOT apply to any database until the feature ships.
--
-- Additive only: one new table, no changes to existing objects.
-- Namespace: course_* per the feature-lab isolation rules.
-- ════════════════════════════════════════════════════════════════════════════

-- One row per (user, course). A course is identified by its derived key
-- '<profession>::<topic>' — courses themselves are NOT stored (they are
-- computed live from the question bank), only the user's progress is.
create table if not exists public.course_progress (
  user_id          uuid        not null references public.user_profiles(id) on delete cascade,
  course_key       text        not null,                    -- '<profession>::<topic>'
  -- Index of the first not-yet-passed unit. 0 = nothing passed;
  -- == units_total once every unit (incl. the mastery exam) is passed.
  highest_unlocked integer     not null default 0 check (highest_unlocked >= 0),
  -- Best score percent per unit index, e.g. {"0": 85, "1": 92}. Kept as jsonb
  -- because the unit COUNT is dynamic (it grows as the bank grows).
  unit_scores      jsonb       not null default '{}'::jsonb,
  -- Unit count at the time of the last save — display fallback so old rows
  -- still render sensibly if the plan later grows/shrinks with the bank.
  units_total      integer,
  mastered_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (user_id, course_key)
);

create index if not exists course_progress_user_idx on public.course_progress (user_id);

-- ── updated_at maintenance ───────────────────────────────────────────────────
-- SECURITY DEFINER + pinned search_path + EXECUTE revoked, per project policy
-- for ALL functions (even trigger helpers).
create or replace function public.course_progress_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.course_progress_touch_updated_at() from public, anon;

drop trigger if exists course_progress_touch on public.course_progress;
create trigger course_progress_touch
  before update on public.course_progress
  for each row execute function public.course_progress_touch_updated_at();

-- ── Row Level Security — owner-only, all four verbs ─────────────────────────
alter table public.course_progress enable row level security;

drop policy if exists "course_progress select own" on public.course_progress;
create policy "course_progress select own" on public.course_progress
  for select using (auth.uid() = user_id);

drop policy if exists "course_progress insert own" on public.course_progress;
create policy "course_progress insert own" on public.course_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "course_progress update own" on public.course_progress;
create policy "course_progress update own" on public.course_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "course_progress delete own" on public.course_progress;
create policy "course_progress delete own" on public.course_progress
  for delete using (auth.uid() = user_id);

-- ── Grants — authenticated only; anon can't touch it at all ─────────────────
revoke all on table public.course_progress from public, anon;
grant select, insert, update, delete on table public.course_progress to authenticated;
