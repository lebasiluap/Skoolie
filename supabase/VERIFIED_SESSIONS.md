# Verified session protocol: staged rollout

Status (24 October 2026): additive backend deployed; shared client and tests implemented.
The shared iOS/Android MCQ, case and flashcard screens now use the protocol for untimed sessions
in source. These screen changes are not yet distributed in a new phone build. Legacy reward/session
writes remain enabled for released builds and unmigrated modes. This is not a completed anti-cheat rollout.

## Contract

1. Generate one request UUID per attempt. Call `begin_verified_session(request_id, mode, item_ids)`.
2. Render only the returned `items`, in the returned order. Do not render stale prefetched content.
3. Record canonical, unshuffled option letters (or flashcard boolean ratings). Explicit null means unanswered.
4. Submit every issued ID through `finish_verified_session(session_id, answers)`.
5. On an uncertain network result, retry the same session and identical answers. Never fall back to legacy XP.
6. Render score and XP from the receipt, not local calculations.

The backend validates ownership, current content/version, strict serving eligibility, profession,
region and access. It calculates grading and XP itself, and commits progress, history and a unique
reward receipt in one transaction. Row locks and unique constraints serialize repeated completion.
Completed replay returns the original receipt; changed answers are rejected. Authenticated clients
cannot edit receipted public quiz result rows or access the private session/receipt tables.

Supported v1 modes: **untimed** MCQ, case-study inner questions and self-rated flashcards (zero XP).
Limits: 1–60 unique items, 60 issued sessions per user per hour, 12-hour expiry, bounded input sizes.
Streak accounting uses server UTC days. Agree on a timezone policy before global client cutover.

## Verification performed

- Known correct and incorrect answers, case-inner grading and flashcard zero-XP policy.
- Same-request issuance replay, identical completion replay and conflicting-answer rejection.
- Wrong owner, inaccessible private tables, protected result-row edits, malformed answers and expiry.
- Changed content and newly quarantined items cannot complete or start a session.
- Server streak freezes consumed once, same-day replay does not advance, insufficient freezes reset.
- Existing profile/onboarding/progress/reward/quarantine regression matrix passes.
- Eight shared client tests cover concurrent-call deduplication, lost responses, canonical shuffled
  answers, flashcard false-rating retries and immutable bindings.
- Root and mobile TypeScript checks pass. Both native platform bundle exports pass.
- Issuance includes authoritative case context; flashcard history is committed once with its receipt.

All database fixtures were rolled back. These are not independent multi-connection concurrency
benchmarks, physical-device sign-in tests or medical accuracy evaluations.

## Remaining rollout work

- Wire web screens and remaining native modes to issuance-before-render and receipt-based completion.
- Physically test the connected phone screens and distribute new iOS/Android builds.
- Design server timing and bonus contracts for timed modes, Rapid Fire, barrage, challenges and courses.
- Test old and new builds, actual sign-in, retries/offline recovery, account deletion and performance.
- Plan private-session retention and observe issuance limits under real usage.
- Only after all supported client flows migrate, revoke legacy reward/session mutation routes.

Existing question endpoints expose answer keys. This protocol prevents client-authored score and
same-session reward replay; it does not prove human study or prevent open-book answering.
The server-side content fingerprint is a version marker, not a client authentication signature.

## Source and migrations

`verified_sessions.sql` is the complete initial schema/function definition, not an incremental rerun
script. Existing installations received additive migrations, including payload binding, canonical case
indices, result protection, and server streak accounting. `protect_verified_quiz_rows.sql` installs
the separate result guard. Run regression scripts only in controlled diagnostic sessions.
