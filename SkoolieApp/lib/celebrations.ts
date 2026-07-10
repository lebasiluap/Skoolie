/**
 * Celebration interstitials — full-screen, mascot-led ceremonies for the
 * moments that deserve more than a stat silently ticking up.
 *
 * Detection is a pure diff between the previous and next profile snapshot,
 * computed at the single choke point every profile write flows through
 * (useAuth.loadProfile). Kinds:
 *
 *   level        level increased (server-side credit_xp)
 *   tier         specialty rank promotion (monotonic tier write)
 *   freeze_earned  barrage banked a streak freeze
 *   freeze_saved   a freeze auto-spent itself and the streak survived
 *
 * Module-level bus, same pattern as lib/toast: emit from anywhere, one
 * CelebrationHost (root layout) renders the queue one ceremony at a time.
 */
import type { UserProfile } from '@/types'
import { tierMeta } from '@/lib/tiers'
import { STREAK_FREEZE_BLUE } from '@/lib/streak'

export interface Celebration {
  kind: 'level' | 'tier' | 'freeze_earned' | 'freeze_saved' | 'league' | 'tournament' | 'trophy'
  title: string
  body: string
  mascot: 'cappy' | 'noggin' | 'buddy'
  /** accent for the ceremony ring + button (falls back to teal in the host) */
  accent?: string
}

export function diffProfiles(prev: UserProfile, next: UserProfile): Celebration[] {
  const out: Celebration[] = []

  // Levels 5/10/25/50 have their own trophies (lvl_5 … lvl_50) whose ceremony
  // already announces the milestone — showing both read as a duplicate.
  const TROPHY_LEVELS = new Set([5, 10, 25, 50])
  if ((next.level ?? 1) > (prev.level ?? 1) && !TROPHY_LEVELS.has(next.level ?? 1)) {
    out.push({
      kind: 'level',
      title: `Level ${next.level}!`,
      body: 'Your XP just rolled the counter over. Every question you answer keeps stacking — onward!',
      mascot: 'cappy',
    })
  }

  if ((next.tier ?? 0) > (prev.tier ?? 0)) {
    const m = tierMeta(next.tier)
    out.push({
      kind: 'tier',
      title: `${m.name}!`,
      body: 'Your specialty rank just went up — that takes breadth, not grinding one topic. Your new badge is live on the leaderboard.',
      mascot: 'buddy',
      accent: m.color,
    })
  }

  if ((next.streak_freezes ?? 0) > (prev.streak_freezes ?? 0)) {
    // Source-agnostic copy: freezes come from barrages, trophy rewards, AND
    // podium prizes — the old "Five barrages down" line was wrong for most.
    const gained = (next.streak_freezes ?? 0) - (prev.streak_freezes ?? 0)
    out.push({
      kind: 'freeze_earned',
      title: gained > 1 ? `${gained} Streak Freezes earned! ❄️` : 'Streak Freeze earned! ❄️',
      body: gained > 1
        ? `${gained} freezes are now banked. Miss a day and one spends itself automatically to keep your streak alive.`
        : 'A freeze is now banked. Miss a day and it spends itself automatically to keep your streak alive.',
      mascot: 'noggin',
      accent: STREAK_FREEZE_BLUE,
    })
  }

  const prevFrozen = prev.frozen_dates?.length ?? 0
  const nextFrozen = next.frozen_dates?.length ?? 0
  if (nextFrozen > prevFrozen) {
    const days = nextFrozen - prevFrozen
    out.push({
      kind: 'freeze_saved',
      title: 'Your streak survived! ❄️',
      body: days === 1
        ? 'You missed a day, but a banked freeze spent itself and kept your streak alive. It still counts — welcome back.'
        : `You missed ${days} days, but your banked freezes covered every one. The streak lives — welcome back.`,
      mascot: 'noggin',
      accent: STREAK_FREEZE_BLUE,
    })
  }

  return out
}

// ── Bus ──────────────────────────────────────────────────────────────────────
type Listener = (c: Celebration) => void
let listener: Listener | null = null
const pending: Celebration[] = []

export function emitCelebrations(items: Celebration[]): void {
  for (const c of items) {
    if (listener) listener(c)
    else pending.push(c)
  }
}

/** Host-only. Returns an unsubscribe; flushes anything queued before mount. */
export function _subscribeCelebrations(fn: Listener): () => void {
  listener = fn
  while (pending.length) fn(pending.shift()!)
  return () => { if (listener === fn) listener = null }
}
