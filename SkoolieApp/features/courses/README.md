# Courses — isolated feature lab

Duolingo-style mastery courses built **entirely from the existing question bank**.
No fixed question lists, no teaching content: a course = ordered units, and each
unit is a **rule** (difficulty band + cognitive preference + mode mix) evaluated
against `questions` at session time — newly imported questions slot in
automatically, and courses themselves are derived per `(profession, topic)` from
a live counts aggregation.

## Isolation contract

- **Everything lives under `features/courses/`.** Nothing in `app/`, `components/`,
  `lib/`, or `hooks/` imports from here, so Metro treats this folder as dead code
  and store builds exclude it. This folder MAY import *from* the main app
  (`@/lib/supabase`, `@/hooks/useAuth`, `@/components/ui/*`, mascots, etc.).
- **No database was touched.** All DDL is staged in `migrations/*.sql` and must be
  reviewed + applied manually before wiring the feature.

## What exists

```
features/courses/
├── index.tsx                  # Root state machine: home → path → runner → results
├── lib/
│   ├── types.ts               # Course / CourseUnit / RunnerItem / CourseProgress
│   └── engine.ts              # Rules, catalog, session composition, progress, XP
├── components/
│   ├── ProgressRing.tsx       # SVG completion ring (course cards + path header)
│   └── UnitNode.tsx           # Path node: locked / current (pulse) / done; boss & mastery styled
├── screens/
│   ├── CoursesHome.tsx        # Course cards with progress rings + mastered badge
│   ├── CoursePath.tsx         # Vertical zig-zag unit path, teal connectors fill as you pass
│   ├── UnitRunner.tsx         # MCQ-style focused session (adapted from mcq.tsx, not imported)
│   └── UnitResults.tsx        # Pass/fail vs 80%, retry, save-on-results
├── migrations/
│   ├── 0001_course_progress.sql   # course_progress table + RLS + grants (STAGED)
│   └── 0002_course_rpcs.sql       # get_courses_catalog / get_course_unit_questions / get_course_unit_cases (STAGED)
├── tsconfig.check.json        # Strict noEmit compile scoped to this folder
└── README.md
```

## Data model (staged — apply manually, in order)

1. **`course_progress`** (`0001`): PK `(user_id, course_key)` where
   `course_key = '<profession>::<topic>'`. Columns: `highest_unlocked` (index of
   the first not-yet-passed unit), `unit_scores` jsonb (best % per unit index),
   `units_total`, `mastered_at`, timestamps + touch trigger. RLS enabled,
   owner-only policies on all four verbs; table revoked from `anon`/`public`,
   granted to `authenticated` only.
2. **RPCs** (`0002`): all `SECURITY DEFINER`, `search_path` pinned to
   `public, pg_temp`, `EXECUTE` revoked from `public`/`anon`, granted to
   `authenticated`, hard row caps (40 questions / 6 cases) matching the
   content-lockdown policy.
   - `get_courses_catalog(p_profession, p_access_key)` — counts-only per-topic
     aggregation (total + per-band + case count). No content leaves via it.
   - `get_course_unit_questions(p_profession, p_topic, p_difficulties[], p_cognitive_types[], p_access_key, p_limit)`
     — the unit composer. `p_difficulties` is an ORDERED preference
     (`array_position` sort): primary band first, adjacent bands backfill only
     when the primary is thin. `p_cognitive_types` is a soft ORDER BY preference,
     never a filter (medicine's untagged `cognitive_type` degrades gracefully).
   - `get_course_unit_cases(p_profession, p_topic, p_access_key, p_limit)` —
     random whole cases; the client flattens questions to `'<caseId>:<qIdx>'` items.

   **Before applying `0002`**, verify against the live schema: `access_key`
   column names on `questions`/`case_studies`, `case_studies.professions`,
   `case_studies.clinical_vignette` (written from repo conventions, not live
   introspection).

## How the engine composes a unit (lib/engine.ts)

- **Catalog → courses:** a topic qualifies with ≥ 40 MCQs (`MIN_COURSE_QUESTIONS`).
  Unit count scales with bank size: `clamp(4 + total/60, 5, 12)`.
- **Ramp:** standard units go easy → medium → hard by position
  (`bandAt`); each sends the full ordered blend list so thin bands borrow from
  neighbours server-side. Cognitive preference ramps recall → application/mechanism
  → interpretation/calculation (soft).
- **Boss (every 4th unit):** 2 whole case studies flattened into questions with the
  vignette shown above each stem; topics with zero cases degrade to a
  hard-leaning MCQ checkpoint.
- **Mastery (final unit):** over-fetches MCQs across all bands, `balancedSample`
  round-robins per band for a genuine mix, appends one case, and runs at rapid
  pace (15 s/question, timeout = wrong).
- **Progression:** pass a unit at ≥ 80% (`PASS_PCT`) to advance
  `highest_unlocked`; replays keep the best score; passing the final unit stamps
  `mastered_at`.
- **XP:** existing `credit_xp` RPC only — `'mcq'` for standard units,
  `'case_study'` for boss/mastery. MCQ answers also flow through the existing
  `record_answer` RPC so seen/unseen + analytics stay consistent. No
  `quiz_sessions` row is written yet (decide at ship time whether course runs
  should count toward streak/recent activity).

## Wire it up for testing

1. Apply `migrations/0001` then `migrations/0002` (after the schema checks above).
2. Add ONE route file — this is the only main-app change:

   ```tsx
   // SkoolieApp/app/(app)/courses.tsx
   export { default } from '@/features/courses'
   ```

3. Navigate to it behind a dev flag from anywhere, e.g. a temporary dashboard button:

   ```tsx
   const COURSES_LAB = __DEV__   // flag: dev builds only
   {COURSES_LAB && (
     <TouchableOpacity onPress={() => router.push('/(app)/courses' as any)}>
       <Text>Courses (lab)</Text>
     </TouchableOpacity>
   )}
   ```

## Unwire

1. Delete `SkoolieApp/app/(app)/courses.tsx` (and the temporary dashboard button).
   The folder is dead code again — Metro excludes it from builds.
2. (Optional, full rollback) `drop function` the three RPCs and
   `drop table public.course_progress;` — both migrations are additive, nothing
   else depends on them.

## Type check

```sh
cd SkoolieApp && ./node_modules/.bin/tsc -p features/courses/tsconfig.check.json
```

Strict, `noEmit`, covers only this folder (plus whatever it imports from the app).
