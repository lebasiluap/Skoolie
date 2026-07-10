/**
 * Typed wrappers around the staged quest_* RPCs. All progress numbers come
 * from the server — these helpers only fetch and cast.
 */
import { supabase } from '@/lib/supabase'
import type { QuestToday, ChestGrant, QuestKind } from './types'

export async function questToday(): Promise<{ today: QuestToday | null; error: string | null }> {
  const { data, error } = await supabase.rpc('quest_today')
  if (error || !data) return { today: null, error: error?.message ?? 'no data' }
  return { today: data as QuestToday, error: null }
}

export async function questWeekChest(): Promise<{ grant: ChestGrant | null; error: string | null }> {
  const { data, error } = await supabase.rpc('quest_week_chest')
  if (error || !data) return { grant: null, error: error?.message ?? 'no data' }
  return { grant: data as ChestGrant, error: null }
}

/** Ionicons name per quest kind — shared by the card and the full screen. */
export function questIcon(kind: QuestKind): string {
  switch (kind) {
    case 'answered': return 'list'
    case 'correct': return 'checkmark-circle'
    case 'cases': return 'clipboard'
    case 'rapid': return 'flash'
    case 'xp': return 'star'
    case 'challenge': return 'trophy'
  }
}

/** Mon–Sun labels with dates for the current league week grid. */
export function weekGrid(weekStart: string, markedDays: string[]): { label: string; date: string; done: boolean; isToday: boolean; isFuture: boolean }[] {
  const marked = new Set(markedDays)
  const start = new Date(weekStart + 'T00:00:00')
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const todayKey = new Date().toISOString().slice(0, 10)
  return labels.map((label, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    return {
      label,
      date: key,
      done: marked.has(key),
      isToday: key === todayKey,
      isFuture: key > todayKey,
    }
  })
}
