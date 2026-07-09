/** Per-category notification switches (profile → Reminders). Missing = on. */
export type NotifPrefs = { streak?: boolean; barrage?: boolean; league?: boolean }

export type Profession = 'pharmacy' | 'medicine' | 'nursing' | 'dentistry' | 'midwifery' | 'general'
export type StudyYear = 'year1' | 'year2' | 'year3' | 'year4' | 'year5' | 'year6' | 'practitioner'
export type QuestionType = 'mcq' | 'flashcard' | 'case_study'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type CognitiveType = 'recall' | 'application' | 'mechanism' | 'calculation' | 'interpretation'

export interface UserProfile {
  id: string
  full_name: string
  email?: string
  profession: Profession
  study_year: StudyYear | null
  country: string
  level: number
  xp: number
  current_streak: number
  longest_streak: number
  last_active_date: string | null
  avatar_url: string | null
  access_key: string | null
  allow_repeat_questions: boolean
  show_question_tags: boolean
  timed_mode: boolean
  timed_seconds: number
  tier: number
  tier_score: number
  /** Topic names the user cares about; empty = "decide for me" (no biasing) */
  interests: string[]
  /** Streak freezes in the bank (earned from barrages, auto-consumed on missed days) */
  streak_freezes: number
  /** Days that were saved by a freeze — render blue in the tracker */
  frozen_dates: string[]
  /** First-encounter explanations already shown (see lib/intros) */
  intros_seen: string[]
  /** Notification category opt-outs — missing key means enabled */
  notif_prefs: NotifPrefs | null
  /** Expo push token for server-sent notifications (zone transitions) */
  push_token: string | null
  /** Trophy reward: 1.5× XP until this time (credit_xp honors it) */
  xp_boost_until: string | null
  /** Sound effects on/off (default on) */
  sound_enabled: boolean
  /** Haptic feedback on/off (default on) */
  haptics_enabled: boolean
  created_at: string
}

export interface Question {
  id: string
  question_text: string         // DB column name (not 'stem')
  options: string[]             // jsonb array: [0]=A, [1]=B, [2]=C, [3]=D
  correct_answer: 'A' | 'B' | 'C' | 'D'
  explanation: string
  topic: string
  category: string | null
  subtopic: string | null
  difficulty: Difficulty | null
  cognitive_type: CognitiveType | null
  high_yield: boolean | null
  question_type: QuestionType
  professions: Profession[]
  course?: string
  distractor_explanations?: Record<string, string>
}

export interface Flashcard {
  id: string
  front: string
  back: string
  topic: string
  category: string | null
  subtopic: string | null
  difficulty: Difficulty | null
  professions: Profession[]
}

export interface CaseStudy {
  id: string
  title: string
  scenario: string
  questions: CaseQuestion[]
  topic: string
  category: string | null
  difficulty: Difficulty | null
}

export interface CaseQuestion {
  question: string
  options: string[]
  correct_index: number
  explanation: string
}

export interface TopicRow {
  topic: string
  category: string | null
  subtopic: string | null
  count: number
}
