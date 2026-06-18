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
  backUrl?: string
  newSetUrl?: string
}

export default function FlashcardClient({
  questions, userId, bookmarkedIds, showTags,
  backUrl = '/practice/flashcards', newSetUrl,
}: Props) {
  const [workingSet, setWorkingSet] = useState<Question[]>(questions)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(0)
  const [unknown, setUnknown] = useState(0)
  const [missedIds, setMissedIds] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [reviewingMissed, setReviewingMissed] = useState(false)

  const question = workingSet[index]
  const progress = (index / workingSet.length) * 100

  const opts = question?.options as string[]
  const isFlashcard = !opts || opts.length === 0
  const answerText = isFlashcard
    ? (question?.correct_answer || question?.explanation)
    : (opts.find(o => o.startsWith(question?.correct_answer + '.') || o.startsWith(question?.correct_answer + ' '))
        ?.replace(/^[A-D][\.\s]\s*/, '') ?? question?.explanation)

  // Dynamic card height so long answers don't overflow
  const answerLen = answerText?.length ?? 0
  const cardMinHeight = answerLen > 200 ? Math.min(600, 300 + Math.ceil((answerLen - 200) / 4)) : 300
  const answerFontSize = answerLen > 300 ? 13 : answerLen > 150 ? 15 : 19

  async function handleResult(gotIt: boolean) {
    const newMissedIds = gotIt ? missedIds : [...missedIds, question.id]
    const newKnown = gotIt ? known + 1 : known
    const newUnknown = gotIt ? unknown : unknown + 1
    setKnown(newKnown)
    setUnknown(newUnknown)
    setMissedIds(newMissedIds)

    if (index + 1 >= workingSet.length) {
      if (!reviewingMissed) {
        const supabase = createClient()
        const xpEarned = newKnown * 5
        const now = new Date().toISOString()
        await Promise.allSettled([
          supabase.rpc('update_streak', { user_id: userId }),
          xpEarned > 0 ? supabase.rpc('increment_xp', { user_id: userId, amount: xpEarned }) : Promise.resolve(),
          supabase.from('user_question_history').upsert(
            workingSet.map(q => ({
              user_id: userId, question_id: q.id, question_type: 'flashcard',
              topic: q.topic, category: (q as unknown as Record<string, unknown>).category as string ?? null,
              subtopic: q.subtopic ?? null, difficulty: q.difficulty, answered_at: now, was_correct: null,
            })),
            { onConflict: 'user_id,question_id' }
          ),
        ])
      }
      setDone(true)
      return
    }

    setAnimating(true)
    setFlipped(false)
    setTimeout(() => { setIndex(i => i + 1); setAnimating(false) }, 400)
  }

  function handleReviewMissed() {
    setWorkingSet(questions.filter(q => missedIds.includes(q.id)))
    setIndex(0); setFlipped(false); setKnown(0); setUnknown(0)
    setMissedIds([]); setDone(false); setReviewingMissed(true)
  }

  function handleStudyAgain() {
    setWorkingSet(questions)
    setIndex(0); setFlipped(false); setKnown(0); setUnknown(0)
    setMissedIds([]); setDone(false); setReviewingMissed(false)
  }

  // ── Done screen ───────────────────────────────────────────────────────────
  if (done) {
    const accuracy = Math.round((known / workingSet.length) * 100)
    const missedCount = missedIds.length

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div className="anim-pop" style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--coral-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px auto 18px' }}>
            <span style={{ fontSize: 44 }}>{accuracy >= 80 ? '🏆' : '🎉'}</span>
          </div>
          <h1 style={{ margin: '0 0 5px', fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {reviewingMissed ? 'Review complete!' : 'Deck complete!'}
          </h1>
          <p style={{ margin: '0 0 26px', fontSize: 15, color: 'var(--text-soft)', fontWeight: 600 }}>Keep that momentum going</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, maxWidth: 380, margin: '0 auto 26px' }}>
            <div style={{ background: 'var(--green-tint)', borderRadius: 18, padding: '18px 8px' }}>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--green)' }}>{known}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>Got it</p>
            </div>
            <div style={{ background: 'var(--red-tint)', borderRadius: 18, padding: '18px 8px' }}>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--red)' }}>{missedCount}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>Missed</p>
            </div>
            <div style={{ background: 'var(--teal-tint)', borderRadius: 18, padding: '18px 8px' }}>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--teal)' }}>+{known * 5}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>XP</p>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 40, fontWeight: 900, color: 'var(--teal)', letterSpacing: '-0.02em' }}>{accuracy}%</p>
          <p style={{ margin: '2px 0 24px', fontSize: 14, color: 'var(--text-faint)', fontWeight: 600 }}>accuracy</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, maxWidth: 340, margin: '0 auto' }}>
            {missedCount > 0 && !reviewingMissed && (
              <button onClick={handleReviewMissed} className="fc-btn-hover"
                style={{ padding: 15, borderRadius: 999, background: 'var(--red-tint)', color: 'var(--red)', border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}>
                Review missed cards ({missedCount})
              </button>
            )}
            <button onClick={() => { const u = newSetUrl ?? backUrl; window.location.href = u + (u.includes('?') ? '&' : '?') + `t=${Date.now()}` }}
              className="fc-btn-hover"
              style={{ padding: 15, borderRadius: 999, background: 'var(--coral)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}>
              New deck →
            </button>
            <button onClick={handleStudyAgain} className="fc-btn-hover"
              style={{ padding: 15, borderRadius: 999, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-strong)', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}>
              Study full deck again
            </button>
            <Link href="/dashboard" style={{ padding: 8, fontSize: 13.5, fontWeight: 700, color: 'var(--text-faint)', textDecoration: 'none', textAlign: 'center' }}>
              Dashboard
            </Link>
          </div>
        </div>
        <style>{`.fc-btn-hover{transition:transform .18s ease,filter .18s ease}.fc-btn-hover:hover{transform:translateY(-2px);filter:brightness(1.06)}`}</style>
      </div>
    )
  }

  // ── Flashcard screen ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '16px 20px 0', maxWidth: 560, margin: '0 auto', width: '100%' }}>
        <Link href={backUrl} style={{ width: 42, height: 42, borderRadius: 13, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
        </Link>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-soft)' }}>{index + 1} / {workingSet.length}</span>
          {reviewingMissed && <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 800, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Review mode</p>}
        </div>
        <BookmarkButton questionId={question.id} userId={userId} initialBookmarked={bookmarkedIds.includes(question.id)} />
      </div>

      {/* Progress bar */}
      <div style={{ maxWidth: 560, margin: '16px auto 0', padding: '0 20px', width: '100%' }}>
        <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden' }}>
          <div className="progress-bar" style={{ height: '100%', borderRadius: 999, background: reviewingMissed ? 'linear-gradient(90deg,var(--red),var(--coral))' : 'linear-gradient(90deg,var(--coral),var(--coral-deep))', width: `${progress}%` }} />
        </div>
      </div>

      {/* Score pills */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 11, padding: '16px 20px 0' }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--red)', background: 'var(--red-tint)', padding: '6px 13px', borderRadius: 999 }}>✗ {unknown} missed</span>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--green)', background: 'var(--green-tint)', padding: '6px 13px', borderRadius: 999 }}>✓ {known} got it</span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 120px', maxWidth: 560, margin: '0 auto', width: '100%' }}>

        {/* 3D Flip Card */}
        <div style={{ perspective: '1400px', cursor: 'pointer', marginBottom: 20 }}
          onClick={() => !animating && setFlipped(f => !f)}>
          <div style={{
            transformStyle: 'preserve-3d',
            transition: 'transform .6s cubic-bezier(.4,0,.2,1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            position: 'relative', minHeight: cardMinHeight,
          }}>
            {/* Front */}
            <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, boxShadow: 'var(--shadow-lg)', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <p style={{ margin: '0 0 18px', fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.12em' }}>Question</p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.5, color: 'var(--text)' }}>{question.question_text}</p>
              <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-faint)', fontSize: 13, fontWeight: 600 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M5 10l7-7 7 7"/></svg>
                Tap to reveal
              </div>
            </div>

            {/* Back */}
            <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: reviewingMissed ? 'var(--red)' : 'var(--teal)', borderRadius: 24, boxShadow: 'var(--shadow-lg)', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: answerLen > 150 ? 'flex-start' : 'center', textAlign: 'center', overflowY: 'auto' }}>
              <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.12em', flexShrink: 0 }}>Answer</p>
              <p style={{ margin: 0, fontSize: answerFontSize, fontWeight: 800, lineHeight: 1.5, color: '#fff' }}>{answerText}</p>
            </div>
          </div>
        </div>

        {!flipped && (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>Tap the card to flip it</p>
        )}

        {/* Explanation when flipped */}
        {flipped && (
          <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', marginBottom: 18 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <img src="/avatar.png" alt="Tutor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, borderTopLeftRadius: 5, boxShadow: 'var(--shadow)', padding: 16 }}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-soft)' }}>{question.explanation}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons (after flip) */}
      {flipped && (
        <div className="fc-action-bar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '12px 20px 20px' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, margin: '0 0 10px' }}>How did you do?</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => handleResult(false)}
                style={{ flex: 1, padding: 15, borderRadius: 16, background: 'var(--red-tint)', color: 'var(--red)', border: '1.5px solid transparent', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                ✗ Didn&apos;t know
              </button>
              <button onClick={() => handleResult(true)}
                style={{ flex: 1, padding: 15, borderRadius: 16, background: reviewingMissed ? 'var(--red)' : 'var(--green)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                ✓ Got it
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 979px)  { .fc-action-bar { bottom: 68px !important; } }
        @media (min-width: 980px)  { .fc-action-bar { left: 250px !important; } }
      `}</style>
    </div>
  )
}
