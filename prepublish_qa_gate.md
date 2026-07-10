# Skoolie Pre-Publish QA Gate

Run this on every freshly generated batch (~100 questions) **before** it goes into the live `questions` table. Two layers:

- **Layer 1 — deterministic checks (SQL).** Objective, free, zero false positives. A failure here *blocks* publishing until fixed. Encodes everything learned the hard way (bare-letter answers, array options, length parity, canonical subtopics, no dupes).
- **Layer 2 — editorial/medical audit (LLM, flag-first).** Runs only on rows that passed Layer 1. Auto-fixes the clear-cut; **holds** anything debatable for a human. Never blind-fixes medicine.

Project id: `bqhiwlpmrejvjdljxspy`.

---

## Workflow

1. **Generate into staging, not live.** In the generation prompt, change the target from `questions` to `staging_questions`. Create it once:
   ```sql
   CREATE TABLE IF NOT EXISTS staging_questions (LIKE questions INCLUDING ALL);
   TRUNCATE staging_questions;   -- start each batch clean
   ```
2. **Run Layer 1.** Fix or delete any row that comes back with problems. Re-run until it returns 0 rows.
3. **Run Layer 2** (the prompt below) on `staging_questions`. Apply auto-fixes; pull the HELD list for your review.
4. **Promote the clean batch:**
   ```sql
   INSERT INTO questions SELECT * FROM staging_questions;
   TRUNCATE staging_questions;
   ```

---

## Layer 1 — Deterministic checks (SQL)

Returns one row per problem question with the list of failed checks. **Publish only when this returns zero rows.**

```sql
WITH q AS (SELECT * FROM staging_questions),
chk AS (
  SELECT q.id, LEFT(q.question_text, 70) AS stem,
    ARRAY_REMOVE(ARRAY[
      -- profession / required fields
      CASE WHEN q.professions IS NULL OR array_length(q.professions,1) IS NULL THEN 'no_profession' END,
      CASE WHEN q.course IS NULL OR btrim(q.course)='' THEN 'no_course' END,
      CASE WHEN q.topic IS NULL OR btrim(q.topic)='' THEN 'no_topic' END,
      CASE WHEN q.category IS NULL OR btrim(q.category)='' THEN 'no_category' END,
      CASE WHEN q.subtopic IS NULL OR btrim(q.subtopic)='' THEN 'no_subtopic' END,
      CASE WHEN q.question_text IS NULL OR btrim(q.question_text)='' THEN 'blank_stem' END,
      CASE WHEN q.explanation IS NULL OR btrim(q.explanation)='' THEN 'blank_explanation' END,
      CASE WHEN q.region NOT IN ('universal','ghana') OR q.region IS NULL THEN 'bad_region' END,
      CASE WHEN q.difficulty NOT IN ('easy','medium','hard') THEN 'bad_difficulty' END,
      -- year_level: nursing = 5-value, others = 7-value
      CASE WHEN q.professions @> ARRAY['nursing'] AND NOT (q.professions @> ARRAY['medicine'] OR q.professions @> ARRAY['pharmacy'])
             THEN CASE WHEN q.year_level <> '{year1,year2,year3,year4,practitioner}' THEN 'bad_year_level_nursing' END
             ELSE CASE WHEN q.year_level <> '{year1,year2,year3,year4,year5,year6,practitioner}' THEN 'bad_year_level' END END,
      -- MCQ structural
      CASE WHEN q.question_type='mcq' AND q.correct_answer !~ '^[A-E]$' THEN 'answer_not_bare_letter' END,
      CASE WHEN q.question_type='mcq' AND jsonb_typeof(q.options) <> 'array' THEN 'options_not_array' END,
      CASE WHEN q.question_type='mcq' AND jsonb_typeof(q.options)='array' AND jsonb_array_length(q.options) NOT IN (4,5) THEN 'options_not_4_or_5' END,
      CASE WHEN q.question_type='mcq' AND jsonb_typeof(q.options)='array' AND (ascii(q.correct_answer)-65) >= jsonb_array_length(q.options) THEN 'answer_out_of_range' END,
      -- MCQ length-cue bias: correct option must NOT be >=8 chars longer than its longest distractor
      CASE WHEN q.question_type='mcq' AND jsonb_typeof(q.options)='array' AND q.correct_answer ~ '^[A-E]$'
             AND (SELECT length(regexp_replace(o,'^[A-E][.):]\s*','')) FROM jsonb_array_elements_text(q.options) WITH ORDINALITY t(o,ord) WHERE ord=ascii(q.correct_answer)-64)
                 >= (SELECT max(length(regexp_replace(o,'^[A-E][.):]\s*','')))+8 FROM jsonb_array_elements_text(q.options) WITH ORDINALITY t(o,ord) WHERE ord<>ascii(q.correct_answer)-64)
           THEN 'length_cue_correct_is_longest' END,
      -- MCQ duplicate option text
      CASE WHEN q.question_type='mcq' AND jsonb_typeof(q.options)='array'
             AND (SELECT COUNT(DISTINCT lower(btrim(regexp_replace(o,'^[A-E][.):]\s*','')))) FROM jsonb_array_elements_text(q.options) o)
                 <> jsonb_array_length(q.options) THEN 'duplicate_option_text' END,
      -- Flashcard format
      CASE WHEN q.question_type='flashcard' AND q.options::text <> '[]' THEN 'flashcard_options_not_empty' END,
      CASE WHEN q.question_type='flashcard' AND q.question_text NOT LIKE 'Front: %' THEN 'flashcard_no_front_prefix' END,
      -- Duplicate stem vs LIVE bank (same profession set) or within the batch
      CASE WHEN EXISTS (SELECT 1 FROM questions lq WHERE lq.question_text = q.question_text AND lq.professions = q.professions)
             OR (SELECT COUNT(*) FROM staging_questions s2 WHERE s2.question_text = q.question_text AND s2.professions = q.professions) > 1
           THEN 'duplicate_stem' END,
      -- Subtopic drift: warn if this subtopic is NOT already used in the live bank for this (profession, topic)
      CASE WHEN q.subtopic IS NOT NULL AND NOT EXISTS (
             SELECT 1 FROM questions lq, unnest(lq.professions) lp WHERE lp = ANY(q.professions) AND lq.topic=q.topic AND lq.subtopic = q.subtopic)
           THEN 'new_subtopic_check_fragmentation' END
    ], NULL) AS problems
  FROM q
)
SELECT id, stem, problems FROM chk WHERE array_length(problems,1) > 0 ORDER BY id;
```

Notes:
- `length_cue_correct_is_longest` is the bias we spent days removing — never let it back in.
- `new_subtopic_check_fragmentation` is a **warning**, not a hard fail: it's fine for a genuinely new theme, but if it fires on most of the batch you're re-fragmenting the index — map to an existing canonical subtopic instead.
- `duplicate_stem` blocks true repeats; a reworded near-duplicate won't be caught here — Layer 2 handles those.

Quick summary version (counts per problem across the batch):
```sql
-- paste the CTE above, then:
SELECT unnest(problems) AS problem, COUNT(*) FROM chk WHERE array_length(problems,1)>0 GROUP BY 1 ORDER BY 2 DESC;
```

---

## Layer 2 — Editorial / medical audit prompt

Paste this into a fresh agent/model chat after the batch passes Layer 1.

---

You are the pre-publish editorial reviewer for a medical question bank (pharmacy / medicine / nursing students, Ghana-focused). A batch of ~100 questions sits in the Supabase table `staging_questions` (project `bqhiwlpmrejvjdljxspy`). Review each one and either fix it or hold it — **do not publish anything yourself.**

**Golden rule: never blind-fix medicine.** Your own knowledge can be wrong. Only auto-apply a change when it is unambiguous and you are highly confident. If there is any real doubt about a medical fact, **HOLD** it for a human instead of guessing.

Load the batch: `SELECT id, professions, topic, category, subtopic, difficulty, question_type, question_text, options, correct_answer, explanation FROM staging_questions ORDER BY id;`

For **each question**, judge it on these dimensions:

1. **Answer correctness** — Is the keyed option the single best answer, and does it agree with the explanation? (A key that contradicts its own explanation is the #1 error to catch.)
2. **Single best answer** — Is there exactly one correct option? Flag "two defensible answers" or "no correct answer".
3. **Distractors** — Each wrong option should be plausible, clinically relevant, mutually exclusive, and *clearly wrong on verification* (never accidentally true). Flag weak/obviously-wrong or overlapping distractors.
4. **Explanation quality** — Explains *why* the answer is right AND why the others are wrong; teaches the concept; doesn't just restate the option.
5. **Clarity & fairness** — No trick/ambiguous/double-negative wording, no grammatical clue to the answer, no "all/none of the above" unless justified.
6. **Classification** — profession/topic/category/subtopic/difficulty/cognitive_type sensible and consistent with the content.
7. **Terminology, spelling, units, guideline currency** — correct and consistent (British English; SI units).

**Output per question** exactly one verdict:
- `PASS` — publishable as-is.
- `AUTOFIX` — you applied an unambiguous, high-confidence fix. State the exact change. (Apply via `UPDATE staging_questions SET ... WHERE id=...`; keep `correct_answer` a bare letter; keep options length-parallel; escape apostrophes as `''`.)
- `HOLD: <reason> (confidence: high/med/low)` — needs human judgement (any real medical doubt, two-defensible-answers, or a change that alters the tested concept). Do **not** edit held rows.

**Do not** rewrite questions that are already fine (no churn). **Do not** touch the question stem's clinical meaning on an AUTOFIX unless it's a clear typo.

When done, report **concrete counts** (not invented scores):
- N reviewed, N PASS, N AUTOFIX (list the ids + one-line change each), N HOLD (list ids + reason + confidence).
- Any topic/subtopic that looks over- or under-represented in this batch.
Then STOP. The human reviews the HOLD list and decides; only then is the batch promoted to `questions`.

---

## Generation standards (bake these into the generator so Layer 1 rarely fails)

- **Options length-parallel** — the correct option must NOT be the longest; put the "why" in the explanation, not the option.
- `correct_answer` = a **bare letter** (`A`/`B`/`C`/`D`), matching the correct option's position. Options = a **JSON array of 4 strings** `["A. …","B. …","C. …","D. …"]` — never an object, never 5 options unless deliberate.
- The keyed option's text must be exactly what the explanation says is correct.
- **Explanation** present, explains why right + why the distractors are wrong.
- **Flashcards**: `options='[]'::jsonb`, `question_text` prefixed `Front: `, answer + teaching in `explanation`.
- **Subtopic** = an existing canonical disease/theme name for that (profession, topic) — a shared bucket of ~10–20 questions, **not** a unique-per-question label.
- `year_level` = `{year1..year6,practitioner}` (medicine/pharmacy) or `{year1..year4,practitioner}` (nursing). `region` ∈ {`universal`,`ghana`}. `professions` single-course; never mix courses in one question.
