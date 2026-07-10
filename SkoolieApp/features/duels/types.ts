/** Shapes returned by the staged duel_* RPCs (see migrations/001_duels.sql). */

export type DuelStatus = 'pending' | 'p1_done' | 'p2_done' | 'complete' | 'expired'

export interface DuelSide {
  done: boolean
  /** null until submitted; opponent's stays null until YOU have submitted */
  score: number | null
  ms: number | null
}

export interface DuelOpponent extends DuelSide {
  id: string
  name: string
  avatar_url: string | null
  level: number | null
}

export interface DuelQuestion {
  id: string
  question_text: string
  options: unknown
  correct_answer: string
  explanation: string | null
  topic: string | null
  category: string | null
  subtopic: string | null
  difficulty: string | null
}

export interface Duel {
  id: string
  status: DuelStatus
  created_at: string
  expires_at: string
  rematch_of: string | null
  total: number
  is_challenger: boolean
  you: DuelSide
  them: DuelOpponent
  winner: string | null
  you_won: boolean
  draw: boolean
  /** Present only from duel_get while the caller still has a run to play */
  questions?: DuelQuestion[] | null
}

export interface OpponentHit {
  id: string
  full_name: string
  avatar_url: string | null
  level: number | null
}
