// Streak day math + milestone tiers.
// Uses LOCAL calendar days (the device's day boundary) so a session at 11pm counts
// for "today" wherever the user is — and so all read/write sites agree.

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const todayKey = () => dateKey(new Date())
export const yesterdayKey = () => dateKey(new Date(Date.now() - 86_400_000))

/** Streak to display: 0 if the user hasn't studied today or yesterday (i.e. it's broken). */
export function effectiveStreak(
  currentStreak: number | null | undefined,
  lastActiveDate: string | null | undefined,
): number {
  const s = currentStreak ?? 0
  if (!lastActiveDate) return 0
  return lastActiveDate === todayKey() || lastActiveDate === yesterdayKey() ? s : 0
}

/** New {current_streak, longest_streak, last_active_date} after completing a session today. */
export function computeStreakUpdate(p: {
  current_streak?: number | null
  longest_streak?: number | null
  last_active_date?: string | null
}) {
  const today = todayKey()
  const cur = p.current_streak ?? 0
  const last = p.last_active_date ?? ''
  // Same day → unchanged; yesterday → +1; otherwise the streak was broken → restart at 1.
  const newStreak = last === today ? cur : last === yesterdayKey() ? cur + 1 : 1
  return {
    current_streak: newStreak,
    longest_streak: Math.max(p.longest_streak ?? 0, newStreak),
    last_active_date: today,
  }
}

// The streak's signature colour — a bright, vivid gold ("fire"), distinct from the
// teal brand and the red "missed" marker. Used below any tier and for the 7-day tier.
export const STREAK_GOLD = '#F5B301'        // bright — great on dark surfaces & as a fill
export const STREAK_GOLD_DEEP = '#B8780A'   // deeper — readable as text on light surfaces

// Streak-freeze blue — frozen days render this instead of gold in the tracker.
export const STREAK_FREEZE_BLUE = '#38BDF8'
export const STREAK_FREEZE_DEEP = '#0284C7'

/** Whole days missed between last activity and today (0 = streak unbroken so far). */
export function missedDays(lastActiveDate: string | null | undefined): number {
  if (!lastActiveDate) return 0
  const [y, m, d] = lastActiveDate.split('-').map(Number)
  if (!y || !m || !d) return 0
  const last = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - last.getTime()) / 86_400_000)
  return Math.max(0, diff - 1)
}

/**
 * Streak-freeze auto-consumption: if the gap since last activity is fully
 * covered by available freezes, returns the profile updates that spend them.
 * Frozen days COUNT toward the streak (they render blue, not gold). If freezes
 * can't cover the whole gap, nothing is consumed and the streak dies normally.
 */
export function computeFreezeConsumption(p: {
  current_streak?: number | null
  longest_streak?: number | null
  last_active_date?: string | null
  streak_freezes?: number | null
  frozen_dates?: string[] | null
}): null | {
  current_streak: number
  longest_streak: number
  last_active_date: string
  streak_freezes: number
  frozen_dates: string[]
} {
  const gap = missedDays(p.last_active_date)
  const freezes = p.streak_freezes ?? 0
  const cur = p.current_streak ?? 0
  if (gap === 0 || cur === 0 || freezes < gap) return null
  const dates: string[] = []
  for (let i = gap; i >= 1; i--) dates.push(dateKey(new Date(Date.now() - i * 86_400_000)))
  const newStreak = cur + gap
  return {
    current_streak: newStreak,
    longest_streak: Math.max(p.longest_streak ?? 0, newStreak),
    last_active_date: yesterdayKey(),
    streak_freezes: freezes - gap,
    frozen_dates: [...(p.frozen_dates ?? []), ...dates].slice(-60),   // keep recent history
  }
}

const luminance = (hex: string) => {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b
}

// Theme- and contrast-aware streak colours so the gold reads well in both modes.
export function streakColors(streak: number, isDark: boolean) {
  const { current, next } = streakStatus(streak)
  const fill = current?.color ?? STREAK_GOLD                       // circle / badge fills + borders
  const text = current?.color ?? (isDark ? STREAK_GOLD : STREAK_GOLD_DEEP) // text/icons on the card surface
  const onFill = luminance(fill) > 150 ? '#3A2A00' : '#FFFFFF'     // glyph drawn on a filled circle/badge
  const goalRaw = next?.color ?? fill
  const goal = goalRaw === STREAK_GOLD && !isDark ? STREAK_GOLD_DEEP : goalRaw
  return { current, next, fill, text, onFill, goal }
}

export interface StreakTier {
  days: number
  label: string   // e.g. "7-day streak"
  short: string   // compact badge label, e.g. "7d"
  color: string
}

// Milestones: 7, 14, 30 days, then 3 / 6 / 12 months. 7-day is gold.
export const STREAK_TIERS: StreakTier[] = [
  { days: 7,   label: '7-day streak',   short: '7d',  color: STREAK_GOLD }, // gold
  { days: 14,  label: '14-day streak',  short: '14d', color: '#EC7A3C' }, // amber
  { days: 30,  label: '30-day streak',  short: '30d', color: '#14B8A6' }, // teal
  { days: 90,  label: '3-month streak', short: '3mo', color: '#3B82F6' }, // blue
  { days: 180, label: '6-month streak', short: '6mo', color: '#8B5CF6' }, // purple
  { days: 365, label: '1-year streak',  short: '1yr', color: '#EF4444' }, // crimson
]

/** Highest tier reached, the next tier to aim for, and progress (0–1) toward it. */
export function streakStatus(streak: number): {
  current: StreakTier | null
  next: StreakTier | null
  progress: number
} {
  let current: StreakTier | null = null
  let next: StreakTier | null = STREAK_TIERS[0]
  for (let i = 0; i < STREAK_TIERS.length; i++) {
    if (streak >= STREAK_TIERS[i].days) {
      current = STREAK_TIERS[i]
      next = STREAK_TIERS[i + 1] ?? null
    }
  }
  const prevDays = current?.days ?? 0
  const targetDays = next?.days ?? current?.days ?? STREAK_TIERS[0].days
  const span = Math.max(1, targetDays - prevDays)
  const progress = next ? Math.max(0, Math.min(1, (streak - prevDays) / span)) : 1
  return { current, next, progress }
}
