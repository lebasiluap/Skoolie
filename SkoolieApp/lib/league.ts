/**
 * League zone detection — shared, server-rule-mirroring math for "where am I
 * relative to the promotion/demotion cuts", plus week-over-open transition
 * detection for notifications.
 *
 * Promotion counts mirror the server's league_promote_count (Duolingo-style):
 * Bronze 15 · Silver 12 · Gold 10 · Diamond 10 (into the Tournament).
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

export const LEAGUE_PROMOTE: Record<string, number> = { bronze: 15, silver: 12, gold: 10, diamond: 10 }

/** Adaptive cut (mirrors server league_effective_promote): Duolingo's counts
 *  assume 30-person boards — small cohorts shrink the cut so both zones stay
 *  real (top N promote, bottom 5 drop, never overlapping). */
export function effectivePromote(league: string, cohort: number): number {
  const base = LEAGUE_PROMOTE[league] ?? 10
  return Math.min(base, Math.max(1, cohort - (cohort >= 10 ? 5 : 0)))
}

export type LeagueZone = 'promo' | 'near' | 'mid' | 'releg'

export interface ZoneEvent {
  kind: 'enter_promo' | 'exit_promo' | 'near_promo' | 'enter_releg'
  rank: number
  league: string
  promoteN: number
}

/** ISO Monday of the current week — matches Postgres date_trunc('week'). */
export function weekStartKey(): string {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

/**
 * Fetch this week's standings, compute the caller's zone, diff it against the
 * last zone seen this week (AsyncStorage), and return the transition worth
 * telling them about — or null. Silent when: not racing this week, merged
 * multi-league "Open" board (display ranks aren't league ranks), or no change
 * worth a ping.
 */
export async function detectZoneEvent(userId: string): Promise<ZoneEvent | null> {
  try {
    const { data } = await supabase.rpc('get_weekly_league')
    const all = (data ?? []) as { id: string; week_xp: number; league: string; is_bot?: boolean }[]
    // Pacer bots are display-only — zone truth is computed over humans
    const rows = all.filter(r => !r.is_bot)
    if (!rows.length) return null
    if (new Set(rows.map(r => r.league)).size > 1) return null
    const idx = rows.findIndex(r => r.id === userId)
    if (idx < 0) return null

    // rank for the MESSAGE uses the displayed board (bots included) so the
    // number matches what the user sees; the zone math stays human-only
    const rank = all.findIndex(r => r.id === userId) + 1
    const humanRank = idx + 1
    const me = rows[idx]
    const league = me.league
    const cohort = rows.length
    const promoteN = effectivePromote(league, cohort)
    const demoStart = Math.max(promoteN + 1, cohort - 4)
    const zone: LeagueZone =
      humanRank <= promoteN && me.week_xp > 0 ? 'promo'
        : cohort >= 10 && humanRank >= demoStart ? 'releg'
          : humanRank <= promoteN + 2 ? 'near'
            : 'mid'

    const prevKey = `leagueZone:${weekStartKey()}`
    const prev = (await AsyncStorage.getItem(prevKey)) as LeagueZone | null
    await AsyncStorage.setItem(prevKey, zone)

    const base = { rank, league, promoteN }
    if (zone === prev) {
      // No transition — "near" still earns its once-per-week nudge (the
      // scheduler dedupes per kind per week, so this can't repeat).
      return zone === 'near' ? { kind: 'near_promo', ...base } : null
    }
    if (zone === 'releg') return { kind: 'enter_releg', ...base }
    if (zone === 'promo') return { kind: 'enter_promo', ...base }
    if (prev === 'promo') return { kind: 'exit_promo', ...base }
    if (zone === 'near') return { kind: 'near_promo', ...base }
    return null
  } catch {
    return null
  }
}
