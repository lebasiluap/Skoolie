# Feature lab · 1v1 Duels

Async head-to-head between two users of the **same profession**: both get the
**same frozen 10-question set** (composed server-side at creation), each runs a
rapid-fire-style timed session whenever they want **within 24h**, then higher
score wins (tie → faster total time, dead-even → draw). **Pride only — duels
credit NO XP** (no `user_profiles.xp`, no `league_standings`), so the league
can't be farmed via rematches. Free for all users.

**Nothing in the main app imports this folder** — it's dead code to Metro until
wired (see below).

## What exists

| File | Purpose |
| --- | --- |
| `migrations/001_duels.sql` | **STAGED, not applied.** `duel_matches` table + RPCs `duel_create`, `duel_random`, `duel_get`, `duel_submit`, `duel_list`, `duel_search_opponents` (+ private helpers `duel_compose_questions`, `duel_to_json`). RLS on (participants read own rows, all writes via SECURITY DEFINER RPCs, `search_path` pinned, EXECUTE revoked from anon/public). |
| `types.ts` | `Duel`, `DuelSide`, `DuelOpponent`, `DuelQuestion`, `OpponentHit` — the jsonb shapes the RPCs return. |
| `api.ts` | Typed RPC wrappers + `timeLeft`/`fmtMs` formatters. |
| `DuelsFeature.tsx` | Single entry component — internal home → runner → result state machine (no extra routes needed). |
| `DuelsHome.tsx` | Active/finished list, rival name search (server-scoped to your profession), Random Rival. |
| `DuelRunner.tsx` | Rapid-fire-adapted run: countdown ring on the card, quick pills, 15s/question, timeout = wrong + full window banked. |
| `DuelResult.tsx` | Head-to-head comparison, winner/draw/waiting/expired banner, Rematch (new duel vs same rival, fresh set). |
| `tsconfig.check.json` | Strict isolated typecheck: `cd SkoolieApp && ./node_modules/.bin/tsc -p features/duels/tsconfig.check.json` |

## Data model

`duel_matches(id, challenger, opponent, profession, question_ids uuid[] (frozen),
status pending|p1_done|p2_done|complete|expired, {challenger,opponent}_{score,ms,done_at},
winner (null = draw/unfinished), rematch_of, created_at, expires_at = +24h)`

Design decisions:
- **Question set frozen at creation** — recall/application 5+5 mix where tagged
  (medicine MCQs are untagged → they fill the non-recall bucket), excluding
  questions **either** player has in `user_question_history`, random backfill so
  the set always fills. Both players see the **same option order** (shuffle seed
  = duelId + questionId).
- **Opponent's score stays hidden** (server-side, in `duel_to_json`) until you
  submit — no pacing advantage from peeking at the target.
- **One live duel per pair** — `duel_create` returns the existing live duel
  instead of stacking; plus a 10-duels/hour creation cap.
- **Anti-peek:** leaving/backgrounding mid-run auto-submits the current score
  (remaining count wrong, elapsed ms banked). A force-kill can still dodge this;
  accepted for v1 because stakes are pride only (score is client-reported anyway,
  same trust level as the rest of the app — fine while XP is zero).
- Expiry is **lazy** (swept in `duel_get`/`duel_list`) — no cron needed.
- Answers still call `record_answer` → duel questions count in history/stats.
- Win/loss record on the profile: derivable later from `duel_matches` (winner
  column) — no extra table needed.

## Wiring for testing (one route + flag)

1. Apply `migrations/001_duels.sql` to a **branch/staging** database (verify
   `user_question_history.question_id` is uuid and `user_profiles.profession`
   values match — the SQL only assumes columns already used by the app).
2. Create **one** route file, `app/(app)/practice/duels.tsx`:
   ```tsx
   import { DuelsFeature } from '@/features/duels'
   const DUELS_ENABLED = true   // flip off before any store build
   export default function DuelsRoute() {
     if (!DUELS_ENABLED) return null
     return <DuelsFeature />
   }
   ```
3. Navigate to it from anywhere: `router.push('/(app)/practice/duels' as any)`
   (or just type the URL in Expo Go dev menu). Two test accounts of the same
   profession are needed to complete a full duel.

## Unwiring

- Delete `app/(app)/practice/duels.tsx` (the only file outside this folder).
  The feature is dead code again; store builds are unaffected.
- DB rollback (staging): run the commented `drop` block at the bottom of
  `migrations/001_duels.sql`.
