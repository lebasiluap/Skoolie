'use client'

import { useState } from 'react'
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
  backUrl?: string
  newSetUrl?: string
}

type Phase = 'question' | 'review'
type SessionPhase = 'quiz' | 'done' | 'review-wrong'

interface ShuffledQuestion extends Question {
  displayOptions: string[]
  displayCorrect: string
  origLetters: string[]
}

function shuffleQuestions(questions: Question[]): ShuffledQuestion[] {
  return questions.map(q => {
    const opts = (q.options as string[]) ?? []
    if (opts.length === 0) return { ...q, displayOptions: opts, displayCorrect: q.correct_answer, origLetters: [] }
    const items = opts.map((text, i) => ({ text, origLetter: OPTION_LETTERS[i] }))
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[items[i], items[j]] = [items[j], items[i]]
    }
    const newCorrectIdx = items.findIndex(it => it.origLetter === q.correct_answer)
    return {
      ...q,
      displayOptions: items.map((it, i) => it.text.replace(/^[A-D]\.\s*/, `${OPTION_LETTERS[i]}. `)),
      displayCorrect: OPTION_LETTERS[newCorrectIdx],
      origLetters: items.map(it => it.origLetter),
    }
  })
}

export default function MCQClient({
  questions, userId, bookmarkedIds, showTags,
  backUrl = '/practice/mcq', newSetUrl,
}: Props) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('question')
  const [score, setScore] = useState(0)
  const [totalXP, setTotalXP] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('quiz')
  const [shuffledQs, setShuffledQs] = useState<ShuffledQuestion[]>(() => shuffleQuestions(questions))

  const shuffledQ = shuffledQs[index]
  const question = shuffledQ
  const progress = ((index + (phase === 'review' ? 1 : 0)) / shuffledQs.length) * 100
  const isCorrect = selected === shuffledQ?.displayCorrect
  const distractors = question?.distractor_explanations as Record<string, string> | undefined
  const selectedOrigLetter = selected ? shuffledQ?.origLetters[OPTION_LETTERS.indexOf(selected)] : null

  function handleSelect(letter: string) {
    if (phase === 'review') return
    setSelected(letter)
  }

  async function handleSubmit() {
    if (!selected) return
    const correct = selected === shuffledQ.displayCorrect
    const xpEarned = correct ? XP_PER_CORRECT : XP_PER_WRONG
    setScore(s => s + (correct ? 1 : 0))
    setTotalXP(x => x + xpEarned)
    setAnswers(prev => ({ ...prev, [question.id]: selected }))
    setPhase('review')
    const supabase = createClient()
    await Promise.allSettled([
      supabase.rpc('increment_xp', { user_id: userId, amount: xpEarned }),
      supabase.rpc('update_streak', { user_id: userId }),
    ])
  }

  async function handleNext() {
    if (index + 1 >= shuffledQs.length) {
      const supabase = createClient()
      const now = new Date().toISOString()
      const finalAnswers = { ...answers, [question.id]: selected! }
      const finalScore = score + (isCorrect ? 0 : 0) // score already updated
      await Promise.allSettled([
        supabase.from('quiz_sessions').insert({
          user_id: userId,
          question_ids: shuffledQs.map(sq => sq.id),
          answers: finalAnswers,
          score: finalScore,
          xp_earned: totalXP,
          completed_at: now,
        }),
        supabase.from('user_question_history').upsert(
          shuffledQs.map(sq => ({
            user_id: userId, question_id: sq.id, question_type: 'mcq',
            topic: sq.topic, category: (sq as unknown as Record<string, unknown>).category as string ?? null,
            subtopic: sq.subtopic ?? null, difficulty: sq.difficulty, answered_at: now,
            was_correct: finalAnswers[sq.id] === sq.displayCorrect,
          })),
          { onConflict: 'user_id,question_id' }
        ),
      ])
      setSessionPhase('done')
      return
    }
    setIndex(i => i + 1)
    setSelected(null)
    setPhase('question')
  }

  function handleRetake() {
    setShuffledQs(shuffleQuestions(questions))
    setIndex(0); setSelected(null); setPhase('question')
    setScore(0); setTotalXP(0); setAnswers({}); setSessionPhase('quiz')
  }

  // ── Results screen ────────────────────────────────────────────────────────
  if (sessionPhase === 'done') {
    const accuracy = Math.round((score / questions.length) * 100)
    const wrongCount = questions.length - score
    const emoji = accuracy >= 80 ? '🏆' : accuracy >= 60 ? '🎉' : '📖'

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div className="anim-pop" style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px auto 18px' }}>
            <span style={{ fontSize: 44 }}>{emoji}</span>
          </div>
          <h1 style={{ margin: '0 0 5px', fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Session complete!</h1>
          <p style={{ margin: '0 0 26px', fontSize: 15, color: 'var(--text-soft)', fontWeight: 600 }}>Strong work — here&apos;s how you did</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, maxWidth: 380, margin: '0 auto 26px' }}>
            {[
              { val: `${score}/${questions.length}`, label: 'Correct', color: 'var(--teal)' },
              { val: `${accuracy}%`,                 label: 'Accuracy', color: 'var(--green)' },
              { val: `+${totalXP}`,                  label: 'XP earned', color: 'var(--coral)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '18px 8px' }}>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: s.color }}>{s.val}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, maxWidth: 340, margin: '0 auto' }}>
            <button onClick={() => { const u = newSetUrl ?? backUrl; window.location.href = u + (u.includes('?') ? '&' : '?') + `t=${Date.now()}` }}
              className="mcq-btn-primary" style={{ padding: 15, borderRadius: 999, background: 'var(--teal)', color: 'var(--on-teal)', border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}>
              New questions →
            </button>
            {wrongCount > 0 && (
              <button onClick={() => setSessionPhase('review-wrong')}
                className="mcq-btn-hover" style={{ padding: 15, borderRadius: 999, background: 'var(--red-tint)', color: 'var(--red)', border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}>
                Review wrong answers ({wrongCount})
              </button>
            )}
            <button onClick={handleRetake}
              className="mcq-btn-hover" style={{ padding: 15, borderRadius: 999, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-strong)', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}>
              Retake this quiz
            </button>
            <Link href={backUrl}
              style={{ padding: 15, borderRadius: 999, background: 'var(--surface)', color: 'var(--text-soft)', border: '1px solid var(--border-strong)', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'block', textDecoration: 'none', textAlign: 'center' }}>
              ← Choose topic
            </Link>
            <Link href="/dashboard" style={{ padding: 8, fontSize: 13.5, fontWeight: 700, color: 'var(--text-faint)', textDecoration: 'none', textAlign: 'center' }}>
              Dashboard
            </Link>
          </div>
        </div>
        <style>{`.mcq-btn-primary:hover{transform:translateY(-2px);filter:brightness(1.06)} .mcq-btn-hover:hover{transform:translateY(-2px)} .mcq-btn-primary,.mcq-btn-hover{transition:transform .18s ease,filter .18s ease}`}</style>
      </div>
    )
  }

  // ── Review wrong screen ───────────────────────────────────────────────────
  if (sessionPhase === 'review-wrong') {
    const wrongPairs = shuffledQs
      .map(sq => ({ sq, selectedLetter: answers[sq.id] }))
      .filter(({ sq, selectedLetter }) => selectedLetter !== sq.displayCorrect)

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ background: 'var(--surface)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setSessionPhase('done')}
            style={{ width: 42, height: 42, borderRadius: 13, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Review wrong answers</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>{wrongPairs.length} question{wrongPairs.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 20px 80px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {wrongPairs.map(({ sq, selectedLetter }, i) => {
            const distractorMap = sq.distractor_explanations as Record<string, string> | undefined
            const selOrigLetter = selectedLetter ? sq.origLetters[OPTION_LETTERS.indexOf(selectedLetter)] : null
            return (
              <div key={sq.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Q{i + 1}</span>
                  <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.55 }}>{sq.question_text}</p>
                </div>
                <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {sq.displayOptions.map((opt, oi) => {
                    const letter = OPTION_LETTERS[oi]
                    const isAns = letter === sq.displayCorrect
                    const isSel = letter === selectedLetter
                    return (
                      <div key={letter} style={{
                        display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderRadius: 14,
                        border: `2px solid ${isAns ? 'var(--teal)' : isSel ? 'var(--red)' : 'var(--border)'}`,
                        background: isAns ? 'var(--teal-tint)' : isSel ? 'var(--red-tint)' : 'var(--surface-2)',
                        opacity: (!isAns && !isSel) ? 0.6 : 1,
                      }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: isAns ? 'var(--teal)' : isSel ? 'var(--red)' : 'var(--surface-3)', color: (isAns || isSel) ? '#fff' : 'var(--text-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                          {isAns ? '✓' : isSel ? '✗' : letter}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: isAns ? 700 : 600, color: isAns ? 'var(--teal-deep)' : isSel ? 'var(--red)' : 'var(--text)' }}>{opt.replace(/^[A-D]\.\s*/, '')}</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ padding: '0 20px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <img src="/avatar.png" alt="Tutor" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', boxShadow: 'var(--shadow)' }} />
                    <div style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, borderTopLeftRadius: 5, padding: 15 }}>
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-soft)' }}>{sq.explanation}</p>
                      {distractorMap && selOrigLetter && distractorMap[selOrigLetter] && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Why your answer was wrong</p>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-soft)' }}>{distractorMap[selOrigLetter]}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <button onClick={() => { const u = newSetUrl ?? backUrl; window.location.href = u + (u.includes('?') ? '&' : '?') + `t=${Date.now()}` }}
              style={{ padding: 15, borderRadius: 999, background: 'var(--teal)', color: 'var(--on-teal)', border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              New questions →
            </button>
            <button onClick={handleRetake}
              style={{ padding: 15, borderRadius: 999, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-strong)', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Retake this quiz
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Quiz screen ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '16px 20px 0', maxWidth: 680, margin: '0 auto' }}>
        <Link href={backUrl} style={{ width: 42, height: 42, borderRadius: 13, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
        </Link>
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-soft)' }}>{index + 1} / {shuffledQs.length}</span>
        <BookmarkButton questionId={question.id} userId={userId} initialBookmarked={bookmarkedIds.includes(question.id)} />
      </div>

      {/* Progress bar */}
      <div style={{ maxWidth: 680, margin: '16px auto 0', padding: '0 20px' }}>
        <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden' }}>
          <div className="progress-bar" style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,var(--teal),var(--teal-deep))', width: `${progress}%` }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 20px 120px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Tag chips */}
        {showTags && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 800, background: 'var(--teal-tint)', color: 'var(--teal)', padding: '6px 12px', borderRadius: 999 }}>{question.topic}</span>
            <span style={{ fontSize: 12, fontWeight: 800,
              background: question.difficulty === 'easy' ? 'var(--green-tint)' : question.difficulty === 'medium' ? 'var(--amber-tint)' : 'var(--red-tint)',
              color: question.difficulty === 'easy' ? 'var(--green)' : question.difficulty === 'medium' ? 'var(--amber)' : 'var(--red)',
              padding: '6px 12px', borderRadius: 999 }}>
              {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
            </span>
            {question.high_yield && (
              <span style={{ fontSize: 12, fontWeight: 800, background: 'var(--coral-tint)', color: 'var(--coral-deep)', padding: '6px 12px', borderRadius: 999 }}>⭐ High yield</span>
            )}
          </div>
        )}

        {/* Question card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', padding: 24 }}>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.5, fontWeight: 700, color: 'var(--text)' }}>{question.question_text}</p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shuffledQ.displayOptions.map((option, i) => {
            const letter = OPTION_LETTERS[i]
            const isSelected = selected === letter
            const isAnswer = letter === shuffledQ.displayCorrect

            let borderColor = 'var(--border)'
            let bgColor = 'var(--surface)'
            let chipBg = 'var(--surface-3)'
            let chipFg = 'var(--text-soft)'
            let textColor = 'var(--text)'

            if (phase === 'question' && isSelected) {
              borderColor = 'var(--teal)'
              bgColor = 'var(--teal-tint)'
              chipBg = 'var(--teal)'
              chipFg = 'var(--on-teal)'
              textColor = 'var(--teal-deep)'
            }

            return (
              <button key={letter} onClick={() => handleSelect(letter)} disabled={phase === 'review'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px',
                  borderRadius: 16, border: `2px solid ${borderColor}`, background: bgColor,
                  cursor: phase === 'review' ? 'default' : 'pointer', textAlign: 'left', width: '100%',
                  transition: 'border-color .15s ease, background .15s ease',
                  opacity: (phase === 'review' && !isAnswer && !isSelected) ? 0.5 : 1,
                  fontFamily: 'inherit',
                }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: chipBg, color: chipFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                  {letter}
                </span>
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: textColor }}>{option.replace(/^[A-D]\.\s*/, '')}</span>
              </button>
            )
          })}
        </div>

        {/* Submit button (sticky bottom) */}
        {phase === 'question' && (
          <div className="mcq-sticky-submit" style={{ position: 'sticky', bottom: 0, background: `linear-gradient(180deg,transparent,var(--bg) 28%)`, padding: '20px 0 22px', marginTop: 8 }}>
            <button onClick={handleSubmit} disabled={!selected}
              style={{
                width: '100%', padding: '16px', borderRadius: 999,
                background: selected ? 'var(--teal)' : 'var(--surface-3)',
                color: selected ? 'var(--on-teal)' : 'var(--text-faint)',
                border: 'none', fontSize: 16, fontWeight: 800, cursor: selected ? 'pointer' : 'default',
                transition: 'background .15s ease, color .15s ease',
                fontFamily: 'inherit',
              }}>
              Submit answer
            </button>
          </div>
        )}
      </div>

      {/* ── Explanation overlay (review phase) ─────────────────────────── */}
      {phase === 'review' && (
        <div className="anim-ovFade" style={{
          position: 'fixed', inset: 0, zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
          background: 'rgba(10,20,18,.30)',
          backdropFilter: 'blur(11px)',
          WebkitBackdropFilter: 'blur(11px)',
        }}>
          <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

            {/* Verdict pill */}
            <div className="anim-ovBtn" style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 999,
              fontSize: 14, fontWeight: 800, marginBottom: 16,
              background: isCorrect ? 'var(--green-tint)' : 'var(--red-tint)',
              color: isCorrect ? 'var(--green)' : 'var(--red)',
            }}>
              {isCorrect ? `✓ Correct · +${XP_PER_CORRECT} XP` : `✗ Not quite · +${XP_PER_WRONG} XP`}
            </div>

            {/* Avatar */}
            <div className="anim-ovAvatar" style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', border: '4px solid var(--surface)', boxShadow: 'var(--shadow-lg)', position: 'relative', zIndex: 2 }}>
              <div className="anim-talk">
                <img src="/avatar.png" alt="Tutor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>

            {/* Speech bubble — red-tinted when wrong */}
            <div className="anim-ovBubble" style={{
              position: 'relative', marginTop: -12, width: '100%',
              background: isCorrect ? 'var(--surface)' : 'var(--red-tint)',
              border: `1px solid ${isCorrect ? 'var(--border)' : 'var(--red)'}`,
              borderRadius: 24, boxShadow: 'var(--shadow-lg)', padding: '30px 24px 24px',
            }}>
              {/* Bubble tail */}
              <div style={{
                position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%) rotate(45deg)',
                width: 18, height: 18,
                background: isCorrect ? 'var(--surface)' : 'var(--red-tint)',
                borderLeft: `1px solid ${isCorrect ? 'var(--border)' : 'var(--red)'}`,
                borderTop: `1px solid ${isCorrect ? 'var(--border)' : 'var(--red)'}`,
                borderRadius: '5px 0 0 0',
              }} />

              <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.65, color: 'var(--text)' }}>{question.explanation}</p>

              {!isCorrect && distractors && selectedOrigLetter && distractors[selectedOrigLetter] && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 800, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Why {selected} was wrong</p>
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.5 }}>{distractors[selectedOrigLetter]}</p>
                </div>
              )}

              {question.source_reference && (
                <p style={{ margin: '14px 0 0', fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 700 }}>📚 {question.source_reference}</p>
              )}
            </div>

            {/* Next button */}
            <button onClick={handleNext} className="anim-ovBtn mcq-next-btn"
              style={{
                marginTop: 18, width: '100%', maxWidth: 340, padding: 16, borderRadius: 999,
                background: 'var(--teal)', color: 'var(--on-teal)', border: 'none',
                fontSize: 16, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 12px 26px -10px var(--teal)',
                fontFamily: 'inherit',
              }}>
              {index + 1 >= shuffledQs.length ? 'See results →' : 'Next question →'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .mcq-next-btn { transition: transform .18s ease, filter .18s ease; }
        .mcq-next-btn:hover { transform: translateY(-2px); filter: brightness(1.06); }
        @media (max-width: 979px) { .mcq-sticky-submit { bottom: 68px; } }
      `}</style>
    </div>
  )
}
