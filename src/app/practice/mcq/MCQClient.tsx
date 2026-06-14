'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Question } from '@/types'

const XP_PER_CORRECT = 10
const XP_PER_WRONG = 2

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

interface Props {
  questions: Question[]
  userId: string
  profession: string
}

type Phase = 'question' | 'review'

export default function MCQClient({ questions, userId, profession }: Props) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('question')
  const [score, setScore] = useState(0)
  const [totalXP, setTotalXP] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [sessionDone, setSessionDone] = useState(false)

  const question = questions[index]
  const progress = ((index + (phase === 'review' ? 1 : 0)) / questions.length) * 100
  const isCorrect = selected === question?.correct_answer
  const distractors = question?.distractor_explanations as Record<string, string> | undefined

  function handleSelect(letter: string) {
    if (phase === 'review') return
    setSelected(letter)
  }

  async function handleSubmit() {
    if (!selected) return
    const correct = selected === question.correct_answer
    const xpEarned = correct ? XP_PER_CORRECT : XP_PER_WRONG
    const newScore = correct ? score + 1 : score
    const newXP = totalXP + xpEarned

    setScore(newScore)
    setTotalXP(newXP)
    setAnswers(prev => ({ ...prev, [question.id]: selected }))
    setPhase('review')

    // Award XP + update streak in background
    const supabase = createClient()
    await Promise.allSettled([
      supabase.rpc('increment_xp', { user_id: userId, amount: xpEarned }),
      supabase.rpc('update_streak', { user_id: userId }),
    ])
  }

  async function handleNext() {
    if (index + 1 >= questions.length) {
      // Save session
      const supabase = createClient()
      await supabase.from('quiz_sessions').insert({
        user_id: userId,
        question_ids: questions.map(q => q.id),
        answers,
        score,
        xp_earned: totalXP,
        completed_at: new Date().toISOString(),
      })
      setSessionDone(true)
      return
    }

    setIndex(i => i + 1)
    setSelected(null)
    setPhase('question')
  }

  // Session complete screen
  if (sessionDone) {
    const accuracy = Math.round((score / questions.length) * 100)
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#f0fdfb] flex items-center justify-center mb-6">
          <span className="text-4xl">🎉</span>
        </div>
        <h1 className="text-2xl font-bold text-[#101010] mb-1">Session complete!</h1>
        <p className="text-gray-400 text-sm mb-8">Here&apos;s how you did</p>

        <div className="w-full max-w-xs grid grid-cols-3 gap-3 mb-8">
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#0D9488]">{score}/{questions.length}</p>
            <p className="text-xs text-gray-400 mt-1">Correct</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{accuracy}%</p>
            <p className="text-xs text-gray-400 mt-1">Accuracy</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">+{totalXP}</p>
            <p className="text-xs text-gray-400 mt-1">XP earned</p>
          </div>
        </div>

        <div className="w-full max-w-xs flex flex-col gap-3">
          <button
            onClick={() => {
              setIndex(0)
              setSelected(null)
              setPhase('question')
              setScore(0)
              setTotalXP(0)
              setAnswers({})
              setSessionDone(false)
            }}
            className="w-full py-3 rounded-full bg-[#0D9488] text-white font-semibold hover:bg-[#0b7a6e] transition-colors"
          >
            Practice again
          </button>
          <Link
            href="/dashboard"
            className="w-full py-3 rounded-full border border-gray-200 text-[#101010] font-semibold text-center hover:bg-gray-50 transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-gray-100">
        <Link href="/dashboard" className="text-gray-400 text-xl">←</Link>
        <span className="text-sm font-semibold text-gray-500">{index + 1} / {questions.length}</span>
        <span className="text-xs bg-[#f0fdfb] text-[#0D9488] px-3 py-1 rounded-full font-semibold capitalize">
          {profession}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100">
        <div
          className="h-full bg-[#0D9488] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 px-5 py-6 flex flex-col gap-5 pb-32">
        {/* Tags */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs bg-[#f0fdfb] text-[#0D9488] px-3 py-1 rounded-full font-semibold">
            {question.topic}
          </span>
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
            question.difficulty === 'easy' ? 'bg-green-50 text-green-600' :
            question.difficulty === 'medium' ? 'bg-orange-50 text-orange-500' :
            'bg-red-50 text-red-500'
          }`}>
            {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
          </span>
          <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-semibold capitalize">
            {question.region}
          </span>
          {question.high_yield && (
            <span className="text-xs bg-yellow-50 text-yellow-600 px-3 py-1 rounded-full font-semibold">
              ⭐ High Yield
            </span>
          )}
        </div>

        {/* Question */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-[#101010] text-base leading-relaxed font-medium">
            {question.question_text}
          </p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {(question.options as string[]).map((option, i) => {
            const letter = OPTION_LETTERS[i]
            const isSelected = selected === letter
            const isAnswer = letter === question.correct_answer

            let style = 'border-gray-200 bg-white'
            if (phase === 'review') {
              if (isAnswer) style = 'border-[#0D9488] bg-[#f0fdfb]'
              else if (isSelected && !isAnswer) style = 'border-red-300 bg-red-50'
              else style = 'border-gray-100 bg-gray-50 opacity-60'
            } else if (isSelected) {
              style = 'border-[#0D9488] bg-[#f0fdfb]'
            } else {
              style = 'border-gray-200 bg-white hover:border-gray-300'
            }

            return (
              <button
                key={letter}
                onClick={() => handleSelect(letter)}
                disabled={phase === 'review'}
                className={`w-full text-left px-4 py-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${style}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  phase === 'review' && isAnswer ? 'bg-[#0D9488] text-white' :
                  phase === 'review' && isSelected && !isAnswer ? 'bg-red-400 text-white' :
                  isSelected ? 'bg-[#0D9488] text-white' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {phase === 'review' && isAnswer ? '✓' :
                   phase === 'review' && isSelected && !isAnswer ? '✗' :
                   letter}
                </div>
                <span className={`text-sm leading-snug ${
                  phase === 'review' && isAnswer ? 'text-[#0D9488] font-semibold' :
                  phase === 'review' && isSelected && !isAnswer ? 'text-red-500 font-semibold' :
                  'text-[#101010]'
                }`}>
                  {option.replace(/^[A-D]\.\s*/, '')}
                </span>
              </button>
            )
          })}
        </div>

        {/* Explanation (review phase) */}
        {phase === 'review' && (
          <div className={`rounded-2xl p-5 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className={`font-bold mb-2 ${isCorrect ? 'text-green-700' : 'text-red-600'}`}>
              {isCorrect ? `✓ Correct! +${XP_PER_CORRECT} XP` : `✗ Incorrect +${XP_PER_WRONG} XP`}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{question.explanation}</p>

            {/* Why other options are wrong */}
            {!isCorrect && distractors && selected && distractors[selected] && (
              <div className="mt-3 pt-3 border-t border-red-100">
                <p className="text-xs font-semibold text-red-500 mb-1">Why {selected} is wrong:</p>
                <p className="text-xs text-gray-600">{distractors[selected]}</p>
              </div>
            )}

            {question.source_reference && (
              <p className="text-xs text-gray-400 mt-3">📚 {question.source_reference}</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5">
        {phase === 'question' ? (
          <button
            onClick={handleSubmit}
            disabled={!selected}
            className="w-full py-3.5 rounded-full bg-[#0D9488] text-white font-semibold text-base hover:bg-[#0b7a6e] transition-colors disabled:opacity-40"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full py-3.5 rounded-full bg-[#101010] text-white font-semibold text-base hover:bg-[#222] transition-colors"
          >
            {index + 1 >= questions.length ? 'See results →' : 'Next question →'}
          </button>
        )}
      </div>
    </div>
  )
}
