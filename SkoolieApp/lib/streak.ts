// Streak day math + milestone tiers.
// UTC is the server's study-day boundary (also Ghana time).

export function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}
export const todayKey = () => dateKey(new Date())
export const yesterdayKey = () => dateKey(new Date(Date.now() - 86_400_000))

/** Streak to display: 0 if the user hasn't studied today or yesterday (i.e. it's broken). */
export function effectiveStreak(
  currentStreak: number | null | undefined,
  lastActiveDate: string | null | undefined,
  frozenDates: string[] | null | undefined = [],
): number {
  const s = currentStreak ?? 0
  if (!lastActiveDate) return 0
  if (lastActiveDate === todayKey() || lastActiveDate === yesterdayKey()) return s
  if (lastActiveDate > todayKey()) return 0
  const frozen = new Set(frozenDates ?? [])
  const last = Date.parse(`${lastActiveDate}T00:00:00Z`)
  const yesterday = Date.parse(`${yesterdayKey()}T00:00:00Z`)
  if (!Number.isFinite(last) || (yesterday - last) / 86400000 > frozen.size) return 0
  for (let d = last + 86400000; d <= yesterday; d += 86400000) {
    if (!frozen.has(dateKey(new Date(d)))) return 0
  }
  return s
}

// The streak's signature colour — a bright, vivid gold ("fire"), distinct from the
// teal brand and the red "missed" marker. Used below any tier and for the 7-day tier.
export const STREAK_GOLD = '#F5B301'        // bright — great on dark surfaces & as a fill
export const STREAK_GOLD_DEEP = '#B8780A'   // deeper — readable as text on light surfaces

// Streak-freeze blue — frozen days render this instead of gold in the tracker.
export const STREAK_FREEZE_BLUE = '#38BDF8'
export const STREAK_FREEZE_DEEP = '#0284C7'

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
