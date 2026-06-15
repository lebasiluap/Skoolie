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

function HistoryTable({ data }: { data: Record<string, string> }) {
  return (
    <div className="flex flex-col gap-1.5">
      {Object.entries(data).map(([key, val]) => (
        <div key={key} className="flex gap-2 text-sm">
          <span className="text-gray-400 capitalize min-w-[120px] shrink-0">
            {key.replace(/_/g, ' ')}
          </span>
          <span className="text-[#101010] leading-snug">{val}</span>
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
  const [answered, setAnswered] = useState<Record<number, string>>({}) // qIndex → chosen letter
  const [score, setScore] = useState(0)
  const [totalDone, setTotalDone] = useState(0)

  const cs = cases[caseIndex]

  const OPTION_LETTERS = ['A', 'B', 'C', 'D']

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
    // Case complete
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
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-4xl mb-4">🔍</p>
          <p className="font-semibold text-[#101010]">No cases found</p>
          <Link href="/practice/cases" className="mt-4 inline-block text-[#0D9488] text-sm">← Back</Link>
        </div>
      </div>
    )
  }

  // ── Done screen ────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const accuracy = Math.round((score / totalDone) * 100) || 0
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 rounded-full bg-[#f0fdfb] flex items-center justify-center mb-6">
          <span className="text-5xl">🎉</span>
        </div>
        <h1 className="text-2xl font-bold text-[#101010] mb-1">Case complete!</h1>
        <p className="text-gray-400 text-sm mb-8">Here&apos;s how you did</p>

        <div className="w-full max-w-xs grid grid-cols-3 gap-3 mb-8">
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#0D9488]">{score}/{totalDone}</p>
            <p className="text-xs text-gray-400 mt-1">Correct</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{accuracy}%</p>
            <p className="text-xs text-gray-400 mt-1">Accuracy</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">+{score * 10}</p>
            <p className="text-xs text-gray-400 mt-1">XP earned</p>
          </div>
        </div>

        <div className="w-full max-w-xs flex flex-col gap-3">
          {caseIndex + 1 < cases.length && (
            <button
              onClick={handleNextCase}
              className="w-full py-3 rounded-full bg-[#0D9488] text-white font-semibold hover:bg-[#0b7a6e] transition-colors"
            >
              Next case →
            </button>
          )}
          <Link
            href="/practice/cases"
            className="w-full py-3 rounded-full border border-gray-200 text-[#101010] font-semibold text-center hover:bg-gray-50 transition-colors"
          >
            ← All cases
          </Link>
          <Link
            href="/dashboard"
            className="w-full py-3 rounded-full border border-gray-200 text-[#101010] font-semibold text-center hover:bg-gray-50 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // ── Vignette screen ────────────────────────────────────────────────────────
  if (phase === 'vignette') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <Link href="/practice/cases" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            ←
          </Link>
          <div className="text-center">
            <p className="text-xs font-semibold text-[#101010]">Case {caseIndex + 1} of {cases.length}</p>
            {showTags && <p className="text-xs text-gray-400">{cs.topic}</p>}
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
            cs.difficulty === 'easy' ? 'bg-green-50 text-green-600' :
            cs.difficulty === 'medium' ? 'bg-orange-50 text-orange-500' :
            'bg-red-50 text-red-500'
          }`}>
            {cs.difficulty}
          </div>
        </div>

        <div className="flex-1 px-5 py-5 flex flex-col gap-4 pb-32 overflow-y-auto">
          {/* Tags */}
          <div className="flex gap-2 flex-wrap items-center">
            {showTags
              ? <span className="text-xs bg-[#f0fdfb] text-[#0D9488] px-3 py-1 rounded-full font-semibold">{cs.subtopic}</span>
              : <span className="text-xs text-gray-400 italic">Enable tags in Settings to see topic</span>
            }
            <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-semibold">{STYLE_LABEL[cs.style]}</span>
            {cs.high_yield && (
              <span className="text-xs bg-yellow-50 text-yellow-600 px-3 py-1 rounded-full font-semibold">⭐ High Yield</span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-[#101010] leading-snug">{cs.title}</h2>

          {/* Clinical vignette */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Clinical Vignette</p>
            <p className="text-sm text-[#101010] leading-relaxed">{cs.clinical_vignette}</p>
          </div>

          {/* Patient history */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Patient History</p>
            <HistoryTable data={cs.patient_history} />
          </div>

          {/* Examination */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Examination Findings</p>
            <HistoryTable data={cs.examination_findings} />
          </div>

          {/* Investigations */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Investigations</p>
            <HistoryTable data={cs.investigations} />
          </div>

          <p className="text-xs text-gray-400 text-center">
            {cs.questions.length} question{cs.questions.length !== 1 ? 's' : ''} follow
          </p>
        </div>

        {/* CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5">
          <button
            onClick={() => setPhase('questions')}
            className="w-full py-3.5 rounded-full bg-[#0D9488] text-white font-semibold text-base hover:bg-[#0b7a6e] transition-colors"
          >
            Start questions →
          </button>
        </div>
      </div>
    )
  }

  // ── Questions screen ───────────────────────────────────────────────────────
  const progress = ((qIndex + (isReviewing ? 1 : 0)) / cs.questions.length) * 100

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-gray-100">
        <button
          onClick={() => setPhase('vignette')}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
        >
          ←
        </button>
        <span className="text-sm font-semibold text-gray-500">
          Q{qIndex + 1} / {cs.questions.length}
        </span>
        <div />
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100">
        <div
          className="h-full bg-[#0D9488] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 px-5 py-5 flex flex-col gap-4 pb-32 overflow-y-auto">
        {/* Question */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Question {currentQ.question_number}
          </p>
          <p className="text-[#101010] text-base leading-relaxed font-medium">
            {currentQ.question}
          </p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {currentQ.options.map((option, i) => {
            const letter = OPTION_LETTERS[i]
            const isSelected = selected === letter
            const isAnswer = letter === currentQ.correct_answer
            const isChosen = answered[qIndex] === letter

            let style = 'border-gray-200 bg-white'
            if (isReviewing) {
              if (isAnswer) style = 'border-[#0D9488] bg-[#f0fdfb]'
              else if (isChosen && !isAnswer) style = 'border-red-300 bg-red-50'
              else style = 'border-gray-100 bg-gray-50 opacity-60'
            } else if (isSelected) {
              style = 'border-[#0D9488] bg-[#f0fdfb]'
            } else {
              style = 'border-gray-200 bg-white hover:border-gray-300'
            }

            return (
              <button
                key={letter}
                onClick={() => !isReviewing && setSelected(letter)}
                disabled={isReviewing}
                className={`w-full text-left px-4 py-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${style}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  isReviewing && isAnswer ? 'bg-[#0D9488] text-white' :
                  isReviewing && isChosen && !isAnswer ? 'bg-red-400 text-white' :
                  isSelected ? 'bg-[#0D9488] text-white' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {isReviewing && isAnswer ? '✓' :
                   isReviewing && isChosen && !isAnswer ? '✗' :
                   letter}
                </div>
                <span className={`text-sm leading-snug ${
                  isReviewing && isAnswer ? 'text-[#0D9488] font-semibold' :
                  isReviewing && isChosen && !isAnswer ? 'text-red-500 font-semibold' :
                  'text-[#101010]'
                }`}>
                  {option.replace(/^[A-D]\.\s*/, '')}
                </span>
              </button>
            )
          })}
        </div>

        {/* Explanation (after answer) */}
        {isReviewing && (
          <div className="flex flex-col gap-3">
            <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold w-fit ${
              answered[qIndex] === currentQ.correct_answer
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-600'
            }`}>
              {answered[qIndex] === currentQ.correct_answer ? '✓ Correct! +10 XP' : '✗ Incorrect · +0 XP'}
            </div>

            <div className="flex items-start gap-3">
              <img
                src="/avatar.png"
                alt="Tutor"
                className="w-11 h-11 rounded-full shrink-0 object-cover mt-1 shadow-sm"
              />
              <div className="relative bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-gray-100 flex-1">
                <div
                  className="absolute -left-2 top-3 w-0 h-0"
                  style={{
                    borderTop: '7px solid transparent',
                    borderBottom: '7px solid transparent',
                    borderRight: '8px solid white',
                  }}
                />
                <p className="text-sm text-gray-700 leading-relaxed">{currentQ.explanation}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5">
        {!isReviewing ? (
          <button
            onClick={handleAnswer}
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
            {qIndex + 1 >= cs.questions.length ? 'Finish case →' : 'Next question →'}
          </button>
        )}
      </div>
    </div>
  )
}
