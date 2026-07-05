// Interest-aware pool ordering for "Smart start" / "Surprise me" flows.
//
// Users pick areas of interest at onboarding (or "decide for me" = empty array,
// changeable in Profile settings). When interests exist, random session pools
// are ordered so interesting content fills the session first — but never
// exclusively, so coverage/diversity (tier, readiness) still grows:
//
//   unseen ∩ interest  >  unseen  >  seen ∩ interest  >  seen
//
// Unseen-first outranks interest so the "Repeat questions" setting keeps its
// meaning. Each bucket is shuffled so sessions stay fresh.

const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)

/** Order a random pool by interest + unseen buckets (see module doc). */
export function orderByInterestAndUnseen<T extends { id: string; topic?: string | null }>(
  pool: T[],
  interests: string[] | null | undefined,
  seen: Set<string>,
): T[] {
  const hasInterests = !!interests && interests.length > 0
  const isInterest = (x: T) => hasInterests && !!x.topic && interests!.includes(x.topic)
  const buckets: T[][] = [[], [], [], []]
  for (const x of pool) {
    const unseen = !seen.has(x.id)
    buckets[unseen ? (isInterest(x) ? 0 : 1) : (isInterest(x) ? 2 : 3)].push(x)
  }
  return buckets.flatMap(shuffle)
}

/** Simple interest-first ordering when there's no seen-tracking (rapid fire). */
export function preferInterests<T extends { topic?: string | null }>(
  pool: T[],
  interests: string[] | null | undefined,
): T[] {
  if (!interests || interests.length === 0) return pool
  return [
    ...shuffle(pool.filter(x => !!x.topic && interests.includes(x.topic!))),
    ...shuffle(pool.filter(x => !(x.topic && interests.includes(x.topic)))),
  ]
}
