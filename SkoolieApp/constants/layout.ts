/**
 * Layout tokens (audit #14) — the shared spacing / radius / type scale.
 *
 * Existing screens were built with ad-hoc values that cluster tightly around
 * this scale; rather than churn hundreds of styles, the tokens codify the
 * de-facto system so NEW code snaps to it and refactors converge on it.
 *
 *   import { SP, RAD, TYPE, NUM } from '@/constants/layout'
 *   padding: SP.lg, borderRadius: RAD.card, ...NUM  // on any live counter
 */
import type { TextStyle } from 'react-native'

/** Spacing scale — 4-pt base. xs 4 · sm 8 · md 12 · lg 16 · xl 18 · 2xl 24 · 3xl 32 */
export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 18, xxl: 24, xxxl: 32 } as const

/** Radius scale — chip 10 · control 14 · row 16 · card 20 · sheet 24 · pill 999 */
export const RAD = { chip: 10, control: 14, row: 16, card: 20, sheet: 24, pill: 999 } as const

/** Type scale (Nunito) — matches the sizes the app already converged on. */
export const TYPE = {
  eyebrow: 11,   // section labels, letterSpacing ~0.7
  meta: 12.5,    // timestamps, captions
  body: 14.5,    // paragraph copy
  label: 15,     // buttons, list titles
  title: 17,     // card headings
  page: 26,      // page titles (Nunito_900Black)
  stat: 24,      // stat tile values
} as const

/**
 * Tabular numerals — every digit the same width, so live counters (XP, timers,
 * streaks, scores) don't jitter sideways as values tick. Spread into any
 * Text style that renders changing numbers.
 */
export const NUM: Pick<TextStyle, 'fontVariant'> = { fontVariant: ['tabular-nums'] }
