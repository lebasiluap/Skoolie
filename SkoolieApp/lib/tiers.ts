// Specialty tier ladder — the "what kind of clinician are you becoming" axis.
//
// Unlike XP levels (raw effort), tiers measure ROUNDED expertise:
//   tierScore = distinct questions answered × (0.4 + 0.6 × diversity)
// where diversity (0–100, from lib/analytics) captures how broadly and evenly
// practice spreads across the syllabus. Grinding one topic stalls the tier;
// broad coverage accelerates it.
//
// The ladder is UNBOUNDED: named ranks first, then the final rank continues
// with roman numerals (Legend II, Legend III, …) forever.
//
// The current user's tier is recomputed wherever analytics are computed and
// persisted to user_profiles.tier so leaderboards can show everyone's badge.

export interface TierMeta {
  tier: number
  name: string
  color: string   // accent — render on a `color + '22'` tinted chip for both themes
  icon: string    // Ionicons name
}

// Rank names ordered by tier. Index 0 = tier 0 (everyone starts here).
const RANKS: { name: string; color: string; icon: string }[] = [
  { name: 'Fresher',            color: '#90A099', icon: 'leaf' },
  { name: 'Novice',             color: '#1F9E63', icon: 'book' },
  { name: 'Apprentice',         color: '#0E9E8E', icon: 'school' },
  { name: 'Practitioner',       color: '#0891B2', icon: 'pulse' },
  { name: 'Senior Practitioner',color: '#2563EB', icon: 'medkit' },
  { name: 'Specialist',         color: '#4F46E5', icon: 'flask' },
  { name: 'Senior Specialist',  color: '#7C3AED', icon: 'ribbon' },
  { name: 'Consultant',         color: '#C026D3', icon: 'medal' },
  { name: 'Senior Consultant',  color: '#F2774E', icon: 'shield-checkmark' },
  { name: 'Professor',          color: '#DC8B33', icon: 'star' },
  { name: 'Emeritus',           color: '#DBA431', icon: 'trophy' },
  { name: 'Legend',             color: '#D97706', icon: 'diamond' },
]

/** Rounded-expertise score. `diversity` is 0–100 (Analytics.diversity). */
export function tierScore(distinctAnswered: number, diversity: number): number {
  return Math.round(distinctAnswered * (0.4 + 0.6 * Math.min(100, Math.max(0, diversity)) / 100))
}

/** Score needed to REACH tier n (quadratic — the ladder keeps going). */
export function tierThreshold(n: number): number {
  return 10 * n * (n + 1)   // t1=20, t2=60, t3=120, t5=300, t10=1100, t20=4200 …
}

/** Highest tier whose threshold the score meets. */
export function tierFromScore(score: number): number {
  let n = 0
  while (score >= tierThreshold(n + 1)) n++
  return n
}

function roman(n: number): string {
  const M: [number, string][] = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]
  let out = ''
  for (const [v, s] of M) while (n >= v) { out += s; n -= v }
  return out
}

/** Display metadata for any tier number — beyond the named list it becomes "Legend II", "Legend III", … */
export function tierMeta(tier: number): TierMeta {
  const t = Math.max(0, Math.floor(tier))
  if (t < RANKS.length) return { tier: t, ...RANKS[t] }
  const last = RANKS[RANKS.length - 1]
  return { tier: t, ...last, name: `${last.name} ${roman(t - RANKS.length + 2)}` }
}

/** Progress from the current tier toward the next (for progress bars).
 *  Pass `floorTier` (the persisted, never-regressing tier) so the bar never
 *  runs backwards if diversity dips after a rank was earned. */
export function tierProgress(score: number, floorTier = 0): { tier: number; next: TierMeta; have: number; need: number; pct: number } {
  const tier = Math.max(tierFromScore(score), floorTier)
  const base = tierThreshold(tier)
  const target = tierThreshold(tier + 1)
  const have = Math.max(0, score - base)
  const need = target - base
  return { tier, next: tierMeta(tier + 1), have, need, pct: Math.min(1, have / need) }
}
