# Skoolie — UX/UI Design Audit

**Scope:** Full application audit — every screen, flow, and system as implemented today.
**Posture:** Pre–Series A review. Brutally honest. No redesigning — evaluation, prioritization, and justification only.

---

## Executive Summary

Skoolie has a genuinely strong core: the assessment loop (question → instant verdict → explanation → aggregate insight) is real, the analytics engine (readiness, diversity, tier) is more sophisticated than most competitors ship at launch, and the visual language is warm, coherent, and theme-complete. The bones are good.

The problems are equally real. The app currently runs **eight parallel progression systems** (XP, levels, tiers, weekly leagues, streaks, streak freezes, barrages, combos) with no explanatory layer, which turns its greatest strength — motivation engineering — into its greatest source of cognitive load. The dashboard tries to be every system's home page at once. Reward moments (level-up, tier-up, promotion) happen silently in a database while the user watches a number change, which squanders the entire point of having those systems. And a handful of table-stakes gaps (no password recovery, silent data-loss on abandoned quizzes, fire-and-forget writes that fail invisibly offline, weak text-scaling support) are launch blockers, not polish items.

**Verdict up front: iterate, do not redesign.** Detail in Section 10.

---

## 1. Information Architecture

### What works

The five-tab structure (Dashboard / Practice / Search / Progress / Profile) is fundamentally sound and maps to real user intents: *orient me, quiz me, find something, how am I doing, configure me.* Practice's hub-with-runners pattern (hub → mode → topic list → session) is a clean, predictable stack. The Progress split between a personal-first page and a deep Insights page — with the readiness hero deep-linking to the top and "See all" deep-linking to the analytics section — is thoughtful IA that most apps get wrong.

### What fails

**The Dashboard has no editorial point of view.** It currently stacks: greeting → barrage banner/teaser → timed-mode banner → rank card (which itself contains tier, weekly XP, rank progress, *and* level) → streak tracker → four mode shortcuts → recent activity + Time Capsule link → four stat tiles → topic performance. That is nine sections answering four different questions. A dashboard's job is to answer *one* question — "what should I do right now?" — and everything else is reference material. Nothing on this screen is wrong individually; collectively it is a corkboard.

**Duplication between Dashboard and Practice hub.** "START STUDYING" mode shortcuts on the dashboard duplicate the Practice tab's entire reason to exist, minus the counts and Smart Start/Browse split. Users will build a habit around one and be confused about what the other is for. Either the dashboard shortcuts should be a single smart CTA ("Continue where you left off" / today's plan item), or the Practice hub should absorb the shortcut role entirely.

**Search as a top-level tab is questionable.** For a revision app, search is a reference behavior, not a daily loop. It earns its place only if users genuinely look up conditions mid-study. Meanwhile *Bookmarks* and *Time Capsule* — both core to a revision loop ("review what I saved," "revisit what I got wrong") — are buried behind secondary links on other screens. The IA privileges the least mission-critical retrieval surface and hides the two most mission-critical ones.

**Settings sprawl.** Timed mode is configurable from three places (TopBar clock, Practice banner, Profile). That redundancy was a deliberate choice and works, but the general pattern is drifting: country, interests, timed mode, repeat questions, and tags all live in Profile; theme is in Profile *and* TopBar; notifications have no surface at all (no way to see or mute what the app will send). There is no single mental model for "where do I control Skoolie?"

**Missing entirely:** any onboarding into the *systems*. Tiers, freezes, barrages, leagues, and readiness are all discoverable only by encountering them. There is no "what is this?" affordance anywhere — not a single info icon in the app.

---

## 2. User Experience

### Cognitive load

The single biggest UX issue in the product. A new user's first dashboard shows: a level, a tier name they've never heard of ("Fresher"), weekly XP, a streak, possibly a barrage teaser with a 🧊 reference to a system they don't know, and a rank progress bar captioned "broad practice counts double" — a sentence that only makes sense after understanding the diversity algorithm. Every one of these is well-built. Together they violate Miller's Law before the user has answered one question. Duolingo, the obvious benchmark, introduces streaks, gems, hearts, and leagues *one at a time over days* through forced encounters. Skoolie fire-hoses them.

### Friction inventory

The MCQ loop costs two taps per question (select → submit, then next), plus the review overlay. That's defensible for deliberate practice — but the overlay **covers the question stem**, so a user reading the explanation cannot re-read the question they got wrong. This is the most-repeated interaction in the app and it fights comprehension. (Tap-to-dismiss partially mitigates, but dismissal is also *too* easy — a stray tap anywhere dismisses the explanation with no way to bring it back.)

Quitting mid-quiz via the X abandons the session **instantly and silently** — no confirmation, no partial credit, no "resume?" A user 18 questions into a 20-question timed session loses everything to one mistap on a 36px target. This is a genuine data-loss pattern (Nielsen #5, error prevention — violated at the highest-traffic point in the app).

MCQ setup shows four filter groups (difficulty, session size, cognitive type, focus) plus a three-level topic accordion before a session can start. Smart Start rescues this for returning users, but "Browse topics" users face a Hick's Law wall. Filter state also persists invisibly between visits (FiltersContext), so a user who set "Hard · Interpret · High Yield" last week gets mysteriously empty topic lists today with no banner explaining why.

### Discoverability

Streak freezes are the standout failure: the *only* place the mechanic is explained is inside barrage messaging. A user who sees a blue snowflake day in their tracker has no way to learn what happened. Same for tier mechanics ("why did I become an Apprentice?"), league promotion rules (explained only via two small chips), and the seen/unseen question ordering. The app has deep systems and zero pedagogy about them.

### Accessibility

This is below bar for launch. Font scaling is guarded on exactly one text element (TopBar title) — everywhere else, a user with large accessibility text will break layouts (hero numerals, chip rows, the streak tracker week). Several touch targets are 30–38px against the 44pt platform guideline (quiz X button, bookmark toggle, timer chips). `textFaint` (#90A099) on the light background (#EEF2F1) is roughly 2.6:1 — used for *meta text everywhere*, well under WCAG AA's 4.5:1 for small text. Color is the sole channel for the rapid-fire time bar state, and there's no reduced-motion path for the mascot animations or screen transitions. None of these are exotic users for a healthcare-professional audience.

### Flow gaps

No forgot-password entry point exists on the login screen — an account-recovery dead end that guarantees support burden and lost users (the branded-email work was deferred, but the *link* can't be absent at launch). Login errors surface as native `Alert` dialogs, the heaviest possible interruption for a typo. And the entire app assumes connectivity: XP crediting, streak updates, and history writes are fire-and-forget; on a Ghanaian commuter's flaky connection, a completed session can silently earn nothing, with no retry, no queue, no error toast. For the target market, offline tolerance is not an edge case — it's the median case.

---

## 3. Visual Design

### What works

The token system is genuinely good: a complete light/dark palette with semantic accents, the `onTeal` convention correctly handling bright-accent contrast inversion in dark mode, alpha-tint chips (`color + '22'`) that work over any surface. Recent audits cleaned nearly all hardcoded colors. The eyebrow-label pattern (11px, extra-bold, letterspaced caps) gives sections a consistent voice. Empty states are mostly present and often charming (thinking Cappy on empty analytics; actionable bookmark empty state). The readiness ring, plan timeline, and streak tracker are distinctive, ownable components.

### What fails

**One typeface, one personality.** Nunito Black-to-SemiBold everywhere is friendly and cohesive, but at clinical density (case vignettes, drug names, lab values) the rounded face reads slightly toy-like and offers no contrast register for data. Numbers lack tabular figures in most places (timer chips got them; XP counters, scores, and leaderboard values didn't), so counters visibly jitter as digits change.

**Radius and gutter drift.** Cards use 14, 16, 18, and 20px radii with no rule for which means what. Screen gutters are 16px on Progress/Insights and 18px on Dashboard/Practice. Individually invisible; cumulatively it's why some screens feel slightly "off" next to others. A 10-line spacing/radius scale in the theme would fix this permanently.

**Color semantics are overloaded.** Teal means brand, interactive, selected, *and* success-adjacent; green means correct *and* good-metric; amber means the Cases mode *and* medium difficulty *and* warning-tier metrics; the late-added periwinkle for Rapid Fire is the only mode color with a rationale documented anywhere. It mostly works because usage is contextual, but it's fragile — the next three features will each grab a color and the system will collapse. A named semantic layer (success/warning/danger/brand/mode-accents) is overdue.

**Loading is spinner-only.** Every list, every screen: centered `ActivityIndicator`. No skeletons, no progressive content, no optimistic rendering. On slow connections (again: median case), the app feels like it's buffering rather than loading. The dashboard — the most complex screen — pops in section by section with layout shift.

**Density extremes.** The Insights page is excellent but *long* (readiness → rank → plan → glance → two charts → mix → peers → gaps → per-subject accordions) with uniform visual weight — everything is a white card, so nothing is the headline. The rapid-fire results screen, conversely, floats three small stats in a sea of empty space.

---

## 4. Interaction Design

### What works

The recent investment shows: mascot animation grammar (jump on success, shake on failure, bob while thinking) is exactly the right idea and well-executed; the rapid-fire depleting bar with color interpolation is the best micro-interaction in the app; the combo chip's spring pop, sliding segmented controls, and accordion springs all read as intentional. The new sound layer (soft success/error/complete/combo/flip set) puts Skoolie ahead of most study apps on audio identity.

### What fails

**No haptics. Anywhere.** For a mobile-first gamified product this is the single cheapest, highest-yield omission in the entire audit. Correct answers, combo milestones, streak saves, timer urgency, and the completion fanfare all beg for `expo-haptics` — Duolingo without haptics would feel broken, and Skoolie currently is Duolingo without haptics.

**Reward moments don't exist as moments.** Level-ups, tier promotions, league promotions, and streak-freeze grants are all committed server-side and reflected as changed numbers on next render. No interstitial, no animation, no sound, no share affordance. The app does the hard work of *earning* the dopamine and then forgets to deliver it. This is the most damaging interaction-design gap relative to the mission ("addictive revision").

**Feedback asymmetry.** Answering feels great (sound + color + mascot). Everything meta is silent: bookmarking a question gives a subtle icon swap; saving settings gives nothing; XP arriving gives nothing; a failed network write gives *less* than nothing (false success). Confidence-building feedback (Nielsen #1, visibility of system status) exists only inside the quiz loop.

**Gesture vocabulary is thin.** Everything is a tap. Flashcards — the one mode where swipe-to-grade is a universal convention (Anki, Quizlet, Tinder-pattern) — uses two buttons. No pull-down-to-dismiss on the sheet modals (they have handles that suggest dragging but don't drag). No long-press anywhere (question options beg for long-press-to-peek-explanation post-review).

---

## 5. Gamification

### Assessment against behavioral principles

**Variable reward — strong.** Barrages (surprise windows, 2×), combo multipliers, and interest-biased "surprise me" pools create genuine unpredictability. The deterministic-but-secret barrage window is clever design: anticipation without server cost.

**Loss aversion — strong mechanics, weak staging.** Streaks + freezes are the correct Duolingo-proven pair, and "frozen days count but show blue" is a nice honesty touch. But the *save* moment (freeze auto-consumed) happens silently on app open. Loss-aversion systems only work when the near-loss is *felt* — "Your freeze saved your 12-day streak last night 🧊" should be a celebrated interstitial, not a blue circle the user might notice.

**Competence — best-in-class potential.** The tier system (breadth-weighted, monotonic, unbounded, badge-on-leaderboard) and the readiness score are *the* differentiators — they measure something real about clinical preparedness rather than raw grind. No benchmark app has an equivalent. They are also the least explained features in the app. A competence system the user doesn't understand produces no feeling of competence.

**Competition — good structure, thin cohorts.** Weekly league with promotion/relegation zones and cold-start backfill is well-designed. The risk is empty cohorts at launch scale (a league of 3 people is a group chat, not a competition) — the backfill mitigates visually but the *dynamics* need a minimum viable population; consider a single global league until DAU supports bronze/silver splits.

**Habit formation — half-built.** Notification set (streak rescue, lapse, barrage, league deadline) is correctly targeted with charming mascot copy. But there's no habit *anchor* in-app: no daily quest ("answer 10 today"), no visible daily goal ring, nothing that defines what "done for today" means. Streak preservation currently requires one session of any size — fine — but the user has no target to aim at beyond not-zero.

**The systemic problem: hierarchy.** Eight systems with no stated relationship. The implicit hierarchy is actually coherent — *tier* = who you are, *weekly XP/league* = this week's race, *streak* = daily contract, *level* = lifetime odometer, *barrage/combo* = session spice — but the app never says this, and the dashboard presents them as peers. One "How Skoolie works" progressive-disclosure moment (or better: introduce each system at its first natural encounter) converts noise into architecture.

---

## 6. Product Thinking

Screen-by-screen against the mission ("better clinicians through repeated assessment and meaningful feedback"):

**Insights is the best screen in the product** — readiness with a transparent formula, a prioritized daily plan with one-tap launch, review-due surfacing, subtopic drill-downs. It is the mission rendered as UI. It is also two taps deep and competes with nothing on the dashboard pointing to it except a hero card. The "Do this next" card on Progress is the right instinct; the *dashboard* should lead with the same plan item.

**Case studies are under-leveraged.** Clinically the richest content type (vignette → history → findings → investigations → questions is a real clinical reasoning rehearsal), yet cases can't be replayed from Time Capsule, don't feed per-question history, and get no special standing in the plan engine. For the "become better clinicians" claim, cases should be the crown jewel, not the third card.

**Search serves the mission less than its placement implies** (see IA). It's a fine feature at the wrong altitude.

**Flashcards' zero-XP rule is quietly excellent product thinking** (self-graded content can't feed a competitive economy) — but it's invisible reasoning; users will perceive "flashcards are worthless" unless the streak/coverage value is surfaced.

**Nothing in the app actively distracts from the mission** — there is no engagement-for-engagement's-sake feature. The risk is the opposite: mission-critical loops (spaced review, weakness remediation) exist as *analytics suggestions* rather than as first-class modes. "Review wrong answers" and the review queue should eventually be a home-screen loop, not a results-screen afterthought.

---

## 7. Design Principles Scorecard

**Nielsen #1 Visibility of status** — Strong in-quiz (progress bar, counter, timer, verdicts); weak for background operations (writes, syncs, XP crediting: no confirmation, no failure surface). *Partial violation.*

**#2 Match with real world** — Strong: clinical rank ladder (Fresher→Consultant→Professor) is culturally resonant for the audience; "vignette/history/investigations" mirrors clinical documents. *Respected.*

**#3 User control & freedom** — Violated at three points: instant quiz-abandon with no confirm, tap-anywhere overlay dismissal with no recall, and no undo on flashcard self-grades. *Violated.*

**#4 Consistency** — Internal patterns (chips, eyebrows, cards, sheets) largely consistent; radius/gutter drift and three different "start" verbs (Start →, Smart start, Quick start→Surprise me) show entropy. *Mostly respected.*

**#5 Error prevention** — The quiz-quit issue; also destructive-free elsewhere (good). *Violated at one critical point.*

**#6 Recognition over recall** — Strong: persistent filters shown as chips, "Answered before" tags, topic progress bars, badges beside names. *Respected.*

**#7 Flexibility & efficiency** — Smart Start is a proper accelerator; deep links from plan items are excellent. No power-user affordances beyond that (acceptable for mobile). *Respected.*

**#8 Aesthetic & minimalist** — Insights and Dashboard both violate by accumulation; individual components are clean. *Partial violation.*

**#9 Error recovery** — Alerts state the raw Supabase error message on auth failures; no recovery path for lost sessions or failed writes. *Violated.*

**#10 Help & documentation** — Absent entirely. Zero affordances explain any system. *Violated.*

**Hick's Law** — MCQ setup and dashboard both exceed comfortable choice sets; Smart Start is the correct antidote and should be more dominant. **Fitts's Law** — Primary CTAs correctly bottom-anchored and full-width; several small top-corner targets (X, bookmark, 36px TopBar icons) fall short. **Miller's Law** — Dashboard exceeds 7±2 badly. **Gestalt** — Card grouping and proximity generally sound; the rank card intentionally groups tier+weekXP+level, which is *correct* Gestalt but overloaded content. **Progressive disclosure** — Respected in accordions and hub→runner flows; catastrophically absent for the gamification systems. **Affordance** — Sheet handles that don't drag are a false affordance; option pills and chips otherwise read correctly.

---

## 8. Benchmarking

**Duolingo** — The relevant lessons are not streaks and leagues (Skoolie has them) but *staging* and *ceremony*: one new mechanic at a time, and every milestone gets a full-screen character-led celebration. Skoolie has better characters than Duolingo had at launch and uses them a tenth as much. Adopt: milestone interstitials, first-encounter system introductions, character presence on the dashboard.

**Anki** — The gold standard for *scheduling rigor*. Skoolie's unseen-first ordering and review-due list are a soft version; the per-question learning state now captured (times seen/correct) is the substrate for real spaced repetition. Adopt the *concept* of due-cards-today as a first-class number, not Anki's UX (which is famously hostile).

**Chess.com** — Puzzle Rush is Rapid Fire's true benchmark: same loop, but its results screen is a shareable artifact (score, best streak, percentile) that drives virality and re-runs. Skoolie's rapid-fire results are honest but not shareable or comparative. Also: chess ratings prove users will fight for a *skill* number — evidence the tier system deserves top billing.

**Apple Health** — The readiness ring already borrows the right pattern. Health's deeper lesson is *narrative summaries* ("Your activity is trending up this week") — Insights has the data to generate exactly these one-liners and mostly shows charts instead.

**Quizlet** — Cautionary tale: feature breadth (7 study modes) with shallow loops. Skoolie's four modes + rapid fire are near the ceiling; resist adding modes before deepening review loops.

**Linear/Notion/Arc** — Less relevant patterns (desktop, pro-tool density), but one shared trait matters: ruthless consistency of spacing/type scale as a brand asset. That's the gap Section 3 describes.

---

## 9. MVP Readiness

### Critical (block launch)

1. **Password recovery path** — no forgot-password link exists; account lockout is permanent from the user's perspective.
2. **Quiz-abandon protection** — confirmation on mid-session exit (and ideally resume), especially for timed sessions.
3. **Write-failure surfacing** — XP/streak/history writes must at minimum report failure and retry once; silent no-credit on flaky networks will read as theft of earned progress in the target market.
4. **Accessibility floor** — font-scaling guards on layout-critical text, 44pt minimums on the quiz header targets, and lift `textFaint`-on-light above ~4.5:1 for meta text.
5. **System explanations at first encounter** — one-time coach marks or intro cards for tier, league, freeze, and barrage (a modal each, mascot-delivered; content exists in this audit's descriptions).

### High Priority (first weeks post-launch)

6. Haptics across the reward loop (correct/wrong/combo/complete/streak-save).
7. Celebration interstitials: level-up, tier promotion, league promotion, freeze-saved-your-streak.
8. Review-overlay redesign: keep stem visible (bottom-sheet explanation instead of full-screen blur) and add a "re-open explanation" affordance.
9. Dashboard editorial pass: lead with one "do this now" (today's plan item / barrage if live), demote stats below the fold, kill the duplicate mode grid or the Practice hub's — not both.
10. Daily goal definition (even a fixed "10 questions/day" ring) to anchor the streak.
11. Persistent-filter visibility: active-filter banner on topic lists with one-tap clear.

### Medium Priority

12. Skeleton loading for dashboard, leaderboards, and topic lists.
13. Swipe-to-grade flashcards; draggable sheets (or remove the handle affordance).
14. Spacing/radius/type scale tokens; tabular numerals for all counters.
15. Semantic color layer (success/warning/danger separated from mode accents).
16. Case-study replay in Time Capsule + case answers feeding question history.
17. League cohort strategy for low-DAU period (single global league toggle).
18. Notification preferences surface (view/mute categories).

### Future Improvements

19. Shareable rapid-fire/barrage result cards (Puzzle-Rush pattern).
20. Real spaced-repetition scheduling on the now-captured per-question state.
21. Narrative insight one-liners ("Your pharmacology accuracy rose 12% this month").
22. Offline session queue with sync.
23. Mascot presence on dashboard (idle Cappy reacting to state: streak at risk, barrage live).
24. Reduced-motion and richer a11y pass (VoiceOver labels on custom components).

---

## 10. Revamp Recommendation

**Iterate. A ground-up redesign would destroy more value than it creates.**

The reasoning: the three hardest things to get right in a product like this — a coherent visual token system with full dark-mode parity, a differentiated analytics/competence engine, and a complete gamification mechanics layer with server-side integrity — are already built and are *good*. These typically consume quarters. Nothing in this audit found a rotten foundation; it found missing connective tissue (explanation, ceremony, hierarchy) and missing table stakes (recovery, resilience, accessibility). Those are additive fixes, not architectural ones.

**What must be treated as a from-first-principles rebuild (within the iteration):**

The **Dashboard** — not visually, but editorially. Its current form is an accumulation artifact (every feature added a section). It needs to be re-conceived around a single question ("what now?") with one primary action, one status strip, and everything else demoted. This is a one-screen redesign, not an app redesign.

The **gamification presentation layer** — the mechanics stay exactly as built; the *staging* (first encounters, celebrations, a stated hierarchy of tier > week > streak > level) must be designed as if new, because it currently doesn't exist at all.

The **review overlay** in MCQ/Cases — the highest-frequency interaction in the app deserves a rethink from interaction principles (stem visibility, dismissal control, re-entry).

**What should remain untouched:** the theme/token system, the practice runner flows, the Insights page (trim, don't rebuild), the tier/league/freeze mechanics and their server enforcement, the mascot and sound identity, onboarding's step structure (add only a value-preview and permission priming), and the tab skeleton (with the Search-vs-Bookmarks altitude question resolved as a swap, not a restructure).

The honest summary for an investor: this is a product two focused sprints away from feeling inevitable, not a product that needs to start over. The risk isn't the foundation — it's shipping the current fire-hose of unexplained systems to first-time users and burning the very engagement the systems were built to create.

---

*End of audit. No changes were made to the application.*
