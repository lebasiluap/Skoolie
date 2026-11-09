# Skoolie Apple release readiness — 9 November 2026

Scope: Apple release blockers, account deletion, public avatars and accurate disclosures. Claude co-reviewed exact source in the existing Skoolie review chat. No medical audit, question edits, public submission or tester emails were performed.

## Critical (must fix before launch)

- **Real-device deletion verification remains open.** Use dedicated disposable accounts only, never the administrator or existing beta testers. Verify Apple exchange → identity validation → revocation → deletion, native prompt cancellation, manual Apple-disconnect fallback, non-Apple deletion, lost responses and uncertain authentication outcomes. Permanent test-account deletion requires explicit approval at execution.
- Build and distribute updated signed iOS/Android binaries before claiming these client changes are available. Local Hermes exports are compile checks, not uploaded releases.
- Publish the matching website legal copy. Both repository legal copies match, dated November 9, but this turn did not deploy the website.
- Before public submission, attach the verified release build, check current screenshots and reviewer access, and exercise the deletion sheet with the keyboard on small phones. The public iOS draft still had no build attached. No Add for Review action was taken.

## High Priority

### Implemented and live

- Apple Sign in server secret entries saved in Supabase. Only names/digests were used for verification; no key material belongs in source or this report. The replacement Sign in with Apple key is separate from the unchanged APNs key.
- Authenticated `delete-account` Edge Function deployed ACTIVE, version 1, with gateway JWT verification enabled. Unauthenticated live POST returned HTTP 401; no live account was deleted.
- The endpoint derives the target solely from a server-verified bearer identity, requires explicit DELETE confirmation, validates Apple JWT signature/issuer/audience/subject, revokes the fresh grant before deleting, removes caller-owned uploads through Storage API, clears personal question reports, then deletes the Auth user. Bounded input and request deadlines fail closed. Existing legacy deletion RPC and Auth provider configuration remain unchanged.
- Curated public avatars applied to the four released public profile/leaderboard/league/tournament RPC projections. Owner-uploaded photos remain intact on the owner's profile. Private helper execution is not granted to ordinary clients.
- Apple App Privacy published with nine collected types, all account-linked and none used for tracking: Name, Email Address, User ID, Device ID, Photos or Videos, Customer Support, Product Interaction, Performance Data and Other Diagnostic Data. Corrected the inherited User ID linkage mismatch. Preview details show only the linked section.
- Public store draft description/keywords saved with accurate educational positioning, supported professions, and no unsupported exam-readiness promises. Not submitted.

### Implemented in client/source, not yet distributed

- Isolated Apple deletion reauthorization does not alter normal Apple sign-in. Cancellation does not delete. Manual fallback remains available.
- Deletion uses a synchronous double-tap lock, bounded request, non-dismissible busy state and finally cleanup. An uncertain 401/403 clears invalid local credentials but never falsely reports deletion. Network/5xx uncertainty preserves the session.
- Successful deletion independently cancels local reminders, removes only exact user-namespaced local data, and signs out locally. Individual cleanup failures cannot misreport a confirmed server deletion.
- Notification rebuilds/cancellation are serialized and drain issued native schedules. Separate account/schedule generations avoid invalidating valid push registration during screen refreshes. Ordinary sign-out conditionally clears only the departing user's matching device token; remote cleanup has a five-second wait budget. Offline remote token removal remains best-effort, not guaranteed. APNs/FCM credentials and configuration were not modified.
- Released public avatar call sites use curated rendering; owner Profile/TopBar retain uploaded photos. This is not a claim that a comprehensive social moderation system was built.
- Matching mobile/web legal text explains deletion, report removal, manual Apple fallback, curated public visibility, and the existing public-URL nature of uploaded photos. No routine in-app changelog paragraphs were added.

## Medium Priority

### Verification evidence

- Full automated suite: **147 tests passed**, zero failures, including real handler adapters and mocked native scheduling/registration races.
- Targeted mobile TypeScript check passed. Deletion endpoint Deno check passed.
- iOS and Android Hermes exports passed; these are not signed store builds.
- Rollback-only live public-avatar regression passed under an ordinary authenticated role, including private-helper denial.
- Rollback-only live own-profile/Auth/quarantine isolation regression passed. No persistent fixture changes.
- Guard-function digest before/after: `14164a2c834584ba44ec8a4fbddfd096`.
- Strict serving remains `cleared_only`; clearance certificates unchanged at **33,719 questions and 439 case studies**. No audit content was opened or edited for this release task.
- Security advisor findings unchanged. Existing private-table no-policy notices and intentional authenticated definer RPC notices were not 'fixed' by broadly granting access or removing required RPC permissions.
- Normal sign-in configuration and verified reward functions were not changed. Physical-device sign-in smoke tests remain necessary; database regression is not a substitute.

### Claude review influence

Claude's exact-source reviews identified lost-response reconciliation, bounded deletion calls, notification cleanup, late-native-schedule races, per-account push registration generation and offline sign-out waits. Confirmed issues were fixed and regression tests added. The profile caller explicitly handles `deleted:false` without success messaging. Final exact-source review: “No bugs in this final change.” Prior blanket claims were narrowed to measured evidence; device tests remain a release gate.

## Low Priority

- SQL and client fallback avatar hashes differ, but server-returned curated presets are preserved, so released RPC-backed views agree. No private image URL is rendered when `publicId` is present.
- Existing public avatar storage has inferable public URLs; curated public rendering does not retroactively make the bucket private. Disclosures state that limitation accurately.
- Optional additional hardening: reject a fresh old-user reminder rebuild queued after cleanup during the short sign-out window. Existing in-flight work is invalidated/drained; no claim of a global account-transition scheduler was made.
- No tester notification emails were sent. No existing tester accounts were deleted or modified for testing.

## Overall Verdict

Backend safeguards and source fixes are implemented; automated and database checks pass. **Not yet certified for public release.** Remaining work is matched website deployment, updated signed binaries, real-device disposable-account deletion/sign-in checks and final submission assets. Apple approval is never guaranteed by passing local tests or completing a medical content audit.
