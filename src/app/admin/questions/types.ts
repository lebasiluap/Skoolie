export interface NewQuestion {
  question_type: 'mcq' | 'flashcard'
  professions: string[]
  course: string
  topic: string
  subtopic: string
  difficulty: 'easy' | 'medium' | 'hard'
  region: 'universal' | 'ghana'
  high_yield: boolean
  question_text: string           // MCQ stem, or flashcard FRONT
  explanation: string
  options?: string[]              // MCQ only, ordered A..
  correct_answer: string          // MCQ letter, or flashcard BACK text
}
