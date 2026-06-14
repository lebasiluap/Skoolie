// ─── Enums ────────────────────────────────────────────────────────────────────

export type Profession = 'pharmacy' | 'medicine' | 'nursing' | 'general'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type QuestionType = 'mcq' | 'flashcard' | 'case_study'
export type Region = 'ghana' | 'universal'

// ─── Question ─────────────────────────────────────────────────────────────────

export interface Question {
  id: string
  professions: Profession[]       // array — question can apply to multiple
  course: string                  // e.g. "Pharmacology"
  topic: string                   // e.g. "Antibiotics"
  subtopic: string                // e.g. "Beta-lactams"
  difficulty: Difficulty
  question_type: QuestionType
  question_text: string
  options: string[]               // A, B, C, D
  correct_answer: string          // "A" | "B" | "C" | "D"
  explanation: string
  distractor_explanations: Record<string, string> // { "A": "...", "C": "..." }
  image_url?: string
  region: Region
  source_reference?: string       // e.g. "Ghana STG 2022, p.45"
  date_reviewed: string           // ISO date
  high_yield: boolean
  created_at: string
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  full_name: string
  profession: Profession
  country: string
  avatar_url?: string
  xp: number
  level: number
  current_streak: number
  longest_streak: number
  last_active_date: string
  created_at: string
}

// ─── Gamification ─────────────────────────────────────────────────────────────

export type LeagueType = 'bronze' | 'silver' | 'gold' | 'diamond'

export interface LeagueStanding {
  user_id: string
  league: LeagueType
  week_xp: number
  rank: number
  week_start: string
}

export interface UserStats {
  user_id: string
  total_questions_answered: number
  total_correct: number
  accuracy_pct: number
  questions_by_topic: Record<string, { answered: number; correct: number }>
}

// ─── Case Study ───────────────────────────────────────────────────────────────

export interface CaseStudyQuestion {
  question_number: number
  question: string
  options: string[]
  correct_answer: string
  explanation: string
}

export interface CaseStudy {
  id: string
  professions: Profession[]
  course: string
  topic: string
  subtopic: string
  title: string
  year_level: string[]
  style: 'multi_question' | 'osce'
  difficulty: Difficulty
  clinical_vignette: string
  patient_history: Record<string, string>
  examination_findings: Record<string, string>
  investigations: Record<string, string>
  questions: CaseStudyQuestion[]
  region: Region
  high_yield: boolean
  source_reference?: string
  created_at: string
}

// ─── Quiz Session ─────────────────────────────────────────────────────────────

export interface QuizSession {
  id: string
  user_id: string
  question_ids: string[]
  answers: Record<string, string>   // question_id → chosen answer
  score: number
  xp_earned: number
  started_at: string
  completed_at?: string
}
