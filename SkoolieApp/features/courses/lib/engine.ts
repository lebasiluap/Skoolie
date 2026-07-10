/**
 * Courses engine — dynamic unit rules, session composition, progress I/O.
 *
 * Everything is computed against the LIVE question bank:
 *  - fetchCoursesCatalog: derives available courses from a counts aggregation
 *    (staged RPC get_courses_catalog) — a topic qualifies when it has enough
 *    questions overall; per-band thinness is handled by blending, not exclusion.
 *  - buildUnitPlan: turns those counts into an ordered unit plan
 *    (easy → medium → hard ramp, boss checkpoint every ~4th unit,
 *    final mixed mastery exam).
 *  - composeUnitSession: evaluates a unit's rule at session time via the
 *    staged RPCs get_course_unit_questions / get_course_unit_cases.
 *  - progress read/write against the staged course_progress table (RLS own-rows).
 *
 * XP reuses the existing server-side credit_xp('mcq' | 'case_study') — no new
 * XP paths, so leaderboard/league accounting stays uniform.
 */
import { supabase } from '@/lib/supabase'
import { trySave } from '@/lib/reliably'
import type { CognitiveType, Difficulty, Profession } from '@/types'
import type {
  CatalogRpcRow, Course, CourseProgress, CourseUnit, RunnerItem, UnitOutcome, UnitStatus,
} from './types'

// ── Tunables ────────────────────────────────────────────────────────────────
export const PASS_PCT = 80
/** A (profession, topic) needs at least this many MCQs to become a course. */
export const MIN_COURSE_QUESTIONS = 40
export const STANDARD_UNIT_SIZE = 10
export const BOSS_CASE_COUNT = 2
export const BOSS_FALLBACK_MCQS = 8
export const MASTERY_MCQ_COUNT = 10
export const MASTERY_CASE_COUNT = 1
/** Mastery exam rapid pace — per-question seconds. */
export const RAPID_SECONDS = 15

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5)

export const courseKey = (profession: Profession, topic: string) => `${profession}::${topic}`

// ── Unit plan (the rules) ───────────────────────────────────────────────────

/** Primary band for standard unit i of n — the easy → medium → hard ramp. */
function bandAt(i: number, n: number): Difficulty {
  const f = i / Math.max(n - 2, 1)
  return f < 0.34 ? 'easy' : f < 0.72 ? 'medium' : 'hard'
}

/**
 * Ordered difficulty preference for a primary band. The full fallback list is
 * always sent: the RPC prefers the primary band and only backfills from the
 * adjacent ones when the primary is thin, so rich bands stay pure and thin
 * bands blend instead of failing.
 */
function blendFor(primary: Difficulty): Difficulty[] {
  if (primary === 'easy') return ['easy', 'medium', 'hard']
  if (primary === 'hard') return ['hard', 'medium', 'easy']
  return ['medium', 'easy', 'hard']
}

/** Cognitive PREFERENCE ramp (recall first, interpretation last) — soft only. */
function cognitiveFor(primary: Difficulty): CognitiveType[] {
  if (primary === 'easy') return ['recall']
  if (primary === 'medium') return ['application', 'mechanism']
  return ['interpretation', 'calculation', 'application']
}

/**
 * Ordered unit plan for a course, derived purely from bank counts.
 * Unit count scales with bank size (5–12); every 4th unit is a boss
 * case-study checkpoint; the last unit is always the mixed mastery exam.
 */
export function buildUnitPlan(bands: Record<Difficulty, number>): CourseUnit[] {
  const total = bands.easy + bands.medium + bands.hard
  const n = clamp(4 + Math.floor(total / 60), 5, 12)
  const units: CourseUnit[] = []
  const counters: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 }
  const bandTitle: Record<Difficulty, string> = { easy: 'Foundations', medium: 'Core', hard: 'Advanced' }
  let bossCount = 0

  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1
    const isBoss = !isLast && (i + 1) % 4 === 0
    if (isLast) {
      units.push({
        index: i, kind: 'mastery', title: 'Mastery Exam',
        difficulties: ['hard', 'medium', 'easy'], cognitivePrefs: null,
        size: MASTERY_MCQ_COUNT + 2, passPct: PASS_PCT, timerSeconds: RAPID_SECONDS,
      })
    } else if (isBoss) {
      bossCount += 1
      units.push({
        index: i, kind: 'boss', title: `Checkpoint ${bossCount}`,
        difficulties: blendFor(bandAt(i, n)), cognitivePrefs: null,
        size: BOSS_FALLBACK_MCQS, passPct: PASS_PCT, timerSeconds: null,
      })
    } else {
      const primary = bandAt(i, n)
      counters[primary] += 1
      units.push({
        index: i, kind: 'standard', title: `${bandTitle[primary]} ${counters[primary]}`,
        difficulties: blendFor(primary), cognitivePrefs: cognitiveFor(primary),
        size: STANDARD_UNIT_SIZE, passPct: PASS_PCT, timerSeconds: null,
      })
    }
  }
  return units
}

// ── Catalog ─────────────────────────────────────────────────────────────────

/**
 * Courses available for a profession, derived live from the bank via the
 * staged get_courses_catalog RPC (get_question_counts-style aggregation).
 * RPC data is untyped — cast per app convention.
 */
export async function fetchCoursesCatalog(
  profession: Profession,
  accessKey: string | null,
): Promise<Course[]> {
  const { data, error } = await supabase.rpc('get_courses_catalog', {
    p_profession: profession,
    p_access_key: accessKey,
  })
  if (error || !data) return []
  return (data as CatalogRpcRow[])
    .map((r): Course => {
      const bands: Record<Difficulty, number> = {
        easy: Number(r.easy_cnt), medium: Number(r.medium_cnt), hard: Number(r.hard_cnt),
      }
      return {
        key: courseKey(profession, r.topic),
        profession,
        topic: r.topic,
        total: Number(r.total),
        bands,
        caseCount: Number(r.case_cnt),
        units: buildUnitPlan(bands),
      }
    })
    .filter(c => c.total >= MIN_COURSE_QUESTIONS)
    .sort((a, b) => b.total - a.total)
}

// ── Session composition ─────────────────────────────────────────────────────

interface UnitQuestionRow {
  id: string
  question_text: string
  options: unknown
  correct_answer: string
  explanation: string
  distractor_explanations: Record<string, string> | null
  topic: string
  category: string | null
  subtopic: string | null
  difficulty: Difficulty | null
  cognitive_type: CognitiveType | null
  high_yield: boolean | null
}

interface UnitCaseRow {
  id: string
  title: string
  clinical_vignette: string
  topic: string
  difficulty: Difficulty | null
  questions: unknown
}

interface RawCaseQuestion {
  question?: string
  options?: unknown
  correct_answer?: string
  explanation?: string
}

async function fetchUnitMcqs(
  course: Course,
  difficulties: Difficulty[],
  cognitivePrefs: CognitiveType[] | null,
  accessKey: string | null,
  limit: number,
): Promise<RunnerItem[]> {
  const { data, error } = await supabase.rpc('get_course_unit_questions', {
    p_profession: course.profession,
    p_topic: course.topic,
    p_difficulties: difficulties,
    p_cognitive_types: cognitivePrefs,
    p_access_key: accessKey,
    p_limit: limit,
  })
  if (error || !data) return []
  return (data as UnitQuestionRow[]).map((q): RunnerItem => ({
    id: q.id,
    kind: 'mcq',
    caseId: null,
    caseTitle: null,
    vignette: null,
    questionText: q.question_text,
    options: q.options,
    correctAnswer: q.correct_answer,
    explanation: q.explanation,
    distractorExplanations: q.distractor_explanations ?? null,
    topic: q.topic,
    category: q.category,
    subtopic: q.subtopic,
    difficulty: q.difficulty,
  }))
}

/** Flattens whole cases into ordered case-question items (vignette rides along). */
async function fetchUnitCases(
  course: Course,
  accessKey: string | null,
  caseLimit: number,
): Promise<RunnerItem[]> {
  const { data, error } = await supabase.rpc('get_course_unit_cases', {
    p_profession: course.profession,
    p_topic: course.topic,
    p_access_key: accessKey,
    p_limit: caseLimit,
  })
  if (error || !data) return []
  const items: RunnerItem[] = []
  for (const c of data as UnitCaseRow[]) {
    if (!Array.isArray(c.questions)) continue
    ;(c.questions as RawCaseQuestion[]).forEach((cq, qIdx) => {
      if (!cq || typeof cq.question !== 'string' || cq.options == null) return
      items.push({
        id: `${c.id}:${qIdx}`,          // composite id — app-wide case convention
        kind: 'case',
        caseId: c.id,
        caseTitle: c.title,
        vignette: c.clinical_vignette,
        questionText: cq.question,
        options: cq.options,
        correctAnswer: cq.correct_answer ?? '',
        explanation: cq.explanation ?? '',
        distractorExplanations: null,    // case questions have no distractor map
        topic: c.topic,
        category: null,
        subtopic: null,
        difficulty: c.difficulty,
      })
    })
  }
  return items
}

/** Round-robin sample across difficulty bands so the mastery exam is a real mix. */
function balancedSample(pool: RunnerItem[], count: number): RunnerItem[] {
  const byBand = new Map<string, RunnerItem[]>()
  for (const item of shuffle(pool)) {
    const k = item.difficulty ?? 'medium'
    const bucket = byBand.get(k)
    if (bucket) bucket.push(item)
    else byBand.set(k, [item])
  }
  const buckets = [...byBand.values()]
  const out: RunnerItem[] = []
  let bi = 0
  while (out.length < count && buckets.some(b => b.length > 0)) {
    const b = buckets[bi % buckets.length]
    const next = b.pop()
    if (next) out.push(next)
    bi++
  }
  return out
}

/**
 * Evaluate a unit's rule against the bank RIGHT NOW and build its session.
 *  - standard: primary-band MCQs (blended when thin), cognitive preference soft.
 *  - boss: whole case studies flattened to questions; topics with zero cases
 *    degrade to a hard-leaning MCQ checkpoint.
 *  - mastery: balanced MCQ mix across all bands + a case, rapid pace (timer
 *    set on the unit, enforced by the runner).
 */
export async function composeUnitSession(
  course: Course,
  unit: CourseUnit,
  accessKey: string | null,
): Promise<RunnerItem[]> {
  if (unit.kind === 'standard') {
    const qs = await fetchUnitMcqs(course, unit.difficulties, unit.cognitivePrefs, accessKey, unit.size)
    return shuffle(qs).slice(0, unit.size)
  }

  if (unit.kind === 'boss') {
    if (course.caseCount > 0) {
      const caseItems = await fetchUnitCases(course, accessKey, BOSS_CASE_COUNT)
      if (caseItems.length > 0) return caseItems   // keep case-grouped order
    }
    const fallback = await fetchUnitMcqs(course, ['hard', 'medium', 'easy'], null, accessKey, BOSS_FALLBACK_MCQS)
    return shuffle(fallback).slice(0, BOSS_FALLBACK_MCQS)
  }

  // mastery — over-fetch, then balance across bands; append one case if any exist
  const [mcqPool, caseItems] = await Promise.all([
    fetchUnitMcqs(course, unit.difficulties, null, accessKey, Math.min(MASTERY_MCQ_COUNT * 3, 40)),
    course.caseCount > 0 ? fetchUnitCases(course, accessKey, MASTERY_CASE_COUNT) : Promise.resolve<RunnerItem[]>([]),
  ])
  return [...shuffle(balancedSample(mcqPool, MASTERY_MCQ_COUNT)), ...caseItems]
}

// ── Progress ────────────────────────────────────────────────────────────────

interface ProgressRow {
  course_key: string
  highest_unlocked: number
  unit_scores: Record<string, number> | null
  mastered_at: string | null
}

export async function loadCourseProgress(userId: string): Promise<Map<string, CourseProgress>> {
  const { data } = await supabase
    .from('course_progress')
    .select('course_key, highest_unlocked, unit_scores, mastered_at')
    .eq('user_id', userId)
  const map = new Map<string, CourseProgress>()
  for (const r of (data ?? []) as ProgressRow[]) {
    map.set(r.course_key, {
      courseKey: r.course_key,
      highestUnlocked: r.highest_unlocked,
      unitScores: r.unit_scores ?? {},
      masteredAt: r.mastered_at,
    })
  }
  return map
}

export function unitStatus(unitIndex: number, progress: CourseProgress | null): UnitStatus {
  const unlocked = progress?.highestUnlocked ?? 0
  if (unitIndex < unlocked) return 'done'
  if (unitIndex === unlocked) return 'current'
  return 'locked'
}

export function unitsDone(course: Course, progress: CourseProgress | null): number {
  return Math.min(progress?.highestUnlocked ?? 0, course.units.length)
}

/**
 * Record a finished unit run: keep the best score, advance the unlock pointer
 * when the CURRENT unit is passed at >= passPct, stamp mastered_at when the
 * final unit is passed. Replays of already-done units only improve best score.
 */
export async function saveUnitResult(
  userId: string,
  course: Course,
  unit: CourseUnit,
  score: number,
  total: number,
  prev: CourseProgress | null,
): Promise<UnitOutcome> {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const passed = pct >= unit.passPct
  const key = String(unit.index)
  const scores: Record<string, number> = { ...(prev?.unitScores ?? {}) }
  scores[key] = Math.max(scores[key] ?? 0, pct)

  let highest = prev?.highestUnlocked ?? 0
  if (passed && unit.index === highest) highest = Math.min(highest + 1, course.units.length)

  const isFinal = unit.index === course.units.length - 1
  const newlyMastered = passed && isFinal && !prev?.masteredAt
  const masteredAt = prev?.masteredAt ?? (newlyMastered ? new Date().toISOString() : null)

  const saved = await trySave(() => supabase.from('course_progress').upsert({
    user_id: userId,
    course_key: course.key,
    highest_unlocked: highest,
    unit_scores: scores,
    units_total: course.units.length,
    mastered_at: masteredAt,
  }, { onConflict: 'user_id,course_key' }))

  return { pct, passed, newlyMastered, saved }
}

// ── XP + history (reuse existing server paths — nothing new) ────────────────

export function xpKindFor(unit: CourseUnit): 'mcq' | 'case_study' {
  return unit.kind === 'standard' ? 'mcq' : 'case_study'
}

/** Server-authoritative XP via the existing credit_xp RPC. */
export async function creditUnitXp(unit: CourseUnit, score: number, total: number): Promise<boolean> {
  if (total <= 0) return true
  return trySave(() => supabase.rpc('credit_xp', {
    p_kind: xpKindFor(unit), p_score: score, p_total: total, p_timed: false,
  }))
}

/** Fire-and-forget per-question history for MCQ items (same RPC the MCQ screen
 *  uses) — keeps seen/unseen + topic analytics consistent. Case items are
 *  skipped: user_question_history's FK targets `questions`. */
export function recordCourseAnswer(item: RunnerItem, correct: boolean): void {
  if (item.kind !== 'mcq') return
  supabase.rpc('record_answer', {
    p_question_id: item.id,
    p_question_type: 'mcq',
    p_topic: item.topic,
    p_category: item.category,
    p_subtopic: item.subtopic,
    p_difficulty: item.difficulty ?? 'medium',
    p_correct: correct,
  }).then(() => {})
}
