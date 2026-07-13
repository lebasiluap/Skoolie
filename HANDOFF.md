# SKOOLIE — PROJECT HANDOFF
_Last updated: July 12, 2026 (evening). Written so any AI model or developer can pick up where we left off._

Owner: Paul (PharmD, Ghana) — lebasiluap@gmail.com
NEVER paste API keys/tokens/secrets in chat. Two keys were burned that way already and had to be rotated.

---

## 1. WHAT THIS PROJECT IS

**Skoolie** — exam-prep app for healthcare students (pharmacy, medicine, nursing, dentistry, midwifery). MCQs, flashcards, clinical cases, rapid fire, XP/levels (400 XP per level), streaks, weekly leagues (Duolingo-style), trophies, readiness score. Tagline: "Know exactly what to study next." 100% built by a pharmacist; questions from reputable textbooks.

Repo layout (this folder):
- `SkoolieApp/` — **the product**: Expo SDK 54 / React Native 0.81 / TypeScript strict / expo-router / Supabase. This is what "the app" means.
- `src/` (repo root) — Next.js marketing landing page only (skoolieapp.com). Login/signup redirect to `/`; no web app product anymore. Web practice pages exist but are not the focus.
- `SkoolieApp/features/{courses,duels,quests}/` — **isolated post-MVP feature lab**. Excluded from store builds via Metro config. DB migrations for these are staged .sql files, NOT applied. Never wire these into v1 without Paul's go.
- `Play Store Assets/` — icon 512, feature graphic 1024×500, store listing copy.
- `RELEASE_REPORT.md` — full audit ledger from the release-protocol runs.

## 2. INFRASTRUCTURE & CONNECTED SERVICES

| Service | Details |
|---|---|
| Supabase | Project `skoolie`, ref `bqhiwlpmrejvjdljxspy`, eu-west-1, FREE plan. All content + auth + RPCs. Accessible via Supabase MCP in Claude. ~32k questions, ~1.2k case studies. |
| Vercel | Team `bigmind-hub-projects`, project `skoolie`, Hobby plan. Hosts skoolieapp.com (landing + /terms + /privacy). **Deploys ONLY via `npx vercel --prod` on Paul's machine** — git pushes make previews only. |
| GitHub | https://github.com/lebasiluap/Skoolie (branch `master`). Sandbox/AI can commit locally; Paul pushes. |
| Expo/EAS | Account `lebasiluap`, project `skoolie`, projectId `84f84d1c-56f3-485b-a7e2-8545e7633dd5`. eas.json: appVersionSource **remote** + autoIncrement. Android keystore is EAS-managed ("Build Credentials 1g1YU63etJ"). |
| Apple | Individual dev account, team `62X7N85N4Y` ("PAUL AKYIN SACKEY"). ASC app name **"Skoolie Med"** (Skoolie was taken), SKU `skoolie`, bundle `com.skoolie.app`. APNs push key ID `92QMCUC896`. |
| Google Play | Personal account. App name **"Skoolie"**, package `com.skoolie.app`. New-account rule applies: closed test with **12+ testers for 14 days** before production access. |
| Firebase | Project `skoolie-e4e5c` (FCM only; Analytics accidentally enabled — harmless). `google-services.json` committed in SkoolieApp/ (safe per Google). FCM V1 service-account key uploaded to EAS credentials (the local JSON can be deleted; NEVER commit it). |
| Resend | Domain skoolieapp.com verified. Powers Supabase auth emails (custom SMTP, sender no-reply@). Free tier: 100 emails/day. Support inbox partially set up (see §4). |
| GCP OAuth consent | App name "Skoolie" + Cappy logo fixed. Still shows "continue to bqhiwlpm….supabase.co" — fix requires Supabase Pro + custom auth domain (see §4). |

Auth providers live: email/password (in-app OTP password reset via `{{ .Token }}` template), Google OAuth, Apple Sign-In (verified on device).

## 3. RELEASE STATE (as of July 12, 2026 evening)

### iOS
- **Build 1.0.0 (2)** (carries BOTH auth fixes) uploaded July 12: live in internal group; submitted to External Testers → **Waiting for Beta App Review**. Build 1 was expired/removed from review to free the slot (only one build per version can be in beta review). Public link `testflight.apple.com/join/4fzubWGf` activates on approval (~100 cap set).
- **App Store product page PREPPED (not submitted)**: description/keywords/URLs saved, 10 screenshots in 6.5" slot (source files in `App Store Assets/`, numbered upload order), review sign-in (testskoolie) + notes, release mode = MANUAL, App Privacy published (6 types: email, name, user ID, device ID, photos, product interaction — all linked, none tracking), age rating **16+** (Medical-Frequent + Contests-Frequent, all else None/No), subtitle "Daily practice for health pros", category Education+Medical, content rights = no third-party content. iOS prep 100% complete (July 12). DO NOT press "Add for Review" until public launch after beta.
- Compliance answer used: "None of the algorithms mentioned above".

### Android
- **SUBMITTED TO GOOGLE FOR REVIEW July 12** ("Submit 15 changes for review" from Publishing overview): closed-testing release (versionCode 4 — includes the OAuth dormancy fix), full store listing (copy + icon + feature graphic + 8 Samsung screenshots), all declarations done (content rating Everyone/educational, target 18+, data safety 6 types, sign-in details w/ testskoolie creds, financial none, health none, ads no, advertising-ID no, privacy + delete-account URLs), countries = all 177. Track "Alpha", tester list "Skoolie Beta Testers" (4 emails so far — need 12+), feedback = support@skoolieapp.com.
- On approval (typically 1–3 days): join link appears on the track's Testers tab → send to testers → **14-day clock starts when 12 opt in** → then "Apply for production".
- Build history: versionCode 3 failed→fixed (package-lock missing react-dom/scheduler → pinned `react-dom@19.1.0`, commit 9eeefe1).
- Push notifications wired end-to-end on both platforms (APNs key + FCM V1 key in EAS).

### Web / landing
- skoolieapp.com live: parallax landing, SEO (JSON-LD, robots, sitemap, OG), legal pages. Store badge links are `'#'` placeholders in `src/components/StoreBadges.tsx` (`STORE_LINKS`) — **paste real store URLs at launch**.

## 4. PAUL'S TODO LIST (launch checklist)

**Now / in progress:**
- [ ] Recruit 8+ more Android testers into the "Skoolie Beta Testers" email list (4/12) — clock starts when 12 opt in after Google approves
- [ ] Await Google review (Android closed test) → send join link to testers
- [ ] Await Apple Beta App Review (build 2) → share public TestFlight link `testflight.apple.com/join/4fzubWGf`
- [ ] `git push` — unpushed commits: 9eeefe1 (lockfile), 757ca49 (sign-in fix), ab12d02 (delete-account page) (+ verify skoolieapp.com/delete-account deployed via `npx vercel --prod`)

**Support email (support@skoolieapp.com) — ✅ DONE & VERIFIED July 12** (edge fn deployed; MX `inbound-smtp.eu-west-1.amazonaws.com` prio 10 at root in Vercel DNS; webhook email.received; both secrets in Supabase; test mail delivered to Gmail end-to-end).

**Before/at public launch:**
- [ ] Remove `exp://*/--/auth/callback` from Supabase Auth redirect URLs (dev-only)
- [ ] Supabase Pro upgrade ($25/mo) + custom auth domain add-on (~$10/mo) as ONE coordinated switch (not mid-beta): CNAME `auth.skoolieapp.com` in Vercel DNS → update Google OAuth redirect URI → swap SUPABASE_URL in app+web → new builds. Fixes the "continue to bqhiwlpm…supabase.co" consent line.
- [ ] Store links into `STORE_LINKS` (StoreBadges.tsx) + redeploy web
- [ ] Google Search Console: submit sitemap
- [ ] Legal entity + DUNS → Apple/Google org enrollment (shows "Skoolie" instead of Paul's name); migrate all infra to a Skoolie-owned email in one sweep POST-launch
- [ ] Resend Pro (~$20/mo) at ~80 signups/day; Vercel Pro when commercial
- [ ] Restore/keep Yumeko test account as needed — full backup in DB schema `snapshot_yumeko` (restore SQL in memory/yumeko-snapshot; watch generated columns `confirmed_at`, `identities.email`)
- [ ] Easy-question repopulation: Paul's own Opus workflow (NOT the assistant's job — work scope is bug fixes & features, never question-bank generation)
- [ ] Lawyer skim of Terms/Privacy (operator entity, Ghana jurisdiction)

**Deliberately deferred (do NOT do unasked):**
- Supabase Captcha protection: **NEVER enable** — app sends no captcha tokens; it would lock out all sign-ins
- Per-user rate limiting on content RPCs (phase-2 scrape protection)
- Leaked Password Protection toggle (Pro feature)
- Feature-lab wire-up (courses/duels/quests) — only when Paul says go

## 5. CRITICAL TECHNICAL GOTCHAS (read before coding)

- **supabase-js deadlock (TWO separate hangs, both fixed):** (a) never await supabase calls inside `onAuthStateChange` — defer with `setTimeout(0)` (shipped as the build-1 Apple sign-in hang); (b) after long dormancy the cold-start token refresh can hang forever (RN fetch has no timeout) while holding the auth lock → any sign-in queues behind it ("Signing in…" until app kill). Fixed July 12 (commit 757ca49): global 30s bounded fetch in `lib/supabase.ts` + 20s `withTimeout` (lib/withTimeout.ts) with friendly errors on all auth flows (login/signup/appleAuth). Builds BEFORE versionCode 4 (Android) / build 2 (iOS) lack fix (b).
- **Content access:** writes (insert/update/delete) on `questions`/`case_studies` are admin-only via RLS (`is_admin()`); SELECT is authenticated-readable. WARNING: an earlier admin-only-SELECT change broke the live web app (practice/search/bookmarks query these tables directly with the user session) and was reverted same-day — if bank-scrape hardening is ever wanted, port ALL web content pages to SECURITY DEFINER RPCs first. anon is revoked from ALL public functions/tables; default privileges keep future functions locked.
- **Question reports + admin CMS (July 12):** `question_reports` table (RLS: users insert/read own, admin full; unique partial index = one OPEN report per user per item). In-app `ReportButton` (components/ui/ReportButton.tsx) on MCQ/flashcard/case review screens → reason picker + note → insert. `record_answer` now takes optional `p_user_answer` (the ORIGINAL option letter, un-shuffled) captured in mcq/rapidfire/challenge — powers the miskey audit. `admin_miskey_audit(min_acc,min_answers,min_attempts,wrong_rate)` RPC (admin-only) flags MCQs where high-accuracy users converge on a non-keyed option. Web admin (skoolieapp.com/admin, gated to lebasiluap@gmail.com via is_admin) gained: `/admin/reports` (queue w/ resolve/dismiss/reopen/bulk + open-count nav badge), `/admin/audit` (miskey list w/ tunable thresholds), and "New question" create modal on `/admin/questions` (MCQ+flashcard; options stored in CANONICAL bank format — letter-prefixed string array `["A. text", ...]`, correct_answer = letter; an earlier `[{key,value}]` format rendered as "[object Object]" in both clients and was fixed same-day). Migrations: `question_reports_and_admin_cms`, `restore_authenticated_content_reads`, `admin_stats_rpcs`.
- **Admin CMS overhaul (July 12, post-audit):** all analytics now via `admin_dashboard_stats()` / `admin_user_stats()` / `get_distinct_categories()` SQL RPCs (exact, uncapped — raw PostgREST reads silently cap at 1000 rows and page_views had already crossed it). Dashboard adds Easy-Coverage card (difficulty mix), reports-by-reason, honest labels (attempts vs unique questions, UTC on hourly). Users page: search + 6 sort modes + per-user attempts/accuracy. Reports/Audit "Edit question →" deep-links by `?id=` (questions page supports single-question filter). Shared UI kit at `src/app/admin/ui.tsx` (all pages use it; chips/buttons/inputs/modals/eyebrows unified; `--purple`/`--purple-tint` vars added to globals.css both themes). Admin sign-in: web login is retired, so `/admin-login` (noindex) mints the browser session via Google OAuth → `/auth/callback?next=/admin`; admin layout routes signed-out → /admin-login, non-admin → /dashboard. Requires `https://skoolieapp.com/auth/callback` in Supabase Auth redirect allow-list.
- **No auth trigger creates user_profiles** — onboarding INSERT must supply email + full_name (NOT NULL).
- **XP:** 400/level; flashcards earn ZERO XP (anti-farm) but count toward streak; XP credits flow through `credit_xp` RPC (both app and web).
- **MCQ data shapes vary** — always use `lib/answers.ts` normalizers + `buildShuffledMcq` (bank is B-biased; runtime shuffle fixes it).
- **Name rules (server-enforced):** trg_enforce_name_rules — profanity filter w/ leetspeak folding + 3 changes per 30 days (errors NAME_NOT_ALLOWED / NAME_RATE_LIMIT mapped to friendly alerts in profile.tsx).
- **Dynamic difficulty regrading:** nightly cron 02:10 UTC regrades questions from crowd stats (≥10 answers; ≥75% easy / 40–75 medium / <40 hard); `difficulty_source` manual|auto|locked.
- **Adaptive difficulty serving (July 12):** when no explicit difficulty filter, the content RPCs (get_random_mcqs/flashcards/cases, get_questions_by_topic) serve a skill-weighted mix from the user's last 30 answers — new users get 80% easy (confidence onboarding), struggling 70/25/5, strong 10/40/50; shortfalls backfill easier-first for struggling users. Internal helper `adaptive_weights(uuid)` is NOT client-callable. Explicit difficulty filters unchanged. Rapid fire untouched. All server-side — no app build required to tune.
- **Serving perf (July 13):** the RPCs use INDEXED RANDOM SAMPLING, not full-bank scans: `questions.rand_key` (random float, reshuffled weekly by pg_cron `questions-rand-reshuffle`) + serving indexes; helpers `sample_question_ids`/`sample_topic_question_ids` walk the index from a random start. At 52k questions this took get_random_mcqs from 2.3s → ~95ms and get_questions_by_topic → ~40ms. If fetches ever slow again as the bank grows, suspect a new filter bypassing these indexes — do NOT revert to ORDER BY random() over the full set (migrations `fast_random_serving`, `fast_random_serving_by_topic`).
- **League system:** per-profession weekly boards; 144 display-only pacer bots partitioned by league tier (never in standings); bronze never shows relegation; diamond top = Tournament. Disclosure in ToS §7.
- **AsyncStorage keys are user-namespaced** (weekResult:{uid}: etc.) — keep that pattern.
- **iOS entitlements** regenerate correctly from `npx expo prebuild -p ios --clean` (aps-environment + applesignin). Android/ and ios/ folders are gitignored (generated).
- Multi-statement SQL snapshot gotcha: scalar subqueries in the same SELECT as a volatile function read the pre-function snapshot — verify stepwise.

## 6. WORKING CONVENTIONS (for AI assistants)

- Work on **SkoolieApp/** (mobile) per project instructions, not the web app, unless told otherwise.
- TypeScript check: from `SkoolieApp/` run `./node_modules/.bin/tsc -p /tmp/tsconfig.check.json` — create `/tmp/tsconfig.check.json` (strict, jsx react-native, moduleResolution bundler, paths `@/*`→`./*`, include app/components/hooks/lib/contexts/constants). Web: `./node_modules/.bin/tsc --noEmit` from repo root.
- Git: commit with `git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit …`. The sandbox has no GitHub credentials — **Paul pushes**.
- Global npm installs fail (EACCES) on Paul's Mac — always `npx <pkg>`.
- Supabase changes via the Supabase MCP (`apply_migration` for DDL). Feature-lab DDL stays as staged files.
- EAS commands: `npx eas-cli …` from SkoolieApp/. Reading EAS build logs: `build:view <id> --json` → curl the signed logFiles URL → brotli-decompress it.
- Question bank content generation is OUT OF SCOPE for assistants (Paul's own workflow).

## 7. POST-MVP ROADMAP (paywalled, isolated until go)

1. **Courses** (flagship) — Duolingo-style dynamic tracks composed from question indexing (difficulty/topic/cognitive_type); no hand-built lists. Lab code exists in `features/courses/`.
2. **1v1 duels — FREE** (not paywalled) — async, same 10 questions, best score. Lab: `features/duels/`.
3. **Daily quests + weekly chest** — lab: `features/quests/`.
4. Custom flashcards (private decks), AI explanations (edge-function LLM proxy), offline packs (paywall), schooling-facts pushes (1–3/day fact notifications), mock exams, readiness projection, streak repair, custom quiz builder, cosmetics, season pass.
5. School/semester banks: DROPPED.
Monetization runs through Google Play Billing / Apple IAP inside the free apps.

## 8. KEY ACCOUNTS/IDS QUICK REFERENCE

- Bundle/package: `com.skoolie.app` (both platforms)
- Supabase ref: `bqhiwlpmrejvjdljxspy`
- EAS projectId: `84f84d1c-56f3-485b-a7e2-8545e7633dd5`
- Firebase: `skoolie-e4e5c`
- Apple team: `62X7N85N4Y`; ASC name "Skoolie Med"; APNs key `92QMCUC896`
- Test account: testskoolie@gmail.com ("Yumeko", uid `398e7b9d-abd1-47db-9bee-283c6e0938e0`)
- Domain: skoolieapp.com (DNS in Vercel)
