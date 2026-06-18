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

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

function shuffleCases(cases: CaseStudy[]): CaseStudy[] {
  return cases.map(cs => ({
    ...cs,
    questions: cs.questions.map(q => {
      const opts = q.options ?? []
      if (opts.length === 0) return q
      const items = opts.map((text, i) => ({ text, origLetter: OPTION_LETTERS[i] }))
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[items[i], items[j]] = [items[j], items[i]]
      }
      const newCorrectIdx = items.findIndex(it => it.origLetter === q.correct_answer)
      return {
        ...q,
        options: items.map((it, i) => it.text.replace(/^[A-D]\.\s*/, `${OPTION_LETTERS[i]}. `)),
        correct_answer: OPTION_LETTERS[newCorrectIdx],
      }
    }),
  }))
}

function InfoCard({ label, data }: { label: string; data: Record<string, string> }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--shadow)', padding: 20 }}>
      <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(data).map(([key, val]) => (
          <div key={key} style={{ display: 'flex', gap: 14 }}>
            <span style={{ fontSize: 13, color: 'var(--text-faint)', fontWeight: 700, textTransform: 'capitalize', flexShrink: 0, minWidth: 120 }}>
              {key.replace(/_/g, ' ')}
            </span>
            <span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600, lineHeight: 1.5 }}>{val}</span>
          </div>
        ))}
      </div>
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
  const [shuffledCases] = useState<CaseStudy[]>(() => shuffleCases(cases))

  const cs = shuffledCases[caseIndex]
  const currentQ = cs?.questions[qIndex]
  const isReviewing = qIndex in answered
  const isCorrect = isReviewing && answered[qIndex] === currentQ?.correct_answer

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
      xpEarned > 0 ? supabase.rpc('increment_xp', { user_id: userId, amount: xpEarned }) : Promise.resolve(),
    ])
    setPhase('done')
  }

  function handleNextCase() {
    if (caseIndex + 1 < cases.length) {
      setCaseIndex(i => i + 1)
      setPhase('vignette')
      setQIndex(0); setSelected(null); setAnswered({}); setScore(0)
    } else {
      setPhase('done')
    }
  }

  if (!cs) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🔍</div>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>No cases found</p>
          <Link href="/practice/cases" style={{ display: 'inline-block', marginTop: 14, color: 'var(--teal)', fontWeight: 700, textDecoration: 'none' }}>← Back</Link>
        </div>
      </div>
    )
  }

  // ── Done screen ────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const accuracy = totalDone > 0 ? Math.round((score / totalDone) * 100) : 0
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div className="anim-pop" style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px auto 18px' }}>
            <span style={{ fontSize: 44 }}>{accuracy >= 80 ? '🏆' : '🎉'}</span>
          </div>
          <h1 style={{ margin: '0 0 5px', fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Case complete!</h1>
          <p style={{ margin: '0 0 26px', fontSize: 15, color: 'var(--text-soft)', fontWeight: 600 }}>Here&apos;s how you did</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, maxWidth: 380, margin: '0 auto 26px' }}>
            {[
              { val: `${score}/${totalDone}`, label: 'Correct',   color: 'var(--teal)' },
              { val: `${accuracy}%`,          label: 'Accuracy',  color: 'var(--green)' },
              { val: `+${score * 10}`,        label: 'XP earned', color: 'var(--coral)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '18px 8px' }}>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: s.color }}>{s.val}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, maxWidth: 340, margin: '0 auto' }}>
            {caseIndex + 1 < cases.length && (
              <button onClick={handleNextCase} className="cs-btn-hover"
                style={{ padding: 15, borderRadius: 999, background: 'var(--teal)', color: 'var(--on-teal)', border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}>
                Next case →
              </button>
            )}
            <Link href="/practice/cases" className="cs-btn-hover"
              style={{ display: 'block', padding: 15, borderRadius: 999, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-strong)', fontSize: 15, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
              ← All cases
            </Link>
            <Link href="/dashboard"
              style={{ padding: 8, fontSize: 13.5, fontWeight: 700, color: 'var(--text-faint)', textDecoration: 'none', textAlign: 'center', display: 'block' }}>
              Dashboard
            </Link>
          </div>
        </div>
        <style>{`.cs-btn-hover { transition: transform .18s ease, filter .18s ease; } .cs-btn-hover:hover { transform: translateY(-2px); filter: brightness(1.06); }`}</style>
      </div>
    )
  }

  // ── Vignette screen ────────────────────────────────────────────────────────
  if (phase === 'vignette') {
    const diffColor = cs.difficulty === 'easy' ? 'var(--green)' : cs.difficulty === 'medium' ? 'var(--amber)' : 'var(--red)'
    const diffBg = cs.difficulty === 'easy' ? 'var(--green-tint)' : cs.difficulty === 'medium' ? 'var(--amber-tint)' : 'var(--red-tint)'

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <Link href="/practice/cases" style={{ width: 42, height: 42, borderRadius: 13, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
          </Link>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-soft)' }}>Case {caseIndex + 1} of {cases.length}</p>
            {showTags && <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{cs.topic}</p>}
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 800, padding: '6px 12px', borderRadius: 999, background: diffBg, color: diffColor, textTransform: 'capitalize' }}>
            {cs.difficulty}
          </span>
        </div>

        <div style={{ flex: 1, padding: '20px 20px 120px', maxWidth: 680, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          {/* Tag chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {showTags
              ? <span style={{ fontSize: 12, fontWeight: 800, background: 'var(--teal-tint)', color: 'var(--teal)', padding: '5px 12px', borderRadius: 999 }}>{cs.subtopic}</span>
              : <span style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>Enable tags in Settings to see topic</span>
            }
            <span style={{ fontSize: 12, fontWeight: 800, background: 'var(--surface-3)', color: 'var(--text-soft)', padding: '5px 12px', borderRadius: 999 }}>
              {cs.style === 'multi_question' ? 'Multi-Question' : 'OSCE'}
            </span>
            {cs.high_yield && (
              <span style={{ fontSize: 12, fontWeight: 800, background: 'var(--amber-tint)', color: 'var(--amber)', padding: '5px 12px', borderRadius: 999 }}>High Yield</span>
            )}
          </div>

          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--text)', lineHeight: 1.35, letterSpacing: '-0.015em' }}>{cs.title}</h2>

          {/* Clinical Vignette */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--shadow)', padding: 20 }}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Clinical Vignette</p>
            <p style={{ margin: 0, fontSize: 14.5, color: 'var(--text)', lineHeight: 1.7, fontWeight: 500 }}>{cs.clinical_vignette}</p>
          </div>

          <InfoCard label="Patient History" data={cs.patient_history} />
          <InfoCard label="Examination Findings" data={cs.examination_findings} />
          <InfoCard label="Investigations" data={cs.investigations} />

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>
            {cs.questions.length} question{cs.questions.length !== 1 ? 's' : ''} follow
          </p>
        </div>

        {/* Start questions CTA */}
        <div className="cs-fixed-bar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '14px 20px 20px' }}>
          <button onClick={() => setPhase('questions')} className="cs-start-btn"
            style={{ width: '100%', maxWidth: 480, display: 'block', margin: '0 auto', padding: 16, borderRadius: 999, background: 'var(--teal)', color: 'var(--on-teal)', border: 'none', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 24px -8px var(--teal)' }}>
            Start questions →
          </button>
        </div>
        <style>{`.cs-start-btn { transition: transform .18s ease, filter .18s ease; } .cs-start-btn:hover { transform: translateY(-2px); filter: brightness(1.06); } @media (max-width: 979px) { .cs-fixed-bar { bottom: 68px !important; } } @media (min-width: 980px) { .cs-fixed-bar { left: 250px !important; } }`}</style>
      </div>
    )
  }

  // ── Questions screen ───────────────────────────────────────────────────────
  const progress = ((qIndex + (isReviewing ? 1 : 0)) / cs.questions.length) * 100

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <button onClick={() => setPhase('vignette')}
          style={{ width: 42, height: 42, borderRadius: 13, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
        </button>
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-soft)' }}>Q{qIndex + 1} / {cs.questions.length}</span>
        <div style={{ width: 42 }} />
      </div>

      {/* Progress bar */}
      <div style={{ padding: '12px 20px 0', maxWidth: 680, margin: '0 auto', width: '100%' }}>
        <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden' }}>
          <div className="progress-bar" style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,var(--teal),var(--teal-deep))', width: `${progress}%` }} />
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px 20px 120px', maxWidth: 680, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>

        {/* Question card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', padding: 22 }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Question {currentQ.question_number}</p>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.6 }}>{currentQ.question}</p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {currentQ.options.map((option, i) => {
            const letter = OPTION_LETTERS[i]
            const isSelected = selected === letter
            const isAnswer = letter === currentQ.correct_answer
            const isChosen = answered[qIndex] === letter

            let borderColor = 'var(--border)'
            let bgColor = 'var(--surface)'
            let chipBg = 'var(--surface-3)'
            let chipFg = 'var(--text-soft)'
            let textColor = 'var(--text)'
            let opacity = 1

            if (isReviewing) {
              if (isAnswer) { borderColor = 'var(--teal)'; bgColor = 'var(--teal-tint)'; chipBg = 'var(--teal)'; chipFg = '#fff'; textColor = 'var(--teal-deep)' }
              else if (isChosen) { borderColor = 'var(--red)'; bgColor = 'var(--red-tint)'; chipBg = 'var(--red)'; chipFg = '#fff'; textColor = 'var(--red)' }
              else { opacity = 0.5 }
            } else if (isSelected) {
              borderColor = 'var(--teal)'; bgColor = 'var(--teal-tint)'; chipBg = 'var(--teal)'; chipFg = 'var(--on-teal)'; textColor = 'var(--teal-deep)'
            }

            return (
              <button key={letter} onClick={() => !isReviewing && setSelected(letter)} disabled={isReviewing}
                style={{
                  display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px',
                  borderRadius: 16, border: `2px solid ${borderColor}`, background: bgColor,
                  cursor: isReviewing ? 'default' : 'pointer', textAlign: 'left', width: '100%',
                  transition: 'all .15s ease', opacity, fontFamily: 'inherit',
                }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: chipBg, color: chipFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                  {isReviewing && isAnswer ? '✓' : isReviewing && isChosen ? '✗' : letter}
                </span>
                <span style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.45, color: textColor }}>
                  {option.replace(/^[A-D]\.\s*/, '')}
                </span>
              </button>
            )
          })}
        </div>

        {/* Explanation bubble after answer */}
        {isReviewing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Verdict pill */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 999,
              fontSize: 13.5, fontWeight: 800, width: 'fit-content',
              background: isCorrect ? 'var(--green-tint)' : 'var(--red-tint)',
              color: isCorrect ? 'var(--green)' : 'var(--red)',
            }}>
              {isCorrect ? `✓ Correct! +10 XP` : `✗ Incorrect · +0 XP`}
            </div>

            {/* Avatar + bubble */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
              <img src="/avatar.png" alt="Tutor" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', boxShadow: 'var(--shadow)', marginTop: 2 }} />
              <div style={{
                flex: 1, padding: 16, borderRadius: 18, borderTopLeftRadius: 5,
                background: isCorrect ? 'var(--surface)' : 'var(--red-tint)',
                border: `1px solid ${isCorrect ? 'var(--border)' : 'var(--red)'}`,
                boxShadow: 'var(--shadow)',
              }}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--text)' }}>{currentQ.explanation}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom button */}
      <div className="cs-fixed-bar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '14px 20px 20px' }}>
        {!isReviewing ? (
          <button onClick={handleAnswer} disabled={!selected}
            style={{
              width: '100%', maxWidth: 480, display: 'block', margin: '0 auto', padding: 16, borderRadius: 999, border: 'none',
              background: selected ? 'var(--teal)' : 'var(--surface-3)',
              color: selected ? 'var(--on-teal)' : 'var(--text-faint)',
              fontSize: 16, fontWeight: 800, cursor: selected ? 'pointer' : 'default',
              fontFamily: 'inherit', transition: 'all .15s ease',
              boxShadow: selected ? '0 10px 24px -8px var(--teal)' : 'none',
            }}>
            Submit answer
          </button>
        ) : (
          <button onClick={handleNext} className="cs-next-btn"
            style={{
              width: '100%', maxWidth: 480, display: 'block', margin: '0 auto', padding: 16, borderRadius: 999, border: 'none',
              background: 'var(--teal)', color: 'var(--on-teal)',
              fontSize: 16, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'inherit', boxShadow: '0 10px 24px -8px var(--teal)',
            }}>
            {qIndex + 1 >= cs.questions.length ? 'Finish case →' : 'Next question →'}
          </button>
        )}
      </div>
      <style>{`.cs-next-btn { transition: transform .18s ease, filter .18s ease; } .cs-next-btn:hover { transform: translateY(-2px); filter: brightness(1.06); } @media (max-width: 979px) { .cs-fixed-bar { bottom: 68px !important; } } @media (min-width: 980px) { .cs-fixed-bar { left: 250px !important; } }`}</style>
    </div>
  )
}
