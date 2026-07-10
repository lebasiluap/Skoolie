# Feature lab · Daily Quests + Weekly Chest

3 quests per day, picked **deterministically per (user, day)** from a template
pool; progress is computed **entirely server-side** from existing tables
(`quiz_sessions`, `challenge_claims`) by `quest_today()` — the client renders,
never counts, so nothing can drift across devices. Completing all 3 marks the
day in `quest_days`; **5+ quest-complete days in a league week** (ISO Monday,
same as `league_standings.week_start`) unlocks the weekly chest —
`quest_week_chest()` grants **+100 XP + 1 streak freeze exactly once**.

**Nothing in the main app imports this folder** — dead code to Metro until
wired (see below).

## What exists

| File | Purpose |
| --- | --- |
| `migrations/001_quests.sql` | **STAGED, not applied.** Tables `quest_days`, `quest_chest_claims`; RPCs `quest_today()`, `quest_week_chest()`. RLS on (own-row SELECT only; writes only via SECURITY DEFINER RPCs, `search_path` pinned, EXECUTE revoked from anon/public). |
| `types.ts` | `Quest`, `QuestToday`, `QuestWeek`, `ChestState`, `ChestGrant`. |
| `api.ts` | Typed RPC wrappers + `questIcon` + `weekGrid` (Mon–Sun strip builder). |
| `QuestsCard.tsx` | Embeddable dashboard card: 3 quests w/ progress bars + chest pip tracker. Renders nothing on fetch failure (quiet on the dashboard). Refetches when `refreshKey` changes. |
| `QuestsScreen.tsx` | Full view: quest cards, league-week grid (gold check = quest day), chest state machine (locked → ready → opened) with the claim button. |
| `tsconfig.check.json` | Strict isolated typecheck: `cd SkoolieApp && ./node_modules/.bin/tsc -p features/quests/tsconfig.check.json` |

## Data model & design decisions

- `quest_days(user_id, day, completed_at, PK(user_id, day))` — one row per
  fully-completed day, written by `quest_today()` itself (idempotent insert).
- `quest_chest_claims(user_id, week_start, xp_granted, freezes_granted,
  claimed_at, PK(user_id, week_start))` — **the PK is the idempotency lock**:
  the grant in `quest_week_chest()` only pays when the `INSERT … ON CONFLICT DO
  NOTHING` actually lands, so button-mashing/two-device races can't double-pay.
- **Template pool (8):** answer 15/25 questions, get 8/12 correct, finish 1 case
  study, complete a Rapid Fire run, earn 50 XP, complete Today's Challenge.
  Seed = `md5(uid:day || key)` ordering with `DISTINCT ON (kind)` first — two
  variants of the same kind never appear together.
- **Progress sources** are all completed-session based (`quiz_sessions` is only
  written at results screens), matching how streak/stats already work. The
  "correct in a row" idea was simplified to "N correct today" per spec —
  streaks aren't derivable from existing tables without per-answer ordering.
- **Day boundary = server `current_date` (UTC)** — one boundary for everyone,
  immune to device-clock changes; may differ up to a few hours from the user's
  local midnight (accepted; same class of tradeoff as ISO league weeks).
- **Chest XP is league-neutral** (credits `user_profiles.xp`/`level` with the
  app-wide `XP_PER_LEVEL = 400`, but does NOT touch `league_standings`) — it's
  a meta-reward like trophy XP; keeping it out of the weekly board prevents
  chest timing from tilting league cuts. Streak freeze uses the existing
  `user_profiles.streak_freezes` bank consumed by the dashboard.
- Verify before applying: `challenge_claims` has a `day date` column (the
  challenge-claim RPC pattern implies it) and `quiz_sessions.mode` values
  `'case_study' | 'rapid_fire' | 'barrage'` (they're what the app writes).

## Wiring for testing (one route + flag)

1. Apply `migrations/001_quests.sql` to a **branch/staging** database.
2. Create **one** route file, `app/(app)/practice/quests.tsx`:
   ```tsx
   import { QuestsScreen } from '@/features/quests'
   import { router } from 'expo-router'
   const QUESTS_ENABLED = true   // flip off before any store build
   export default function QuestsRoute() {
     if (!QUESTS_ENABLED) return null
     return <QuestsScreen onBack={() => router.back()} />
   }
   ```
3. Optional dashboard preview (still test-only): drop
   `<QuestsCard onOpenFull={() => router.push('/(app)/practice/quests' as any)} />`
   into `dashboard.tsx` behind the same flag. Do a few practice runs and watch
   progress move with **zero client counting**.

## Unwiring

- Delete `app/(app)/practice/quests.tsx` (and the `QuestsCard` line if added to
  the dashboard). Nothing else references this folder.
- DB rollback (staging): run the commented `drop` block at the bottom of
  `migrations/001_quests.sql`.
