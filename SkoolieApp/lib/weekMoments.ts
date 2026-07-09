/**
 * Week-end moments — the Duolingo-style "you finished #3 and advanced!"
 * beat, checked once per week (AsyncStorage-deduped) when the dashboard
 * gains focus.
 *
 * - League result: promotion = full celebration; demotion = quiet toast;
 *   staying put = nothing.
 * - Diamond Tournament: entering / advancing a stage / final result.
 *
 * Both RPCs are idempotent and mirror credit_xp's league rules server-side,
 * so what we announce is always what actually happened.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'
import { emitCelebrations } from './celebrations'
import { showToast } from './toast'

const LEAGUE_LABEL: Record<string, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond' }
const LEAGUE_EMOJI: Record<string, string> = { bronze: '🥉', silver: '🥈', gold: '🥇', diamond: '💎' }

async function once(key: string): Promise<boolean> {
  try {
    if (await AsyncStorage.getItem(key)) return false
    await AsyncStorage.setItem(key, '1')
    return true
  } catch { return false }
}

export async function checkWeekMoments(): Promise<void> {
  try {
    const { data: r } = await supabase.rpc('get_week_result')
    if (r?.participated && await once(`weekResult:${r.week_start}`)) {
      if (r.outcome === 'promoted') {
        emitCelebrations([{
          kind: 'league',
          title: `${LEAGUE_LABEL[r.new_league]} League! ${LEAGUE_EMOJI[r.new_league] ?? '🏅'}`,
          body: `You finished #${r.rank} last week with ${Number(r.week_xp).toLocaleString()} XP — promoted! New league, same rules: top 10 rise.`,
          mascot: 'cappy',
        }])
      } else if (r.outcome === 'demoted') {
        showToast(`You slipped to ${LEAGUE_LABEL[r.new_league]} League this week — top 10 gets you back.`, 'info')
      }
    }

    const { data: t } = await supabase.rpc('get_tournament')
    if (!t?.in_tournament) return
    if (t.status === 'active') {
      if (await once(`tourneyStage:${t.cohort_week}:${t.stage}`)) {
        emitCelebrations([{
          kind: 'tournament',
          title: t.stage === 1 ? 'Diamond Tournament! 🏆' : t.stage === 2 ? 'Semifinals! 🏆' : 'The Finals! 👑',
          body: t.stage === 1
            ? 'Top 10 in Diamond got you a place. Three weeks, three cuts — the top half advances each week.'
            : t.stage === 2
              ? 'You survived the quarterfinals! Beat half this group to reach the Finals.'
              : 'The last round. Finish #1 this week and the crown is yours.',
          mascot: 'cappy',
        }])
      }
    } else if (await once(`tourneyEnd:${t.cohort_week}`)) {
      if (t.status === 'champion') {
        emitCelebrations([{
          kind: 'tournament',
          title: 'Tournament Champion! 👑',
          body: 'You outlasted every cut and topped the Finals of the Diamond Tournament. The best of the best — that is you.',
          mascot: 'cappy',
        }])
      } else if (t.status === 'finalist') {
        emitCelebrations([{
          kind: 'tournament',
          title: `Finals podium — #${t.final_rank}! 🏆`,
          body: 'You made the last round of the Diamond Tournament and finished on the podium. Massive.',
          mascot: 'cappy',
        }])
      } else {
        showToast('Knocked out of the Diamond Tournament — finish top 10 in Diamond to requalify.', 'info')
      }
    }
  } catch { /* best-effort — never block the dashboard */ }
}
