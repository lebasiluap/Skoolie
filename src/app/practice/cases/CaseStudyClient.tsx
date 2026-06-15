'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { CaseStudy } from '@/types'

interface Props {
  cases: CaseStudy[]
  userId: string
  showTags: boolean
}

type Phase = 'vignette' | 'questions' | 'done'

const STYLE_LABEL: Record<string, string> = {
  multi_question: 'Multi-Question',
  osce: 'OSCE',
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

function HistoryTable({ data }: { data: Record<string, string> }) {
  return (
    <div className="flex flex-col gap-2">
      {Object.entries(data).map(([key, val]) => (
        <div key={key} className="flex gap-3 text-sm">
          <span className="text-[#555555] capitalize min-w-[120px] shrink-0">
            {key.replace(/_/g, ' ')}
          </span>
          <span className="text-[#CCCCCC] leading-snug">{val}</span>
        </div>
      ))}
    </div>
  )
}

export default function CaseStudyClient({ cases, userId, showTags }: Props) {
  const [caseIndex, setCaseIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('vignette')
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState<Record<number, string>>({})
  const [score, setScore] = useState(0)
  const [totalDone, setTotalDone] = useState(0)

  const cs = cases[caseIndex]
  const currentQ = cs?.questions[qIndex]
  const isCorrect = selected === currentQ?.correct_answer
  const isReviewing = qIndex in answered

  function handleAnswer() {
    if (!selected || isReviewing) return
    const correct = selected === currentQ.correct_answer
    setAnswered(prev => ({ ...prev, [qIndex]: selected }))
    if (correct) setScore(s => s + 1)
    setTotalDone(t => t + 1)
  }

  async function handleNext() {
    if (qIndex + 1 < cs.questions.length) {
      setQIndex(qi => qi + 1)
      setSelected(null)
      return
    }
    const supabase = createClient()
    const xpEarned = score * 10
    await Promise.allSettled([
      supabase.rpc('update_streak', { user_id: userId }),
      xpEarned > 0
        ? supabase.rpc('increment_xp', { user_id: userId, amount: xpEarned })
        : Promise.resolve(),
    ])
    setPhase('done')
  }

  function handleNextCase() {
    if (caseIndex + 1 < cases.length) {
      setCaseIndex(i => i + 1)
      setPhase('vignette')
      setQIndex(0)
      setSelected(null)
      setAnswered({})
      setScore(0)
    } else {
      setPhase('done')
    }
  }

  if (!cs) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-4xl mb-4">🔍</p>
          <p className="font-semibold text-white">No cases found</p>
          <Link href="/practice/cases" className="mt-4 inline-block text-[#0D9488] text-sm">← Back</Link>
        </div>
      </div>
    )
  }

  // Done screen
  if (phase === 'done') {
    const accuracy = Math.round((score / totalDone) * 100) || 0
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#0D9488]/15 border border-[#0D9488]/30 flex items-center justify-center mb-6">
          <span className="text-4xl">🎉</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Case complete!</h1>
        <p className="text-[#888888] text-sm mb-8">Here&apos;s how you did</p>

        <div className="w-full max-w-xs grid grid-cols-3 gap-3 mb-8">
          <div className="bg-[#141414] rounded-2xl p-4 text-center border border-[#1F1F1F]">
            <p className="text-2xl font-bold text-[#0D9488]">{score}/{totalDone}</p>
            <p className="text-xs text-[#888888] mt-1">Correct</p>
          </div>
          <div className="bg-[#141414] rounded-2xl p-4 text-center border border-[#1F1F1F]">
            <p className="text-2xl font-bold text-[#0D9488]">{accuracy}%</p>
            <p className="text-xs text-[#888888] mt-1">Accuracy</p>
          </div>
          <div className="bg-[#141414] rounded-2xl p-4 text-center border border-[#1F1F1F]">
            <p className="text-2xl font-bold text-orange-400">+{score * 10}</p>
            <p className="text-xs text-[#888888] mt-1">XP earned</p>
          </div>
        </div>

        <div className="w-full max-w-xs flex flex-col gap-3">
          {caseIndex + 1 < cases.length && (
            <button
              onClick={handleNextCase}
              className="w-full py-3 rounded-full bg-[#0D9488] text-black font-semibold hover:bg-[#0b7a6e] transition-colors"
            >
              Next case →
            </button>
          )}
          <Link
            href="/practice/cases"
            className="w-full py-3 rounded-full border border-[#2A2A2A] text-white font-semibold text-center hover:bg-[#141414] transition-colors"
          >
            ← All cases
          </Link>
          <Link
            href="/dashboard"
            className="w-full py-3 rounded-full border border-[#2A2A2A] text-white font-semibold text-center hover:bg-[#141414] transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Vignette screen
  if (phase === 'vignette') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
        {/* Header */}
        <div className="bg-[#0A0A0A] px-5 py-4 flex items-center justify-between border-b border-[#1F1F1F]">
          <Link
            href="/practice/cases"
            className="w-9 h-9 rounded-full bg-[#1F1F1F] flex items-center justify-center text-[#888888] hover:text-white transition-colors"
          >
            ←
          </Link>
          <div className="text-center">
            <p className="text-xs font-semibold text-white">Case {caseIndex + 1} of {cases.length}</p>
            {showTags && <p className="text-xs text-[#888888]">{cs.topic}</p>}
          </div>
          <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            cs.difficulty === 'easy'   ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
            cs.difficulty === 'medium' ? 'bg-orange-400/10 text-orange-400 border border-orange-400/20' :
                                         'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {cs.difficulty}
          </div>
        </div>

        <div className="flex-1 px-5 py-5 flex flex-col gap-4 pb-32 overflow-y-auto">
          {/* Tags */}
          <div className="flex gap-2 flex-wrap items-center">
            {showTags
              ? <span className="text-xs bg-[#1F1F1F] text-[#888888] px-3 py-1 rounded-full font-medium">{cs.subtopic}</span>
              : <span className="text-xs text-[#555555] italic">Enable tags in Settings to see topic</span>
            }
            <span className="text-xs bg-[#1F1F1F] text-[#888888] px-3 py-1 rounded-full font-medium">{STYLE_LABEL[cs.style]}</span>
            {cs.high_yield && (
              <span className="text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-3 py-1 rounded-full font-medium">⭐ High Yield</span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-white leading-snug">{cs.title}</h2>

          {/* Clinical vignette */}
          <div className="bg-[#141414] rounded-2xl p-5 border border-[#1F1F1F]">
            <p className="text-[10px] font-bold text-[#0D9488] uppercase tracking-widest mb-3">Clinical Vignette</p>
            <p className="text-sm text-[#CCCCCC] leading-relaxed">{cs.clinical_vignette}</p>
          </div>

          {/* Patient history */}
          <div className="bg-[#141414] rounded-2xl p-5 border border-[#1F1F1F]">
            <p className="text-[10px] font-bold text-[#0D9488] uppercase tracking-widest mb-3">Patient History</p>
            <HistoryTable data={cs.patient_history} />
          </div>

          {/* Examination */}
          <div className="bg-[#141414] rounded-2xl p-5 border border-[#1F1F1F]">
            <p className="text-[10px] font-bold text-[#0D9488] uppercase tracking-widest mb-3">Examination Findings</p>
            <HistoryTable data={cs.examination_findings} />
          </div>

          {/* Investigations */}
          <div className="bg-[#141414] rounded-2xl p-5 border border-[#1F1F1F]">
            <p className="text-[10px] font-bold text-[#0D9488] uppercase tracking-widest mb-3">Investigations</p>
            <HistoryTable data={cs.investigations} />
          </div>

          <p className="text-xs text-[#555555] text-center">
            {cs.questions.length} question{cs.questions.length !== 1 ? 's' : ''} follow
          </p>
        </div>

        {/* CTA */}
        <div className="fixed bottom-16 left-0 right-0 bg-[#0A0A0A] border-t border-[#1F1F1F] px-5 py-4">
          <button
            onClick={() => setPhase('questions')}
            className="w-full py-3.5 rounded-full bg-[#0D9488] text-black font-semibold text-base hover:bg-[#0b7a6e] transition-colors"
          >
            Start questions →
          </button>
        </div>
      </div>
    )
  }

  // Questions screen
  const progress = ((qIndex + (isReviewing ? 1 : 0)) / cs.questions.length) * 100

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="bg-[#0A0A0A] px-5 py-4 flex items-center justify-between border-b border-[#1F1F1F]">
        <button
          onClick={() => setPhase('vignette')}
          className="w-9 h-9 rounded-full bg-[#1F1F1F] flex items-center justify-center text-[#888888] hover:text-white transition-colors"
        >
          ←
        </button>
        <span className="text-sm font-semibold text-[#888888]">
          Q{qIndex + 1} / {cs.questions.length}
        </span>
        <div className="w-9" />
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#1F1F1F]">
        <div
          className="h-full bg-[#0D9488] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 px-5 py-5 flex flex-col gap-4 pb-32 overflow-y-auto">
        {/* Question */}
        <div className="bg-[#141414] rounded-2xl p-5 border border-[#1F1F1F]">
          <p className="text-[10px] font-bold text-[#0D9488] uppercase tracking-widest mb-3">
            Question {currentQ.question_number}
          </p>
          <p className="text-white text-base leading-relaxed font-medium">
            {currentQ.question}
          </p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2.5">
          {currentQ.options.map((option, i) => {
            const letter = OPTION_LETTERS[i]
            const isSelected = selected === letter
            const isAnswer = letter === currentQ.correct_answer
            const isChosen = answered[qIndex] === letter

            let containerStyle = 'border border-[#1F1F1F] bg-transparent hover:border-[#2A2A2A]'
            if (isReviewing) {
              if (isAnswer) containerStyle = 'border border-[#0D9488] bg-[#0D9488]/[0.07]'
              else if (isChosen && !isAnswer) containerStyle = 'border border-red-500 bg-red-500/[0.07]'
              else containerStyle = 'border border-[#1F1F1F] bg-transparent opacity-50'
            } else if (isSelected) {
              containerStyle = 'border border-[#0D9488] bg-[#0D9488]/[0.07]'
            }

            let badgeStyle = 'bg-[#1F1F1F] text-[#555555]'
            if (isReviewing) {
              if (isAnswer) badgeStyle = 'bg-[#0D9488] text-black'
              else if (isChosen && !isAnswer) badgeStyle = 'bg-red-500 text-white'
            } else if (isSelected) {
              badgeStyle = 'bg-[#0D9488] text-black'
            }

            let textColor = 'text-white'
            if (isReviewing) {
              if (isAnswer) textColor = 'text-[#5EEAD4] font-semibold'
              else if (isChosen && !isAnswer) textColor = 'text-red-400 font-semibold'
              else textColor = 'text-[#555555]'
            }

            return (
              <button
                key={letter}
                onClick={() => !isReviewing && setSelected(letter)}
                disabled={isReviewing}
                className={`w-full text-left px-4 py-3.5 rounded-2xl transition-all flex items-center gap-3.5 ${containerStyle}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${badgeStyle}`}>
                  {isReviewing && isAnswer ? '✓' :
                   isReviewing && isChosen && !isAnswer ? '✗' :
                   letter}
                </div>
                <span className={`text-sm leading-snug ${textColor}`}>
                  {option.replace(/^[A-D]\.\s*/, '')}
                </span>
              </button>
            )
          })}
        </div>

        {/* Explanation (after answer) */}
        {isReviewing && (
          <div className="flex flex-col gap-3">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold w-fit ${
              answered[qIndex] === currentQ.correct_answer
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {answered[qIndex] === currentQ.correct_answer ? '✓ Correct! +10 XP' : '✗ Incorrect · +0 XP'}
            </div>

            <div className="bg-[#141414] rounded-2xl border border-[#1F1F1F] p-4">
              <p className="text-sm text-[#CCCCCC] leading-relaxed">{currentQ.explanation}</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom button */}
      <div className="fixed bottom-16 left-0 right-0 bg-[#0A0A0A] border-t border-[#1F1F1F] px-5 py-4">
        {!isReviewing ? (
          <button
            onClick={handleAnswer}
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
            {qIndex + 1 >= cs.questions.length ? 'Finish case →' : 'Next question →'}
          </button>
        )}
      </div>
    </div>
  )
}
