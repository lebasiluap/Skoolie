'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Question } from '@/types'
import BookmarkButton from '@/components/BookmarkButton'

const XP_PER_CORRECT = 10
const XP_PER_WRONG = 2

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

interface Props {
  questions: Question[]
  userId: string
  profession: string
  bookmarkedIds: string[]
  showTags: boolean
}

type Phase = 'question' | 'review'

export default function MCQClient({ questions, userId, profession, bookmarkedIds, showTags }: Props) {
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

    const supabase = createClient()
    await Promise.allSettled([
      supabase.rpc('increment_xp', { user_id: userId, amount: xpEarned }),
      supabase.rpc('update_streak', { user_id: userId }),
    ])
  }

  async function handleNext() {
    if (index + 1 >= questions.length) {
      const supabase = createClient()
      const now = new Date().toISOString()
      await Promise.allSettled([
        supabase.from('quiz_sessions').insert({
          user_id: userId,
          question_ids: questions.map(q => q.id),
          answers,
          score,
          xp_earned: totalXP,
          completed_at: now,
        }),
        supabase.from('user_question_history').upsert(
          questions.map(q => ({
            user_id: userId,
            question_id: q.id,
            question_type: 'mcq',
            topic: q.topic,
            category: (q as unknown as Record<string, unknown>).category as string ?? null,
            subtopic: q.subtopic ?? null,
            difficulty: q.difficulty,
            answered_at: now,
            was_correct: answers[q.id] === q.correct_answer,
          })),
          { onConflict: 'user_id,question_id' }
        ),
      ])
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
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#0D9488]/15 border border-[#0D9488]/30 flex items-center justify-center mb-6">
          <span className="text-4xl">🎉</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Session complete!</h1>
        <p className="text-[#888888] text-sm mb-8">Here&apos;s how you did</p>

        <div className="w-full max-w-xs grid grid-cols-3 gap-3 mb-8">
          <div className="bg-[#141414] rounded-2xl p-4 text-center border border-[#1F1F1F]">
            <p className="text-2xl font-bold text-[#0D9488]">{score}/{questions.length}</p>
            <p className="text-xs text-[#888888] mt-1">Correct</p>
          </div>
          <div className="bg-[#141414] rounded-2xl p-4 text-center border border-[#1F1F1F]">
            <p className="text-2xl font-bold text-[#0D9488]">{accuracy}%</p>
            <p className="text-xs text-[#888888] mt-1">Accuracy</p>
          </div>
          <div className="bg-[#141414] rounded-2xl p-4 text-center border border-[#1F1F1F]">
            <p className="text-2xl font-bold text-orange-400">+{totalXP}</p>
            <p className="text-xs text-[#888888] mt-1">XP earned</p>
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
            className="w-full py-3 rounded-full bg-[#0D9488] text-black font-semibold hover:bg-[#0b7a6e] transition-colors"
          >
            Practice again
          </button>
          <Link
            href="/dashboard"
            className="w-full py-3 rounded-full border border-[#2A2A2A] text-white font-semibold text-center hover:bg-[#141414] transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="bg-[#0A0A0A] px-5 py-4 flex items-center justify-between border-b border-[#1F1F1F]">
        <Link
          href="/practice/mcq"
          className="w-9 h-9 rounded-full bg-[#1F1F1F] flex items-center justify-center text-[#888888] hover:text-white transition-colors"
        >
          ←
        </Link>
        <span className="text-sm font-semibold text-[#888888]">{index + 1} / {questions.length}</span>
        <BookmarkButton
          questionId={question.id}
          userId={userId}
          initialBookmarked={bookmarkedIds.includes(question.id)}
        />
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#1F1F1F]">
        <div
          className="h-full bg-[#0D9488] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 px-5 py-5 flex flex-col gap-4 pb-36">
        {/* Tags */}
        {showTags && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs bg-[#1F1F1F] text-[#888888] px-3 py-1 rounded-full font-medium">
              {question.topic}
            </span>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
              question.difficulty === 'easy'   ? 'bg-green-500/10 text-green-400' :
              question.difficulty === 'medium' ? 'bg-orange-400/10 text-orange-400' :
                                                 'bg-red-500/10 text-red-400'
            }`}>
              {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
            </span>
            {question.region && (
              <span className="text-xs bg-[#1F1F1F] text-[#888888] px-3 py-1 rounded-full font-medium capitalize">
                {question.region}
              </span>
            )}
            {question.high_yield && (
              <span className="text-xs bg-yellow-400/10 text-yellow-400 px-3 py-1 rounded-full font-medium">
                ⭐ High Yield
              </span>
            )}
          </div>
        )}

        {/* Question card */}
        <div className="bg-[#141414] rounded-2xl p-5 border border-[#1F1F1F]">
          <p className="text-white text-base leading-relaxed font-medium">
            {question.question_text}
          </p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2.5">
          {(question.options as string[]).map((option, i) => {
            const letter = OPTION_LETTERS[i]
            const isSelected = selected === letter
            const isAnswer = letter === question.correct_answer

            // Option container style
            let containerStyle = 'border border-[#1F1F1F] bg-transparent hover:border-[#2A2A2A]'
            if (phase === 'review') {
              if (isAnswer) containerStyle = 'border border-[#0D9488] bg-[#0D9488]/[0.07]'
              else if (isSelected && !isAnswer) containerStyle = 'border border-red-500 bg-red-500/[0.07]'
              else containerStyle = 'border border-[#1F1F1F] bg-transparent opacity-50'
            } else if (isSelected) {
              containerStyle = 'border border-[#0D9488] bg-[#0D9488]/[0.07]'
            }

            // Letter badge style
            let badgeStyle = 'bg-[#1F1F1F] text-[#555555]'
            if (phase === 'review') {
              if (isAnswer) badgeStyle = 'bg-[#0D9488] text-black'
              else if (isSelected && !isAnswer) badgeStyle = 'bg-red-500 text-white'
            } else if (isSelected) {
              badgeStyle = 'bg-[#0D9488] text-black'
            }

            // Option text color
            let textColor = 'text-white'
            if (phase === 'review') {
              if (isAnswer) textColor = 'text-[#5EEAD4] font-semibold'
              else if (isSelected && !isAnswer) textColor = 'text-red-400 font-semibold'
              else textColor = 'text-[#555555]'
            }

            return (
              <button
                key={letter}
                onClick={() => handleSelect(letter)}
                disabled={phase === 'review'}
                className={`w-full text-left px-4 py-3.5 rounded-2xl transition-all flex items-center gap-3.5 ${containerStyle}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${badgeStyle}`}>
                  {phase === 'review' && isAnswer ? '✓' :
                   phase === 'review' && isSelected && !isAnswer ? '✗' :
                   letter}
                </div>
                <span className={`text-sm leading-snug ${textColor}`}>
                  {option.replace(/^[A-D]\.\s*/, '')}
                </span>
              </button>
            )
          })}
        </div>

        {/* Explanation (review phase) */}
        {phase === 'review' && (
          <div className="flex flex-col gap-3">
            {/* Result badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold w-fit ${
              isCorrect
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {isCorrect ? `✓ Correct! +${XP_PER_CORRECT} XP` : `✗ Incorrect · +${XP_PER_WRONG} XP`}
            </div>

            {/* Explanation card */}
            <div className="bg-[#141414] rounded-2xl border border-[#1F1F1F] p-4 flex flex-col gap-3">
              <p className="text-sm text-[#CCCCCC] leading-relaxed">{question.explanation}</p>

              {!isCorrect && distractors && selected && distractors[selected] && (
                <div className="pt-3 border-t border-[#1F1F1F]">
                  <p className="text-xs font-semibold text-red-400 mb-1">Why {selected} is wrong:</p>
                  <p className="text-xs text-[#888888] leading-relaxed">{distractors[selected]}</p>
                </div>
              )}

              {/* Key concept teal box */}
              {question.source_reference && (
                <div className="bg-[#0D9488]/[0.07] border border-[#0D9488]/30 rounded-xl p-3 flex items-start gap-2">
                  <span className="text-sm shrink-0">📚</span>
                  <p className="text-xs text-[#5EEAD4] leading-relaxed">{question.source_reference}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom button */}
      <div className="fixed bottom-16 left-0 right-0 bg-[#0A0A0A] border-t border-[#1F1F1F] px-5 py-4">
        {phase === 'question' ? (
          <button
            onClick={handleSubmit}
            disabled={!selected}
            className="w-full py-3.5 rounded-full bg-[#0D9488] text-black font-semibold text-base hover:bg-[#0b7a6e] transition-colors disabled:opacity-30"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full py-3.5 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-white font-semibold text-base hover:bg-[#222] transition-colors"
          >
            {index + 1 >= questions.length ? 'See results →' : 'Next question →'}
          </button>
        )}
      </div>
    </div>
  )
}
