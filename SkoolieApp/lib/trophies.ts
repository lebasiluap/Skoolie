/**
 * Trophy client helper — runs the server award engine (check_trophies RPC,
 * idempotent) and celebrates what's new. Rewards (XP, streak freezes, XP
 * boosts) are granted SERVER-side inside the RPC; this only announces them.
 *
 * Anti-flood: up to 2 trophies celebrate individually; more than that
 * collapses into one "N trophies unlocked!" ceremony (first-run users can
 * retro-earn a dozen at once).
 */
import { supabase } from './supabase'
import { emitCelebrations, type Celebration } from './celebrations'

export interface EarnedTrophy {
  id: string; title: string; description: string; emoji: string
  reward_xp: number; reward_freezes: number; reward_boost_hours: number
}

function rewardLine(t: EarnedTrophy): string {
  const parts: string[] = []
  if (t.reward_xp > 0) parts.push(`+${t.reward_xp} XP`)
  if (t.reward_freezes > 0) parts.push(`${t.reward_freezes} streak freeze${t.reward_freezes > 1 ? 's' : ''} 🧊`)
  if (t.reward_boost_hours > 0) parts.push(`1.5× XP boost for ${t.reward_boost_hours}h ⚡`)
  return parts.length ? ` Reward: ${parts.join(' · ')}.` : ''
}

export async function checkTrophies(): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('check_trophies')
    if (error || !Array.isArray(data) || data.length === 0) return
    const earned = data as EarnedTrophy[]

    if (earned.length <= 2) {
      emitCelebrations(earned.map((t): Celebration => ({
        kind: 'trophy',
        title: `${t.emoji} ${t.title}`,
        body: `Trophy unlocked: ${t.description}.${rewardLine(t)} It now lives in your trophy case.`,
        mascot: 'cappy',
      })))
    } else {
      const totalXp = earned.reduce((s, t) => s + t.reward_xp, 0)
      const totalFreezes = earned.reduce((s, t) => s + t.reward_freezes, 0)
      const boost = Math.max(...earned.map(t => t.reward_boost_hours))
      const rewards: string[] = []
      if (totalXp > 0) rewards.push(`+${totalXp} XP`)
      if (totalFreezes > 0) rewards.push(`${totalFreezes} streak freezes 🧊`)
      if (boost > 0) rewards.push(`a 1.5× XP boost ⚡`)
      emitCelebrations([{
        kind: 'trophy',
        title: `${earned.length} trophies unlocked! 🏆`,
        body: `${earned.slice(0, 4).map(t => t.emoji).join(' ')}  ${earned.slice(0, 3).map(t => t.title).join(', ')}${earned.length > 3 ? ` and ${earned.length - 3} more` : ''}.${rewards.length ? ` Rewards: ${rewards.join(' · ')}.` : ''} See them all in your trophy case.`,
        mascot: 'cappy',
      }])
    }
  } catch { /* best-effort */ }
}
