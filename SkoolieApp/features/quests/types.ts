/** Shapes returned by the staged quest_* RPCs (see migrations/001_quests.sql). */

export type QuestKind = 'answered' | 'correct' | 'cases' | 'rapid' | 'xp' | 'challenge'

export interface Quest {
  key: string
  title: string
  kind: QuestKind
  target: number
  /** Server-computed, clamped to target — the client never counts anything */
  progress: number
  done: boolean
}

export interface ChestState {
  needed: number
  eligible: boolean
  claimed: boolean
}

export interface QuestWeek {
  /** ISO Monday, matching the league week */
  week_start: string
  /** 'YYYY-MM-DD' of each quest-complete day this week */
  days: string[]
  count: number
  chest: ChestState
}

export interface QuestToday {
  day: string
  quests: Quest[]
  all_done: boolean
  week: QuestWeek
}

export interface ChestGrant {
  granted: boolean
  reason?: 'not_enough_days' | 'already_claimed'
  xp?: number
  freezes?: number
  days_count?: number
  needed?: number
}
