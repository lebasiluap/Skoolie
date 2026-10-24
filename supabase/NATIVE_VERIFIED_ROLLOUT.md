# Native verified-session rollout — 24 October 2026

## Critical (must fix before launch)

No new critical regression found by the automated checks, but the entire reward system is not
replay-proof yet: timed modes, Rapid Fire, challenges and courses still use legacy writes. Those
routes cannot be revoked while shipped clients need them. Do not describe this as full anti-cheat.

## High Priority

Connected the shared iOS/Android untimed MCQ, case and flashcard screens to issuance-before-render
and server-confirmed completion. The issued payload replaces prefetched content, including case
vignettes/history/exam/investigations. Canonical unshuffled answers are submitted, not local scores.
Results use the authoritative XP receipt. No verified completion falls back to legacy rewards.

Physical-device flow tests and new build distribution remain pending. Successful exports are not
App Store/TestFlight/Play uploads. Web screens have not been migrated by this change.

## Medium Priority

Double-taps, swipe/button races and uncertain completion responses keep one answer envelope and
one reward receipt. Users can retry saving from the final question/card. Leaving or killing the app
still loses the in-memory session/retry state; cross-restart recovery has not been implemented.
Practice-only bookmark/history and missed-answer drills do not save rewards. Flashcards stay zero-XP.
Server streaks use UTC days, so global timezone policy needs agreement before complete cutover.

## Low Priority

Preparing/saving states use existing light/dark theme tokens, readable wrapping text and native
retry dialogs. No visual redesign or physical-device visual acceptance is claimed. Existing
uncommitted practice-loading/cache changes in the same screens were preserved with their required
provider/cache dependencies; unrelated dirty profile, analytics, streak UI and build settings remain untouched.

## Overall Verdict

Ready for device QA of the supported untimed flows, not a complete reward-security rollout.
Eight protocol tests, mobile TypeScript and clean iOS/Android bundle exports passed. Database
known-outcome tests cover grading, duplicate completion, ownership, expiry, content changes,
case context and exactly-once flashcard history. Profile/onboarding/quarantine regressions passed.
Fixtures were rolled back. Serving remains strict: 33,719 questions and 439 cases, zero quarantine
leaks measured. No Auth settings or sign-in code changed; a fresh phone sign-in was not tested.
