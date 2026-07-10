/**
 * Courses feature — shared types.
 *
 * A course is derived ENTIRELY from the live question bank at read time:
 * no fixed question lists, no teaching content. Each unit is a RULE
 * (difficulty band + cognitive preference + mode mix) that the engine
 * evaluates against `questions` when the unit is started, so newly
 * imported questions slot in automatically.
 */
import type { CognitiveType, Difficulty, Profession } from '@/types'

export type UnitKind = 'standard' | 'boss' | 'mastery'

export interface CourseUnit {
  index: number
  kind: UnitKind
  title: string
  /**
   * Ordered difficulty preference. The FIRST entry is the unit's primary
   * band; the staged RPC (get_course_unit_questions) prefers it and
   * backfills from the rest when the primary band is thin — this is the
   * "blend adjacent bands" graceful degradation.
   */
  difficulties: Difficulty[]
  /** Soft preference only (server ORDER BY, never a WHERE filter) — banks
   *  with untagged cognitive_type (e.g. medicine) degrade gracefully. */
  cognitivePrefs: CognitiveType[] | null
  /** Target item count for a session of this unit. */
  size: number
  /** Percent required to pass this unit and unlock the next (spec: 80). */
  passPct: number
  /** Per-question countdown in seconds (mastery exam rapid pace); null = untimed. */
  timerSeconds: number | null
}

export interface Course {
  /** `${profession}::${topic}` — also the course_progress.course_key. */
  key: string
  profession: Profession
  topic: string
  /** Total MCQs currently in the bank for this (profession, topic). */
  total: number
  /** Per-band counts — drives the ramp + blend decisions. */
  bands: Record<Difficulty, number>
  /** Case studies available for boss checkpoints (0 = boss falls back to hard MCQs). */
  caseCount: number
  units: CourseUnit[]
}

/** One runnable question inside a unit session (MCQ or flattened case question). */
export interface RunnerItem {
  /** Question uuid for MCQs; `${caseId}:${qIdx}` for case questions (app convention). */
  id: string
  kind: 'mcq' | 'case'
  caseId: string | null
  caseTitle: string | null
  /** Clinical vignette shown above the stem for case items. */
  vignette: string | null
  questionText: string
  /** Raw options (array OR A–F keyed object) — always render via buildShuffledMcq. */
  options: unknown
  correctAnswer: string
  explanation: string
  distractorExplanations: Record<string, string> | null
  topic: string
  category: string | null
  subtopic: string | null
  difficulty: Difficulty | null
}

export interface CourseProgress {
  courseKey: string
  /** Index of the first not-yet-passed unit (== units.length when all passed). */
  highestUnlocked: number
  /** Best score percent per unit index (keys are stringified indices). */
  unitScores: Record<string, number>
  masteredAt: string | null
}

export type UnitStatus = 'locked' | 'current' | 'done'

export interface UnitOutcome {
  pct: number
  passed: boolean
  newlyMastered: boolean
  /** False when the course_progress write failed after retry (toast the user). */
  saved: boolean
}

/** Row shape returned by the staged get_courses_catalog RPC. */
export interface CatalogRpcRow {
  topic: string
  total: number | string
  easy_cnt: number | string
  medium_cnt: number | string
  hard_cnt: number | string
  case_cnt: number | string
}
