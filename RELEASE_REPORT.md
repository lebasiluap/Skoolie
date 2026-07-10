# Skoolie — Release Readiness Report

## Delta audit (July 10, pre-TestFlight) — PASSED
All 12 changed areas since the first audit re-verified adversarially (two passes): profile modals/keyboard/name rules, IntroGate rewrite, theme dissolve, auth generation guard, routing guards, OAuth callback alias, league zone guards + namespaced keys, flashcard fallbacks, app.json/entitlements store-readiness, feature-lab isolation (zero imports, migrations inert), intros copy, strict tsc. One P1 found and FIXED: the Android OAuth deep link was redirected to login pre-session (guard exemption hoisted). No P0s. **Verdict: production-ready for TestFlight** pending the owner checklist below.

## Pre-TestFlight owner checklist (Paul)
1. Push notifications (only real feature gap): `npm i -g eas-cli && eas login && cd SkoolieApp && eas init` → `eas credentials` (iOS push key; Android FCM needs Firebase project + google-services.json). Can ship TestFlight WITHOUT this — local notifications work; zone pushes stay dead until done.
2. Supabase dashboard: remove `exp://*/--/auth/callback` redirect URL; remove `host.exp.Exponent` from Apple provider Client IDs; enable HaveIBeenPwned password check (Auth settings).
3. Rotate the burned Vercel token + Resend API key.
4. Resend inbound for support@: MX record in Vercel DNS + webhook → support-inbox function + 2 secrets (function already deployed). MUST work before public launch; optional for TestFlight.
5. Decide Yumeko: restore from snapshot_yumeko or keep as-is.
6. Build & archive: `npx expo prebuild -p ios --clean` (picks up buildNumber/icons cleanly), open Xcode → Product → Archive → Distribute → TestFlight. Xcode flips aps-environment to production automatically.
7. App Store Connect: create the app record (com.skoolie.app), screenshots, description, privacy questionnaire (data collected: email, name, usage stats — linked to identity; no tracking), age rating, review notes with a TEST ACCOUNT login for Apple reviewers.
8. Play later: same repo is Android-ready (versionCode 1, permissions trimmed); needs a keystore + Play Console listing when you're ready.
9. Content: repopulate genuinely-easy questions (your Opus workflow) — regrading will validate labels automatically as answers accumulate.
10. Legal: entity/lawyer skim of lib/legal.ts; host nothing extra — /terms + /privacy already live on skoolieapp.com.

July 9, 2026 · Full-organization audit (QA × 4 departments, Security, Performance, Release Management)

## How this was run

Four independent QA audits (auth, practice modes, progress/social/profile, cross-cutting), a live security audit against the production database (Supabase advisors + RLS + grants + secrets sweep), and a release-config review. Every Critical/High claim was verified against the actual code or live data before being fixed — several agent findings turned out to be false alarms and are recorded as such. TypeScript strict passes after every change.

## Issues found and FIXED this pass

**Security (live database)**
1. `league_zone_push()` was callable by any signed-in client (and anon) — anyone with the app's key could trigger push-notification sends. Revoked; now infra-only (pg_cron).
2. The `anon` (signed-out) role could execute ~50 SECURITY DEFINER RPCs. All revoked; only `authenticated` keeps access. Verified the app's own calls still work.
3. Avatars bucket allowed listing every file — filenames are user IDs (user-enumeration leak). Listing policy dropped; public URLs unaffected.
4. Three functions had mutable search_path (`bot_week_xp`, `league_effective_promote`, `league_promote_count`) — pinned.

**Data-integrity / correctness**
5. AsyncStorage dedupe keys were not user-namespaced (`weekResult:`, `tourneyStage:`, `tourneyEnd:`, `leagueZone:`, `zoneNotif:`, `lbRanks:`) — switching accounts on one phone inherited the previous user's celebration flags, zone state, and movement arrows. All six key families now include the user ID.
6. Sign-out during an in-flight profile fetch could resurrect the old profile (flash of onboarding/dashboard). Added an auth-generation guard in useAuth.
7. Rapid fire served near-identical question sets (curated questions had absolute priority; repeat preference ignored) — rewritten server-side; verified 3 pulls share only 2/15 questions.
8. Flashcard `back` gets a `?? ''` guard so a future content import with null answer+explanation can't crash the deck (current DB: 0 such rows).

**Release configuration**
9. Added `ios.buildNumber` and `android.versionCode` (required at submission).
10. Removed deprecated `READ/WRITE_EXTERNAL_STORAGE` Android permissions (Play-review flag; the photo picker doesn't need them). CAMERA kept.

**Earlier in this same session (also part of this pass)**
11. Avatar upload: RLS path mismatch + RN bytes bug (file uploaded as 238-byte descriptor) — both fixed, uploads work.
12. Duplicate celebrations (React updater double-invoke) + "Level 5 twice" + wrong freeze copy — fixed.
13. Profile-screen toggles going stale vs. top-bar timed-mode sheet — fixed (re-sync effect).
14. Chart value pills wrapping ("134" → "13/4") — fixed.
15. OS font-size change mid-session breaking layout — auto-remount on fontScale change.
16. Onboarding sign-out dead end — router now returns to login.
17. Apple sign-in end-to-end (entitlements, provisioning, Supabase provider) — verified on a physical iPhone.

## Claims investigated and REJECTED (false alarms)

- Double-save/double-XP in practice modes — every mode has a `sessionSavedRef` guard. Clean.
- Flashcard/MCQ null-content crashes — live DB has zero offending rows (checked all 3 shapes).
- Rapid-fire timer leaks — all timers/animations have cleanup on unmount.
- Forgot-password cooldown lockout — cooldown only sets on success / resets on error. Clean.
- Signup polling with stale credentials — fields aren't editable while polling. Clean.
- Avatar-upload spinner stuck forever — try/finally already guarantees reset.
- "Hardcoded Supabase keys" — only the anon key ships, which is public by design. No service keys, no third-party tokens anywhere in the repo.

## Accepted risks / low-priority observations

- Session tokens live in AsyncStorage (Supabase's documented RN default). Migrating to a SecureStore-backed adapter is a nice post-launch hardening.
- `pg_trgm`/`pg_net` extensions live in the public schema (advisor INFO; moving pg_net risks the cron job — leave until a quiet moment).
- Empty-policy RLS tables (case_studies, league_bots, tournament_evals, zone_push_state) are **intentional** deny-all; content flows through RPCs.
- Onboarding topic-load has no timeout spinner cap; challenge card has no skeleton — cosmetic.
- Zone-boundary math with cohorts < 3 humans is masked by bot backfill to 13.
- Tiny UX nits from audits (OTP maxLength 10 vs 6, "Student" fallback name, goal-ring a11y denominator) — cosmetic backlog.

## Platform differences

- iOS: ready pending the manual device checklist below. Entitlements (Sign in with Apple, push) verified in the built binary; Cappy icon set generated for all slots.
- Android: config now submission-shaped (versionCode, trimmed permissions, adaptive icons exist), but **no Android build has ever been run in this project** — a first `expo run:android` shakedown is required before any Play submission. Back-button behavior, edge-to-edge insets, and Google sign-in on Android are untested.

## Manual device-test checklist (cannot be verified from code)

1. Kill app mid-quiz → reopen → verify no stuck focused-session (hidden tab bar).
2. Airplane mode during a run → finish → verify save-failure toast + retry works.
3. Change OS text size to max while app is open → UI remounts cleanly.
4. VoiceOver pass over login, MCQ answering, leaderboard.
5. Push notification end-to-end on the physical iPhone (zone pushes fire 9am–9pm UTC every 2h).
6. Account switch on one device → no ghost celebrations/arrows (fixed this pass — confirm).
7. Low-end Android device pass, once an Android build exists.

## Sign-off checklist still owned by Paul (from the launch memory)

Remove `exp://` redirect + `host.exp.Exponent` client ID · rotate Vercel/Resend tokens · Resend MX + webhook + secrets for support@ · restore/drop Yumeko · legal entity + lawyer skim · Resend plan upgrade · host /terms + /privacy · enable HaveIBeenPwned password check (Supabase Auth settings) · App Store/Play metadata, screenshots, privacy questionnaires.

## Loop 2 (regression pass — attempting to break Loop 1's fixes)

**New issues found and fixed:**
- The anon revoke had a loophole: Postgres default privileges would silently re-grant EXECUTE to anon on every *future* function created by a migration. Default ACLs altered — new functions are now locked down automatically.

**Regression checks that passed:**
- `service_role` retains EXECUTE on all functions (web app server-side unaffected).
- Every RPC-calling web page redirects unauthenticated visitors to /login before calling, and SSR clients carry the user session — the anon lockdown breaks nothing on skoolie.vercel.app.
- All hot query paths verified indexed (user_question_history, quiz_sessions, league_standings weekly board, claims, bookmarks, trophies) — no missing-index performance risk at launch scale.
- Walked each Loop-1 client fix for side effects: the namespaced AsyncStorage keys cause a one-time re-baseline of movement arrows/zone state (by design, no spam); the fontScale remount preserves session and re-routes cleanly; the chart pill fits 3-digit values at the capped font scale; the auth generation guard cannot mis-fire on normal sign-in (only sign-out bumps it).
- TypeScript strict: clean.

One residual note: `ios.buildNumber`/`android.versionCode` in app.json only reach native projects at next `expo prebuild` — Xcode's archive step manages the iOS build number independently, so this is informational, not a blocker.

## Scores

- **App Store readiness: 88/100** — code and config are submission-ready; the missing points are the manual device checklist, store metadata/privacy questionnaire, and the owner checklist above.
- **Google Play readiness: 62/100** — config is shaped correctly, but an untested platform can't score higher; one build-and-fix pass on Android hardware is the gap.
- **Overall production readiness: 85/100** — nothing known-broken remains in code or backend; the remaining distance is device verification and store paperwork, which are inherently outside a code audit.

A 100/100 claim without running on devices would be dishonest — the fastest path there is the 7-item manual checklist plus the owner sign-off list.
