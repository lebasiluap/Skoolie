export type StreakSnapshot = {
  current_streak: number
  longest_streak: number
  last_active_date: string | null
  streak_freezes: number
  frozen_dates: string[]
  study_days: string[]
  today: string
}

const day = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
export function parseStreakSnapshot(value: unknown): StreakSnapshot {
  const raw = value as StreakSnapshot | null
  // Historical profiles may carry SQL NULL for empty values. Missing keys and
  // malformed values still fail closed; never invent a day or a partial card.
  const v = raw && { ...raw, current_streak: raw.current_streak === null ? 0 : raw.current_streak,
    longest_streak: raw.longest_streak === null ? 0 : raw.longest_streak,
    streak_freezes: raw.streak_freezes === null ? 0 : raw.streak_freezes,
    frozen_dates: raw.frozen_dates === null ? [] : raw.frozen_dates,
    study_days: raw.study_days === null ? [] : raw.study_days }
  if (!v || !day(v.today) || ![v.current_streak, v.longest_streak, v.streak_freezes].every(n => Number.isInteger(n) && n >= 0)
    || v.streak_freezes > 2 || !(v.last_active_date === null || day(v.last_active_date))
    || !Array.isArray(v.frozen_dates) || !v.frozen_dates.every(day)
    || !Array.isArray(v.study_days) || !v.study_days.every(day)) throw new Error('Invalid streak snapshot')
  return { current_streak: v.current_streak, longest_streak: v.longest_streak,
    last_active_date: v.last_active_date, streak_freezes: v.streak_freezes,
    frozen_dates: [...v.frozen_dates], study_days: [...v.study_days], today: v.today }
}

/** One identity owns each store. A committed finish invalidates any earlier read.
 * Ordinary focus requests join the current read; invalidations queue one fresh read.
 * No persistence, Auth writes, optimistic rewards or client-side day arithmetic. */
export function createStreakSnapshotStore(read: () => Promise<unknown>) {
  let snapshot: StreakSnapshot | null = null
  let generation = 0, disposed = false
  let pending: Promise<void> | null = null
  const listeners = new Set<() => void>()
  const publish = () => { for (const fn of listeners) fn() }
  const refresh = (invalidate = false): Promise<void> => {
    if (disposed) return Promise.resolve()
    if (invalidate) generation++
    if (pending) return invalidate ? pending.then(() => refresh()) : pending
    const request = generation
    pending = Promise.resolve().then(read).then(value => {
      const next = parseStreakSnapshot(value)
      if (!disposed && request === generation) { snapshot = next; publish() }
    }).catch(() => { /* Keep the entire last snapshot; never affect sign-in. */ })
      .finally(() => { pending = null })
    return pending
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } },
    refresh,
    dispose: () => { disposed = true; generation++; listeners.clear() },
  }
}

export const nextUtcMidnightDelay = (now = Date.now()) => 86_400_000 - (now % 86_400_000) + 50
