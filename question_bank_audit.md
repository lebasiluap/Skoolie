# Skoolie Question Bank Audit

_Audited 2 July 2026 · Supabase project `skoolie` (bqhiwlpmrejvjdljxspy)_

## Scale

| Content | Count |
|---|---|
| MCQ questions | 29,212 |
| Flashcards | 12,366 |
| **`questions` total** | **41,573** |
| Case studies | 1,950 |
| Case inner questions | 8,000 |
| Distinct topics | 31 |
| High-yield share | 76.6% |

MCQ difficulty is a healthy pyramid: easy 5,011 · medium 15,098 · hard 9,103.

The good news up front: **0 unresolvable MCQ answers, 0 blank question stems, 0 blank topics, 0 bad difficulty values, and all 1,950 case studies have a vignette, title and questions.** The `lib/answers.ts` read-time normaliser already absorbs most historic format drift (object-shaped options, letter-prefixed answers, full-text answers, 5-option A–E questions), so a lot of the raw inconsistency never reaches the user. The findings below are what that safety net does **not** catch.

---

## Critical — breaks in the app

### 1. 245 case studies (12.6%) are unplayable
760 inner case questions store their answer under an `answer` key with a `null` `correct_answer`, and have **no `options`** — they are prose short-answer questions, not MCQs. These cluster into **245 fully-affected cases** (every question in them is this format), spanning Dermatology, Paediatrics, Pharmacology, Reproductive System & OB-GYN, Surgery and Urology (all `style = multi_question`).

`app/(app)/practice/cases.tsx` treats every inner question as an MCQ (`buildShuffledMcq(q.options, q.correct_answer, …)`). With null options and a null `correct_answer`, these render with **no answer choices and can never be scored** — a dead-end screen.

**Options:** (a) convert these to a supported shape, (b) teach the case renderer a "short-answer / self-assessed" mode (show the model answer on reveal, like a flashcard), or (c) hide `style = multi_question` short-answer cases until supported. Recommendation: (b) — the content itself is high quality, just a different question type.

### 2. 100 flashcards have no answer
Flashcards map `back := explanation` (`flashcards.tsx:223`). 100 flashcards have a blank `explanation`, so the card flips to an **empty back**. These should be filled or removed.

---

## Medium — quality & deduplication

### 3. 1,152 duplicate questions
978 groups of exact-identical `question_text`; **942 groups are within the same profession** (true duplicates, ~1,100+ redundant rows). Users will see the same question twice, and it inflates every "questions available" count. Recommend de-duping on `question_text` + `professions`, keeping the row with the richest explanation/distractors.

### 4. 9 duplicate case studies
Same `title` + `topic`. Small, but worth clearing.

---

## Low — cosmetic or already handled

- **Answer-position bias:** correct answer is B in 55% of MCQs (A 19%, C 18%, D 9%, E 3 rows). **Not a gameplay problem** — `buildShuffledMcq` re-shuffles options deterministically per question at render time. Only becomes a concern if that shuffle is ever bypassed. Flag for future generation batches.
- **256 MCQs with 5 options (A–E):** fine — `LETTERS` supports A–F.
- **600 blank subtopics** (299 MCQ, 301 flashcard): subtopic is optional and analytics fall back to category/topic; minor loss of drill-down granularity.
- **17 MCQs with very short explanations** (<40 chars): worth a quick content pass.

---

## Coverage gaps

- **Only 3 of the app's professions have content:** pharmacy (23,431), medicine (13,728), nursing (4,419). **Dentistry, midwifery and general have zero questions** despite being selectable in onboarding/profile — a new user in those tracks sees an empty app.
- **Nursing is thin** relative to pharmacy and medicine (roughly 1/5 the volume).

---

## Suggested priority order

1. Fix or gate the **245 short-answer case studies** (user-facing dead-end).
2. Fill/remove the **100 empty-back flashcards**.
3. **De-duplicate** the ~1,150 repeated questions + 9 cases.
4. Decide on **dentistry / midwifery / general** — add a starter set or hide those professions until content exists.
5. Backlog: subtopic backfill, thin-explanation pass, note the B-bias for future generation.

_All checks were read-only; no data was modified._
