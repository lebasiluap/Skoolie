'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { normalizeMcqOptions, resolveKeyLetter, Chip, PAGE_PAD, PageHeader, EmptyState, primaryBtn, linkBtn } from '../ui'

interface AuditRow {
  question_id: string
  topic: string
  subtopic: string | null
  difficulty: string
  question_text: string
  options: unknown
  correct_answer: string
  explanation: string
  strong_users: number
  strong_attempts: number
  strong_correct: number
  strong_wrong_rate: number
  top_wrong_answer: string | null
  top_wrong_share: number | null
  global_attempts: number | null
  global_correct_pct: number | null
  open_reports: number
}

interface Props {
  rows: AuditRow[]
  error: string | null
  params: { minAcc: number; minAnswers: number; minAttempts: number; wrongRate: number }
}

export default function AuditClient({ rows, error, params }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [form, setForm] = useState(params)

  function apply() {
    const qs = new URLSearchParams({
      acc: String(form.minAcc), ans: String(form.minAnswers),
      att: String(form.minAttempts), rate: String(form.wrongRate),
    })
    router.push(`/admin/audit?${qs.toString()}`)
  }

  function toggle(id: string) {
    setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  return (
    <div style={{ padding: PAGE_PAD, maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        title="Miskey audit"
        sub={<span style={{ display: 'inline-block', lineHeight: 1.5, maxWidth: 640 }}>
          MCQs your strongest students keep getting “wrong.” When high-accuracy users converge on the same non-keyed option, the answer key is the likely culprit. Signal sharpens as more testers answer.
        </span>}
      />

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', margin: '18px 0 24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px' }}>
        <Field label="Strong user accuracy ≥" value={form.minAcc} step={0.05} min={0} max={1}
          onChange={v => setForm(f => ({ ...f, minAcc: v }))} suffix="" pct />
        <Field label="Min lifetime answers" value={form.minAnswers} step={5} min={1} max={500}
          onChange={v => setForm(f => ({ ...f, minAnswers: v }))} />
        <Field label="Min attempts/question" value={form.minAttempts} step={1} min={1} max={50}
          onChange={v => setForm(f => ({ ...f, minAttempts: v }))} />
        <Field label="Strong wrong-rate ≥" value={form.wrongRate} step={0.05} min={0} max={1}
          onChange={v => setForm(f => ({ ...f, wrongRate: v }))} pct />
        <button onClick={apply} style={{ ...primaryBtn, padding: '10px 22px' }}>
          Run audit
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--red-tint)', color: 'var(--red)', borderRadius: 14, padding: '14px 18px', fontSize: 13.5, fontWeight: 700, marginBottom: 18 }}>
          {error}
        </div>
      )}

      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-faint)', fontWeight: 700 }}>
        {rows.length} suspect{rows.length === 1 ? '' : 's'} flagged
      </p>

      {rows.length === 0 && !error ? (
        <EmptyState
          title="No suspects at these thresholds"
          sub="Loosen the thresholds (lower min answers/attempts) to surface earlier signal, or wait for more usage."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map(r => {
            const opts = normalizeMcqOptions(r.options)
            const isOpen = expanded.has(r.question_id)
            const keyLetter = resolveKeyLetter(opts, r.correct_answer)
            return (
              <div key={r.question_id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 900, padding: '4px 11px', borderRadius: 999, background: 'var(--red-tint)', color: 'var(--red)' }}>
                    {Math.round(r.strong_wrong_rate * 100)}% strong-wrong
                  </span>
                  <Chip text={r.topic} />
                  {r.subtopic && <Chip text={r.subtopic} tone="muted" />}
                  <Chip text={r.difficulty} tone="muted" />
                  {r.open_reports > 0 && (
                    <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 11px', borderRadius: 999, background: 'var(--amber-tint)', color: 'var(--amber)' }}>
                      ⚑ {r.open_reports} report{r.open_reports === 1 ? '' : 's'}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-faint)', fontWeight: 700 }}>
                    {r.strong_correct}/{r.strong_attempts} correct · {r.strong_users} user{r.strong_users === 1 ? '' : 's'}
                  </span>
                </div>

                <div style={{ padding: '14px 18px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 14.5, color: 'var(--text)', fontWeight: 700, lineHeight: 1.5 }}>
                    {r.question_text}
                  </p>
                  {opts.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      {opts.map(o => {
                        const isKey = o.letter === keyLetter
                        const isTopWrong = r.top_wrong_answer && o.letter === r.top_wrong_answer.trim().charAt(0).toUpperCase()
                        return (
                          <div key={o.letter} style={{
                            display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5, lineHeight: 1.45,
                            padding: '7px 11px', borderRadius: 10,
                            background: isKey ? 'var(--green-tint)' : isTopWrong ? 'var(--amber-tint)' : 'var(--surface-2)',
                            color: isKey ? 'var(--green)' : isTopWrong ? 'var(--amber)' : 'var(--text-soft)',
                            fontWeight: isKey || isTopWrong ? 800 : 600,
                            border: '1px solid ' + (isKey ? 'var(--green)' : isTopWrong ? 'var(--amber)' : 'transparent'),
                          }}>
                            <span style={{ fontWeight: 800 }}>{o.letter}.</span>
                            <span style={{ flex: 1 }}>{o.text}</span>
                            {isKey && <span style={{ fontSize: 11, fontWeight: 900 }}>✓ KEY</span>}
                            {isTopWrong && !isKey && <span style={{ fontSize: 11, fontWeight: 900 }}>
                              ← STRONG USERS PICK{r.top_wrong_share != null ? ` (${Math.round(r.top_wrong_share * 100)}%)` : ''}
                            </span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {r.top_wrong_answer == null && (
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, fontStyle: 'italic' }}>
                      Picked-option data starts accumulating now — the specific wrong choice will show once users answer post-update.
                    </p>
                  )}
                  {isOpen && (
                    <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.55, background: 'var(--surface-2)', borderRadius: 12, padding: '10px 14px' }}>
                      <strong style={{ color: 'var(--text-faint)', fontSize: 11, letterSpacing: '.06em' }}>EXPLANATION</strong><br />
                      {r.explanation}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    {r.explanation && (
                      <button onClick={() => toggle(r.question_id)} style={linkBtn}>
                        {isOpen ? 'Hide explanation' : 'Show explanation'}
                      </button>
                    )}
                    <Link href={`/admin/questions?id=${r.question_id}`} style={{ color: 'var(--text-soft)', fontSize: 12.5, fontWeight: 800, textDecoration: 'none' }}>
                      Edit question →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, step, min, max, onChange, pct }: {
  label: string; value: number; step: number; min: number; max: number; onChange: (v: number) => void; suffix?: string; pct?: boolean
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
      <input type="number" value={value} step={step} min={min} max={max}
        onChange={e => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) onChange(v) }}
        style={{ width: pct ? 90 : 130, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, padding: '8px 11px', fontSize: 13.5, fontFamily: 'inherit', outline: 'none' }}
      />
    </label>
  )
}

