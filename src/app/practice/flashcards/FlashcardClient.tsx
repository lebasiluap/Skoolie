'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Question } from '@/types'

interface Props {
  questions: Question[]
  userId: string
}

export default function FlashcardClient({ questions, userId }: Props) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(0)
  const [unknown, setUnknown] = useState(0)
  const [done, setDone] = useState(false)
  const [animating, setAnimating] = useState(false)

  const question = questions[index]
  const progress = (index / questions.length) * 100

  const answerLetter = question?.correct_answer
  const answerOption = (question?.options as string[])?.find(
    o => o.startsWith(answerLetter + '.') || o.startsWith(answerLetter + ' ')
  )
  const answerText = answerOption
    ? answerOption.replace(/^[A-D][\.\s]\s*/, '')
    : question?.explanation

  async function handleResult(gotIt: boolean) {
    const newKnown = gotIt ? known + 1 : known
    const newUnknown = gotIt ? unknown : unknown + 1
    setKnown(newKnown)
    setUnknown(newUnknown)

    if (index + 1 >= questions.length) {
      const supabase = createClient()
      const xpEarned = newKnown * 5
      await Promise.all([
        xpEarned > 0
          ? supabase.rpc('increment_xp', { user_id: userId, amount: xpEarned }).catch(() => {})
          : Promise.resolve(),
        supabase.rpc('update_streak', { user_id: userId }).catch(() => {}),
      ])
      setDone(true)
      return
    }

    // Flip back then advance
    setAnimating(true)
    setFlipped(false)
    setTimeout(() => {
      setIndex(i => i + 1)
      setAnimating(false)
    }, 400)
  }

  if (done) {
    const accuracy = Math.round((known / questions.length) * 100)
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 rounded-full bg-[#f0fdfb] flex items-center justify-center mb-6">
          <span className="text-5xl">🎉</span>
        </div>
        <h1 className="text-3xl font-bold text-[#101010] mb-1">Deck complete!</h1>
        <p className="text-gray-400 text-sm mb-10">Here&apos;s how you did</p>

        <div className="w-full max-w-xs grid grid-cols-3 gap-3 mb-6">
          <div className="bg-green-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{known}</p>
            <p className="text-xs text-gray-400 mt-1">Got it</p>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{unknown}</p>
            <p className="text-xs text-gray-400 mt-1">Missed</p>
          </div>
          <div className="bg-[#f0fdfb] rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#0D9488]">+{known * 5}</p>
            <p className="text-xs text-gray-400 mt-1">XP</p>
          </div>
        </div>

        <p className="text-5xl font-bold text-[#0D9488] mb-1">{accuracy}%</p>
        <p className="text-gray-400 text-sm mb-10">accuracy</p>

        <div className="w-full max-w-xs flex flex-col gap-3">
          <button
            onClick={() => { setIndex(0); setFlipped(false); setKnown(0); setUnknown(0); setDone(false) }}
            className="w-full py-3.5 rounded-full bg-[#0D9488] text-white font-semibold hover:bg-[#0b7a6e] transition-colors"
          >
            Study again
          </button>
          <Link
            href="/dashboard"
            className="w-full py-3.5 rounded-full border border-gray-200 text-[#101010] font-semibold text-center hover:bg-gray-50 transition-colors"
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
        <Link href="/dashboard" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg">
          ←
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-[#101010] font-semibold text-sm">{index + 1} / {questions.length}</span>
          <span className="text-gray-400 text-xs">{question.topic}</span>
        </div>
        <div className="flex gap-2 items-center">
          {question.high_yield && <span className="text-yellow-500 text-sm">⭐</span>}
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            question.difficulty === 'easy' ? 'bg-green-50 text-green-600' :
            question.difficulty === 'medium' ? 'bg-orange-50 text-orange-500' :
            'bg-red-50 text-red-500'
          }`}>
            {question.difficulty}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100">
        <div
          className="h-full bg-[#0D9488] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Score pills */}
      <div className="flex justify-center gap-4 py-4">
        <span className="text-xs font-semibold text-red-500 bg-red-50 px-3 py-1 rounded-full">✗ {unknown} missed</span>
        <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">✓ {known} got it</span>
      </div>

      {/* 3D Flip Card */}
      <div className="flex-1 px-5 flex flex-col justify-center">
        <div
          style={{ perspective: '1200px' }}
          className="w-full"
          onClick={() => !animating && setFlipped(f => !f)}
        >
          <div
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              position: 'relative',
              height: '340px',
              cursor: 'pointer',
            }}
          >
            {/* Front */}
            <div
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              className="absolute inset-0 bg-white rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl"
            >
              <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-6">Question</p>
              <p className="text-[#101010] text-lg leading-relaxed font-medium text-center">
                {question.question_text}
              </p>
              <div className="mt-8 flex items-center gap-2 text-gray-300">
                <span className="text-sm">↕</span>
                <p className="text-xs">Tap to reveal answer</p>
              </div>
            </div>

            {/* Back */}
            <div
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
              className="absolute inset-0 bg-[#0D9488] rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl"
            >
              <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-6">Answer</p>
              <p className="text-white text-lg leading-relaxed font-bold text-center mb-4">
                {answerText}
              </p>
              <div className="w-12 h-px bg-white/20 mb-4" />
              <p className="text-white/70 text-sm text-center leading-relaxed">
                {question.explanation}
              </p>
            </div>
          </div>
        </div>

        {/* Hint when not flipped */}
        {!flipped && (
          <p className="text-center text-xs text-gray-300 mt-4">tap card to flip</p>
        )}

        {/* Action buttons — appear after flip */}
        <div
          className={`mt-6 transition-all duration-300 ${
            flipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <p className="text-center text-xs text-gray-400 mb-4">How did you do?</p>
          <div className="flex gap-4">
            <button
              onClick={() => handleResult(false)}
              className="flex-1 py-4 rounded-2xl border-2 border-red-400/40 text-red-400 font-semibold text-base hover:bg-red-400/10 transition-colors"
            >
              ✗ Didn&apos;t know
            </button>
            <button
              onClick={() => handleResult(true)}
              className="flex-1 py-4 rounded-2xl bg-white text-[#101010] font-semibold text-base hover:bg-white/90 transition-colors"
            >
              ✓ Got it!
            </button>
          </div>
        </div>
      </div>

      <div className="h-10" />
    </div>
  )
}
