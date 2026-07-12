'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { setReportStatus, reopenReport, resolveAllForItem } from './actions'
import { normalizeMcqOptions, resolveKeyLetter, timeAgo, Chip, PAGE_PAD, PageHeader, EmptyState, actionBtn as sharedActionBtn, linkBtn as sharedLinkBtn } from '../ui'

interface EmbeddedQuestion {
  id: string; topic: string; subtopic: string | null; difficulty: string
  question_type: string; question_text: string
  options: unknown; correct_answer: string; explanation: string
}
interface EmbeddedCase {
  id: string; title: string; topic: string; difficulty: string; clinical_vignette: string
}
interface Report {
  id: string
  user_id: string | null
  question_id: string | null
  case_id: string | null
  question_type: 'mcq' | 'flashcard' | 'case_study'
  reason: string
  note: string | null
  status: 'open' | 'resolved' | 'dismissed'
  resolution_note: string | null
  created_at: string
  resolved_at: string | null
  questions: EmbeddedQuestion | null
  case_studies: EmbeddedCase | null
}

interface Props {
  reports: Report[]
  reporters: Record<string, { name: string; email: string }>
}

const REASON_LABEL: Record<string, string> = {
  wrong_answer: 'Wrong answer',
  typo: 'Typo / error',
  unclear: 'Unclear',
  outdated: 'Outdated',
  other: 'Other',
}
const REASON_STYLE: Record<string, { bg: string; color: string }> = {
  wrong_answer: { bg: 'var(--red-tint)', color: 'var(--red)' },
  typo: { bg: 'var(--amber-tint)', color: 'var(--amber)' },
  unclear: { bg: 'var(--amber-tint)', color: 'var(--amber)' },
  outdated: { bg: 'var(--teal-tint)', color: 'var(--teal)' },
  other: { bg: 'var(--surface-3)', color: 'var(--text-soft)' },
}

export default function ReportsClient({ reports, reporters }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [tab, setTab] = useState<'open' | 'resolved' | 'dismissed' | 'all'>('open')
  const [busy, setBusy] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const counts = useMemo(() => ({
    open: reports.filter(r => r.status === 'open').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    dismissed: reports.filter(r => r.status === 'dismissed').length,
    all: reports.length,
  }), [reports])

  const visible = useMemo(
    () => (tab === 'all' ? reports : reports.filter(r => r.status === tab)),
    [reports, tab],
  )

  // Open-report counts per item, to surface "N users flagged this"
  const openByItem = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of reports) {
      if (r.status !== 'open') continue
      const key = r.question_id ?? r.case_id ?? ''
      m[key] = (m[key] ?? 0) + 1
    }
    return m
  }, [reports])

  async function act(fn: () => Promise<void>, id: string) {
    setBusy(id)
    await fn()
    setBusy(null)
    startTransition(() => router.refresh())
  }

  function toggle(id: string) {
    setExpanded(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const TABS: { key: typeof tab; label: string; n: number }[] = [
    { key: 'open', label: 'Open', n: counts.open },
    { key: 'resolved', label: 'Resolved', n: counts.resolved },
    { key: 'dismissed', label: 'Dismissed', n: counts.dismissed },
    { key: 'all', label: 'All', n: counts.all },
  ]

  return (
    <div style={{ padding: PAGE_PAD, maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader title="Reported questions" sub={`User-flagged content · ${counts.open} open`} />

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '8px 15px', borderRadius: 999,
                border: '1px solid ' + (active ? 'var(--teal)' : 'var(--border)'),
                background: active ? 'var(--teal-tint)' : 'var(--surface)',
                color: active ? 'var(--teal)' : 'var(--text-soft)',
                fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              {t.label}
              <span style={{ fontSize: 11.5, fontWeight: 800, padding: '1px 7px', borderRadius: 999,
                background: active ? 'var(--teal)' : 'var(--surface-3)', color: active ? 'var(--on-teal)' : 'var(--text-faint)' }}>
                {t.n}
              </span>
            </button>
          )
        })}
      </div>

      {/* Empty state */}
      {visible.length === 0 ? (
        <EmptyState
          title={tab === 'open' ? 'No open reports 🎉' : 'Nothing here'}
          sub={tab === 'open' ? 'The question bank is clean for now.' : 'Switch tabs to see other reports.'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {visible.map(r => {
            const q = r.questions
            const c = r.case_studies
            const rp = r.user_id ? reporters[r.user_id] : undefined
            const rs = REASON_STYLE[r.reason] ?? REASON_STYLE.other
            const isOpen = expanded.has(r.id)
            const itemKey = r.question_id ?? r.case_id ?? ''
            const dupes = openByItem[itemKey] ?? 0
            const opts = q ? normalizeMcqOptions(q.options) : []
            const keyLetter = q ? resolveKeyLetter(opts, q.correct_answer) : null

            return (
              <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
                {/* Card header */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: rs.bg, color: rs.color }}>
                    {REASON_LABEL[r.reason] ?? r.reason}
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: 'var(--surface-3)', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    {r.question_type.replace('_', ' ')}
                  </span>
                  {dupes > 1 && r.status === 'open' && (
                    <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: 'var(--red-tint)', color: 'var(--red)' }}>
                      ⚑ {dupes} open flags
                    </span>
                  )}
                  {r.status !== 'open' && (
                    <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 10px', borderRadius: 999,
                      background: r.status === 'resolved' ? 'var(--green-tint)' : 'var(--surface-3)',
                      color: r.status === 'resolved' ? 'var(--green)' : 'var(--text-faint)' }}>
                      {r.status}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>
                    {timeAgo(r.created_at)}
                  </span>
                </div>

                {/* Body */}
                <div style={{ padding: '14px 18px' }}>
                  {/* Reporter + note */}
                  <p style={{ margin: '0 0 4px', fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 600 }}>
                    Reported by {rp?.name ?? 'Unknown'} {rp?.email ? `· ${rp.email}` : ''}
                  </p>
                  {r.note && (
                    <p style={{ margin: '0 0 12px', fontSize: 13.5, color: 'var(--text)', fontWeight: 600, background: 'var(--surface-3)', borderRadius: 12, padding: '10px 14px', lineHeight: 1.5 }}>
                      “{r.note}”
                    </p>
                  )}

                  {/* The reported content */}
                  {q ? (
                    <>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <TagChip text={q.topic} />
                        {q.subtopic && <TagChip text={q.subtopic} muted />}
                        <TagChip text={q.difficulty} muted />
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: 14.5, color: 'var(--text)', fontWeight: 700, lineHeight: 1.5 }}>
                        {q.question_text}
                      </p>
                      {q.question_type === 'mcq' && opts.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                          {opts.map(o => {
                            const correct = o.letter === keyLetter
                            return (
                              <div key={o.letter} style={{
                                display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.45,
                                padding: '7px 11px', borderRadius: 10,
                                background: correct ? 'var(--green-tint)' : 'var(--surface-2)',
                                color: correct ? 'var(--green)' : 'var(--text-soft)',
                                fontWeight: correct ? 800 : 600,
                                border: '1px solid ' + (correct ? 'var(--green)' : 'transparent'),
                              }}>
                                <span style={{ fontWeight: 800 }}>{o.letter}.</span>
                                <span>{o.text}</span>
                                {correct && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800 }}>✓ KEY</span>}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {q.question_type !== 'mcq' && (
                        <p style={{ margin: '0 0 10px', fontSize: 13.5, color: 'var(--green)', fontWeight: 700 }}>
                          Answer: {q.correct_answer}
                        </p>
                      )}
                      {isOpen && q.explanation && (
                        <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.55, background: 'var(--surface-2)', borderRadius: 12, padding: '10px 14px' }}>
                          <strong style={{ color: 'var(--text-faint)', fontSize: 11, letterSpacing: '.06em' }}>EXPLANATION</strong><br />
                          {q.explanation}
                        </p>
                      )}
                      {q.explanation && (
                        <button onClick={() => toggle(r.id)} style={linkBtn}>
                          {isOpen ? 'Hide explanation' : 'Show explanation'}
                        </button>
                      )}
                    </>
                  ) : c ? (
                    <>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <TagChip text={c.topic} />
                        <TagChip text={c.difficulty} muted />
                      </div>
                      <p style={{ margin: '0 0 6px', fontSize: 14.5, color: 'var(--text)', fontWeight: 800 }}>{c.title}</p>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: isOpen ? 99 : 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {c.clinical_vignette}
                      </p>
                      <button onClick={() => toggle(r.id)} style={linkBtn}>{isOpen ? 'Show less' : 'Show full vignette'}</button>
                    </>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-faint)', fontWeight: 600, fontStyle: 'italic' }}>
                      The reported item was deleted.
                    </p>
                  )}

                  {r.resolution_note && (
                    <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 600 }}>
                      Note: {r.resolution_note}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                  {q && (
                    <Link href={`/admin/questions?id=${q.id}`} style={{ ...actionBtn, background: 'var(--surface)', color: 'var(--text-soft)', textDecoration: 'none' }}>
                      Edit question →
                    </Link>
                  )}
                  {r.status === 'open' ? (
                    <>
                      <button disabled={busy === r.id} onClick={() => act(() => setReportStatus(r.id, 'resolved'), r.id)}
                        style={{ ...actionBtn, background: 'var(--teal)', color: 'var(--on-teal)' }}>
                        {busy === r.id ? '…' : 'Mark resolved'}
                      </button>
                      <button disabled={busy === r.id} onClick={() => act(() => setReportStatus(r.id, 'dismissed'), r.id)}
                        style={{ ...actionBtn, background: 'var(--surface)', color: 'var(--text-faint)' }}>
                        Dismiss
                      </button>
                      {dupes > 1 && (
                        <button disabled={busy === r.id} onClick={() => act(() => resolveAllForItem(r.question_id, r.case_id), r.id)}
                          style={{ ...actionBtn, background: 'var(--green-tint)', color: 'var(--green)' }}>
                          Resolve all {dupes}
                        </button>
                      )}
                    </>
                  ) : (
                    <button disabled={busy === r.id} onClick={() => act(() => reopenReport(r.id), r.id)}
                      style={{ ...actionBtn, background: 'var(--surface)', color: 'var(--text-soft)' }}>
                      Re-open
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TagChip({ text, muted }: { text: string; muted?: boolean }) {
  return <Chip text={text} tone={muted ? 'muted' : 'teal'} />
}

const actionBtn: React.CSSProperties = sharedActionBtn
const linkBtn: React.CSSProperties = sharedLinkBtn
