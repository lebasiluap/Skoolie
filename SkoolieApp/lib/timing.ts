// Session timing contract for timed practice modes.
//
// Phase 1 uses only the per-question variant (MCQ + cases). The whole-session
// variant is part of the contract now so a future "mock exam" mode can pass
// { kind: 'total' } without reshaping any of the timer plumbing.

export type SessionTiming =
  | { kind: 'per_question'; seconds: number }
  | { kind: 'total'; seconds: number }

/** Per-question defaults (seconds) — used when the profile has no preference. */
export const MCQ_QUESTION_SEC = 30
export const CASE_QUESTION_SEC = 45   // case questions need vignette re-reading time

/** User-selectable per-question durations. */
export const TIMED_CHOICES = [5, 10, 15, 30, 45, 60] as const
export const formatSecs = (s: number) => (s >= 60 ? `${Math.round(s / 60)}m` : `${s}s`)

/** Timer display turns urgent (red, pulsing) at or below this. */
export const URGENT_AT_SEC = 5
