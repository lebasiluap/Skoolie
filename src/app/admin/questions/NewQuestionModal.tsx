'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createQuestion } from './actions'
import type { NewQuestion } from './types'

const PROFESSIONS = ['medicine', 'nursing', 'pharmacy', 'dentistry', 'midwifery']
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

const input: React.CSSProperties = {
  width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)',
  borderRadius: 11, padding: '9px 12px', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}
const label: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }

export default function NewQuestionModal({ topics, courses }: { topics: string[]; courses: string[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [type, setType] = useState<'mcq' | 'flashcard'>('mcq')
  const [professions, setProfessions] = useState<string[]>([])
  const [course, setCourse] = useState('')
  const [topic, setTopic] = useState('')
  const [subtopic, setSubtopic] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [region, setRegion] = useState<'universal' | 'ghana'>('universal')
  const [highYield, setHighYield] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [explanation, setExplanation] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctLetter, setCorrectLetter] = useState('A')
  const [backText, setBackText] = useState('')

  function reset() {
    setType('mcq'); setProfessions([]); setCourse(''); setTopic(''); setSubtopic('')
    setDifficulty('medium'); setRegion('universal'); setHighYield(false)
    setQuestionText(''); setExplanation(''); setOptions(['', '', '', '']); setCorrectLetter('A'); setBackText('')
    setErr(null); setSaving(false)
  }

  function toggleProf(p: string) {
    setProfessions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  // Removing a row shifts every option below it up one letter, so the
  // "correct" mark must move with its option (or reset if it was deleted).
  function removeOption(i: number) {
    setOptions(prev => prev.filter((_, j) => j !== i))
    const correctIdx = LETTERS.indexOf(correctLetter)
    if (correctIdx === i) setCorrectLetter('A')
    else if (correctIdx > i) setCorrectLetter(LETTERS[correctIdx - 1])
  }

  async function submit() {
    setSaving(true); setErr(null)
    const payload: NewQuestion = {
      question_type: type, professions, course, topic, subtopic, difficulty, region,
      high_yield: highYield, question_text: questionText, explanation,
      options: type === 'mcq' ? options : undefined,
      correct_answer: type === 'mcq' ? correctLetter : backText,
    }
    const res = await createQuestion(payload)
    if (!res.ok) { setErr(res.error); setSaving(false); return }
    setOpen(false); reset()
    startTransition(() => router.refresh())
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'var(--teal)', color: 'var(--on-teal)', border: 'none', borderRadius: 12, fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        New question
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4vh 16px', overflowY: 'auto' }}
          onClick={() => !saving && (setOpen(false), reset())}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, boxShadow: 'var(--shadow-lg)', padding: 24, width: '100%', maxWidth: 620 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>New question</h3>
              <button onClick={() => { setOpen(false); reset() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 20, lineHeight: 1, fontFamily: 'inherit' }}>×</button>
            </div>

            {/* Type toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['mcq', 'flashcard'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid ' + (type === t ? 'var(--teal)' : 'var(--border)'), background: type === t ? 'var(--teal-tint)' : 'var(--surface-2)', color: type === t ? 'var(--teal)' : 'var(--text-soft)', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {t === 'mcq' ? 'MCQ' : 'Flashcard'}
                </button>
              ))}
            </div>

            {/* Professions */}
            <div style={{ marginBottom: 14 }}>
              <span style={label}>Professions</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PROFESSIONS.map(p => (
                  <button key={p} onClick={() => toggleProf(p)}
                    style={{ padding: '6px 14px', borderRadius: 999, border: '1px solid ' + (professions.includes(p) ? 'var(--teal)' : 'var(--border)'), background: professions.includes(p) ? 'var(--teal-tint)' : 'var(--surface-2)', color: professions.includes(p) ? 'var(--teal)' : 'var(--text-soft)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Taxonomy */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 14 }}>
              <div>
                <span style={label}>Course</span>
                <input list="courses-dl" value={course} onChange={e => setCourse(e.target.value)} style={input} placeholder="e.g. Pharmacology" />
                <datalist id="courses-dl">{courses.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <span style={label}>Topic</span>
                <input list="topics-dl" value={topic} onChange={e => setTopic(e.target.value)} style={input} placeholder="e.g. Cardiovascular System" />
                <datalist id="topics-dl">{topics.map(t => <option key={t} value={t} />)}</datalist>
              </div>
              <div>
                <span style={label}>Subtopic</span>
                <input value={subtopic} onChange={e => setSubtopic(e.target.value)} style={input} placeholder="e.g. Heart Failure" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 16 }}>
              <div>
                <span style={label}>Difficulty</span>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value as typeof difficulty)} style={{ ...input, cursor: 'pointer' }}>
                  <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <span style={label}>Region</span>
                <select value={region} onChange={e => setRegion(e.target.value as typeof region)} style={{ ...input, cursor: 'pointer' }}>
                  <option value="universal">Universal</option><option value="ghana">Ghana</option>
                </select>
              </div>
              <div>
                <span style={label}>High-yield</span>
                <button onClick={() => setHighYield(h => !h)} style={{ ...input, cursor: 'pointer', textAlign: 'left', color: highYield ? 'var(--teal)' : 'var(--text-faint)', fontWeight: 800 }}>
                  {highYield ? '★ Yes' : '☆ No'}
                </button>
              </div>
            </div>

            {/* Question text / front */}
            <div style={{ marginBottom: 14 }}>
              <span style={label}>{type === 'flashcard' ? 'Front (prompt)' : 'Question text'}</span>
              <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows={3} style={{ ...input, resize: 'vertical' }} />
            </div>

            {/* MCQ options or flashcard back */}
            {type === 'mcq' ? (
              <div style={{ marginBottom: 14 }}>
                <span style={label}>Options (tick the correct one)</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {options.map((o, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={() => setCorrectLetter(LETTERS[i])}
                        title="Mark correct"
                        style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, border: '1px solid ' + (correctLetter === LETTERS[i] ? 'var(--green)' : 'var(--border)'), background: correctLetter === LETTERS[i] ? 'var(--green-tint)' : 'var(--surface-2)', color: correctLetter === LETTERS[i] ? 'var(--green)' : 'var(--text-faint)', fontWeight: 900, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {LETTERS[i]}
                      </button>
                      <input value={o} onChange={e => setOptions(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                        style={input} placeholder={`Option ${LETTERS[i]}`} />
                      {options.length > 2 && (
                        <button onClick={() => removeOption(i)} aria-label={`Remove option ${LETTERS[i]}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 18, fontFamily: 'inherit' }}>×</button>
                      )}
                    </div>
                  ))}
                </div>
                {options.length < 6 && (
                  <button onClick={() => setOptions(prev => [...prev, ''])} style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--teal)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add option</button>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <span style={label}>Back (answer)</span>
                <textarea value={backText} onChange={e => setBackText(e.target.value)} rows={3} style={{ ...input, resize: 'vertical' }} />
              </div>
            )}

            {/* Explanation */}
            <div style={{ marginBottom: 18 }}>
              <span style={label}>Explanation</span>
              <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={3} style={{ ...input, resize: 'vertical' }} />
            </div>

            {err && (
              <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--red)', background: 'var(--red-tint)', borderRadius: 11, padding: '10px 13px' }}>{err}</p>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setOpen(false); reset() }} style={{ padding: '10px 18px', border: 'none', background: 'transparent', color: 'var(--text-soft)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={submit} disabled={saving} style={{ padding: '10px 26px', border: 'none', borderRadius: 12, background: 'var(--teal)', color: 'var(--on-teal)', fontSize: 13.5, fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Creating…' : 'Create question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
