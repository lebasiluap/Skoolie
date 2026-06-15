'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Question } from '@/types'
import BookmarkButton from '@/components/BookmarkButton'

interface Props {
  questions: Question[]
  userId: string
  bookmarkedIds: string[]
  showTags: boolean
}

export default function FlashcardClient({ questions, userId, bookmarkedIds, showTags }: Props) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(0)
  const [unknown, setUnknown] = useState(0)
  const [done, setDone] = useState(false)
  const [animating, setAnimating] = useState(false)

  const question = questions[index]
  const progress = (index / questions.length) * 100

  const opts = question?.options as string[]
  const isFlashcard = !opts || opts.length === 0
  const answerText = isFlashcard
    ? question?.correct_answer
    : (opts.find(o => o.startsWith(question?.correct_answer + '.') || o.startsWith(question?.correct_answer + ' '))
        ?.replace(/^[A-D][\.\s]\s*/, '') ?? question?.explanation)

  async function handleResult(gotIt: boolean) {
    const newKnown = gotIt ? known + 1 : known
    const newUnknown = gotIt ? unknown : unknown + 1
    setKnown(newKnown)
    setUnknown(newUnknown)

    if (index + 1 >= questions.length) {
      const supabase = createClient()
      const xpEarned = newKnown * 5
      const now = new Date().toISOString()

      await Promise.allSettled([
        supabase.rpc('update_streak', { user_id: userId }),
        xpEarned > 0
          ? supabase.rpc('increment_xp', { user_id: userId, amount: xpEarned })
          : Promise.resolve(),
        supabase.from('user_question_history').upsert(
          questions.map(q => ({
            user_id: userId,
            question_id: q.id,
            question_type: 'flashcard',
            topic: q.topic,
            category: (q as unknown as Record<string, unknown>).category as string ?? null,
            subtopic: q.subtopic ?? null,
            difficulty: q.difficulty,
            answered_at: now,
            was_correct: null,
          })),
          { onConflict: 'user_id,question_id' }
        ),
      ])
      setDone(true)
      return
    }

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
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#0D9488]/15 border border-[#0D9488]/30 flex items-center justify-center mb-6">
          <span className="text-4xl">🎉</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Deck complete!</h1>
        <p className="text-[#888888] text-sm mb-8">Here&apos;s how you did</p>

        <div className="w-full max-w-xs grid grid-cols-3 gap-3 mb-8">
          <div className="bg-green-500/10 rounded-2xl p-4 text-center border border-green-500/20">
            <p className="text-2xl font-bold text-green-400">{known}</p>
            <p className="text-xs text-[#888888] mt-1">Got it</p>
          </div>
          <div className="bg-red-500/10 rounded-2xl p-4 text-center border border-red-500/20">
            <p className="text-2xl font-bold text-red-400">{unknown}</p>
            <p className="text-xs text-[#888888] mt-1">Missed</p>
          </div>
          <div className="bg-[#141414] rounded-2xl p-4 text-center border border-[#1F1F1F]">
            <p className="text-2xl font-bold text-orange-400">+{known * 5}</p>
            <p className="text-xs text-[#888888] mt-1">XP</p>
          </div>
        </div>

        <p className="text-5xl font-bold text-[#0D9488] mb-1">{accuracy}%</p>
        <p className="text-[#888888] text-sm mb-10">accuracy</p>

        <div className="w-full max-w-xs flex flex-col gap-3">
          <button
            onClick={() => { setIndex(0); setFlipped(false); setKnown(0); setUnknown(0); setDone(false) }}
            className="w-full py-3.5 rounded-full bg-[#0D9488] text-black font-semibold hover:bg-[#0b7a6e] transition-colors"
          >
            Study again
          </button>
          <Link
            href="/dashboard"
            className="w-full py-3.5 rounded-full border border-[#2A2A2A] text-white font-semibold text-center hover:bg-[#141414] transition-colors"
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
          href="/practice/flashcards"
          className="w-9 h-9 rounded-full bg-[#1F1F1F] flex items-center justify-center text-[#888888] hover:text-white transition-colors"
        >
          ←
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-white font-semibold text-sm">{index + 1} / {questions.length}</span>
          {showTags && <span className="text-[#888888] text-xs">{question.topic}</span>}
        </div>
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

      {/* Score pills */}
      <div className="flex justify-center gap-4 py-4">
        <span className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">✗ {unknown} missed</span>
        <span className="text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">✓ {known} got it</span>
      </div>

      {/* Flip card */}
      <div className="flex-1 px-5 flex flex-col justify-center pb-24">
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
              height: '300px',
              cursor: 'pointer',
            }}
          >
            {/* Front */}
            <div
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              className="absolute inset-0 bg-[#141414] rounded-3xl p-8 flex flex-col items-center justify-center border border-[#1F1F1F]"
            >
              <p className="text-[10px] font-bold text-[#555555] uppercase tracking-widest mb-6">Question</p>
              <p className="text-white text-base leading-relaxed font-medium text-center">
                {question.question_text}
              </p>
              <div className="mt-8 flex items-center gap-2 text-[#555555]">
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
              className="absolute inset-0 bg-[#0D9488]/10 rounded-3xl p-8 flex flex-col items-center justify-center border border-[#0D9488]/40"
            >
              <p className="text-[10px] font-bold text-[#0D9488]/60 uppercase tracking-widest mb-6">Answer</p>
              <p className="text-[#5EEAD4] text-lg leading-relaxed font-bold text-center">
                {answerText}
              </p>
            </div>
          </div>
        </div>

        {!flipped && (
          <p className="text-center text-xs text-[#555555] mt-4">tap card to flip</p>
        )}

        {/* Explanation + action buttons — appear after flip */}
        <div
          className={`mt-5 transition-all duration-400 ${
            flipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          {/* Explanation card */}
          <div className="bg-[#141414] rounded-2xl border border-[#1F1F1F] p-4 mb-5">
            <p className="text-sm text-[#CCCCCC] leading-relaxed">{question.explanation}</p>
          </div>

          <p className="text-center text-xs text-[#555555] mb-3">How did you do?</p>
          <div className="flex gap-3">
            <button
              onClick={() => handleResult(false)}
              className="flex-1 py-4 rounded-2xl border border-red-500/30 text-red-400 font-semibold text-sm hover:bg-red-500/10 transition-colors"
            >
              ✗ Didn&apos;t know
            </button>
            <button
              onClick={() => handleResult(true)}
              className="flex-1 py-4 rounded-2xl bg-[#0D9488] text-black font-semibold text-sm hover:bg-[#0b7a6e] transition-colors"
            >
              ✓ Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
