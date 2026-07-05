// Normalisers for MCQ option/answer data, which the question bank stores in
// several inconsistent shapes. Doing this at read time means scoring and display
// work regardless of how a question was generated (no data migration needed).
//
// Observed variance:
//  - `options` is usually a string[] of 4, sometimes 5 (A–E)…
//  - …but ~1100 rows store `options` as an OBJECT keyed { A, B, C, D } instead.
//  - `correct_answer` is usually a clean letter ("B"), sometimes letter-prefixed
//    ("D. Ethambutol"), sometimes the full option text ("NSTEMI", long strings).

export const LETTERS: string[] = ['A', 'B', 'C', 'D', 'E', 'F']

const stripPrefix = (s: string) => s.replace(/^\s*[A-F][.):]\s*/, '').trim()

/** Returns options as an ordered string[] whether stored as an array or an A–F keyed object. */
export function normalizeOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(x => String(x ?? ''))
  if (raw && typeof raw === 'object') {
    return LETTERS
      .map(k => (raw as Record<string, unknown>)[k])
      .filter(v => v != null && v !== '')
      .map(String)
  }
  return []
}

// FNV-1a hash → stable numeric seed from a string (question id/text).
function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// Deterministic Fisher–Yates order from a seed (same input → same order every render).
function seededOrder(n: number, seed: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i)
  let s = seed >>> 0
  const rand = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]] }
  return idx
}

export interface ShuffledMcq {
  options: string[]                              // display order, prefix-stripped
  correctLetter: string | null                   // display-position letter of the correct answer
  displayToOriginalLetter: Record<string, string> // display letter → original letter (for distractor lookups)
}

// Presents an MCQ with options shuffled deterministically per question, so the
// correct answer isn't always in the same stored position (the bank is heavily
// B-biased). Stable across renders because the order is seeded by `seedKey`.
export function buildShuffledMcq(
  rawOptions: unknown,
  correctAnswer: string | null | undefined,
  seedKey: string,
): ShuffledMcq {
  const original = normalizeOptions(rawOptions).map(o => stripPrefix(o))
  const origCorrect = resolveCorrectLetter(rawOptions, correctAnswer)
  const origCorrectIdx = origCorrect ? LETTERS.indexOf(origCorrect) : -1

  const order = seededOrder(original.length, hashString(seedKey))
  const options = order.map(i => original[i])
  const displayToOriginalLetter: Record<string, string> = {}
  let correctLetter: string | null = null
  order.forEach((origIdx, displayIdx) => {
    displayToOriginalLetter[LETTERS[displayIdx]] = LETTERS[origIdx]
    if (origIdx === origCorrectIdx) correctLetter = LETTERS[displayIdx]
  })
  return { options, correctLetter, displayToOriginalLetter }
}

/** Resolves the correct option LETTER (A–F) for an MCQ from any stored shape. */
export function resolveCorrectLetter(
  options: unknown,
  correctAnswer: string | null | undefined,
): string | null {
  const ca = (correctAnswer ?? '').trim()
  if (!ca) return null

  // 1. Already a clean letter.
  if (LETTERS.includes(ca)) return ca

  // 2. Leading letter prefix, e.g. "D. Ethambutol" / "C) ...".
  const m = ca.match(/^([A-F])[.):]/)
  if (m) return m[1]

  // 3. Full answer text — match against the options (with/without an "X. " prefix).
  const opts = normalizeOptions(options)
  const target = stripPrefix(ca).toLowerCase()
  const idx = opts.findIndex(o => {
    const ot = (o ?? '').trim().toLowerCase()
    return ot === ca.toLowerCase() || stripPrefix(o ?? '').toLowerCase() === target
  })
  if (idx >= 0 && idx < LETTERS.length) return LETTERS[idx]

  return null
}
